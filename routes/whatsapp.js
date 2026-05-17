const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabase');
const { getAIResponse } = require('../services/gemini');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// Route de test
router.get('/test', (req, res) => {
  res.json({ status: 'webhook actif', timestamp: new Date() });
});

// Webhook verification (GET)
router.get('/', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Incoming messages (POST)
router.post('/', async (req, res) => {
    console.log('=== NOUVEAU MESSAGE WHATSAPP ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    try {
        const body = req.body;

        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from;
                const msgBody = message.text ? message.text.body : "";

                if (!msgBody) {
                    console.log('Message vide ou non textuel reçu. On ignore.');
                    return res.sendStatus(200);
                }

                console.log(`[1/8] Message de ${from}: "${msgBody}"`);

                // 1. Get or Create Conversation
                console.log(`[2/8] Recherche de la conversation pour ${from}...`);
                let { data: conv, error: convError } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('user_identifier', from)
                    .single();

                if (convError || !conv) {
                    console.log(`[2/8] Conversation non trouvée, création d'une nouvelle...`);
                    const { data: newConv, error: createError } = await supabase
                        .from('conversations')
                        .insert([{ 
                            user_identifier: from,
                            platform: 'whatsapp'
                        }])
                        .select()
                        .single();
                    
                    if (createError) {
                        console.error('Erreur lors de la création de la conversation:', createError);
                        throw createError;
                    }
                    conv = newConv;
                }
                console.log(`[2/8] ID Conversation: ${conv.id}`);

                // 2. Save User Message
                console.log(`[3/8] Sauvegarde du message utilisateur dans Supabase...`);
                const { error: msgError } = await supabase.from('messages').insert([
                    { conversation_id: conv.id, sender: 'user', content: msgBody }
                ]);
                if (msgError) console.error('Erreur sauvegarde message utilisateur:', msgError);

                // 3. Get Chat History for Context
                console.log(`[4/8] Récupération de l'historique...`);
                const { data: history } = await supabase
                    .from('messages')
                    .select('sender, content')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: true })
                    .limit(10);

                // 4. Get AI Response and Intent
                console.log(`[5/8] Appel à Gemini AI...`);
                const aiResult = await getAIResponse(msgBody, history || []);
                console.log(`[5/8] Réponse AI: "${aiResult.response.substring(0, 50)}..." | Intent: ${aiResult.intent}`);

                // 5. Save Bot Message
                console.log(`[6/8] Sauvegarde de la réponse AI...`);
                const { error: aiMsgError } = await supabase.from('messages').insert([
                    { conversation_id: conv.id, sender: 'ai', content: aiResult.response }
                ]);
                if (aiMsgError) console.error('Erreur sauvegarde message AI:', aiMsgError);

                // 6. Handle Intent-specific tables
                if (aiResult.intent === 'claim') {
                    console.log(`[Intent] Recherche d'un sinistre en attente...`);
                    const { data: existingClaim } = await supabase
                        .from('claims')
                        .select('id, description')
                        .eq('conversation_id', conv.id)
                        .eq('status', 'pending')
                        .maybeSingle();

                    if (existingClaim) {
                        console.log(`[Intent] Sinistre en attente existant trouvé (${existingClaim.id}), mise à jour...`);
                        const updatedClaim = {
                            description: aiResult.data.description || msgBody
                        };
                        if (aiResult.data.policy_number) updatedClaim.policy_number = aiResult.data.policy_number;
                        if (aiResult.data.client_name) updatedClaim.client_name = aiResult.data.client_name;

                        const { error: claimUpdateErr } = await supabase
                            .from('claims')
                            .update(updatedClaim)
                            .eq('id', existingClaim.id);
                        if (claimUpdateErr) console.error('Erreur lors de la mise à jour du sinistre:', claimUpdateErr);
                    } else {
                        console.log(`[Intent] Aucun sinistre en attente, création d'un nouveau...`);
                        const newClaim = { 
                            conversation_id: conv.id, 
                            description: aiResult.data.description || msgBody,
                            status: 'pending'
                        };
                        if (aiResult.data.policy_number) newClaim.policy_number = aiResult.data.policy_number;
                        if (aiResult.data.client_name) newClaim.client_name = aiResult.data.client_name;

                        const { error: claimInsertErr } = await supabase.from('claims').insert([newClaim]);
                        if (claimInsertErr) console.error('Erreur lors de la création du sinistre:', claimInsertErr);
                    }
                } else if (aiResult.intent === 'quote') {
                    console.log(`[Intent] Recherche d'un devis en attente...`);
                    const { data: existingQuote } = await supabase
                        .from('quotes')
                        .select('id, details')
                        .eq('conversation_id', conv.id)
                        .eq('status', 'pending')
                        .maybeSingle();

                    if (existingQuote) {
                        console.log(`[Intent] Devis en attente existant trouvé (${existingQuote.id}), mise à jour...`);
                        const mergedDetails = { ...existingQuote.details, ...aiResult.data };
                        const updatedQuote = {
                            insurance_type: aiResult.data.type || 'auto',
                            details: mergedDetails
                        };
                        if (aiResult.data.client_name) updatedQuote.client_name = aiResult.data.client_name;

                        const { error: quoteUpdateErr } = await supabase
                            .from('quotes')
                            .update(updatedQuote)
                            .eq('id', existingQuote.id);
                        if (quoteUpdateErr) console.error('Erreur lors de la mise à jour du devis:', quoteUpdateErr);
                    } else {
                        console.log(`[Intent] Aucun devis en attente, création d'un nouveau...`);
                        const newQuote = { 
                            conversation_id: conv.id, 
                            insurance_type: aiResult.data.type || 'auto',
                            details: aiResult.data,
                            status: 'pending'
                        };
                        if (aiResult.data.client_name) newQuote.client_name = aiResult.data.client_name;

                        const { error: quoteInsertErr } = await supabase.from('quotes').insert([newQuote]);
                        if (quoteInsertErr) console.error('Erreur lors de la création du devis:', quoteInsertErr);
                    }
                }

                // 7. Send message back to WhatsApp
                console.log(`[7/8] Envoi de la réponse à WhatsApp (Phone ID: ${PHONE_NUMBER_ID})...`);
                try {
                    const waResponse = await axios({
                        method: 'POST',
                        url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
                        data: {
                            messaging_product: 'whatsapp',
                            to: from,
                            type: 'text',
                            text: { body: aiResult.response }
                        },
                        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
                    });
                    console.log(`[7/8] WhatsApp a répondu: ${waResponse.status} ${waResponse.statusText}`);
                } catch (waErr) {
                    console.error('[7/8] Erreur lors de l\'envoi WhatsApp:', waErr.response ? JSON.stringify(waErr.response.data) : waErr.message);
                }

                // 8. Update last interaction
                console.log(`[8/8] Mise à jour de la date de dernière interaction...`);
                await supabase.from('conversations')
                    .update({ last_message_at: new Date() })
                    .eq('id', conv.id);
                
                console.log('=== TRAITEMENT TERMINE AVEC SUCCES ===');
            }
            res.sendStatus(200);
        } else {
            console.log('Objet non géré (pas une notification WhatsApp)');
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('=== ERREUR CRITIQUE ===');
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
        if (error.response) {
            console.error('Détails erreur API:', JSON.stringify(error.response.data, null, 2));
        }
        res.sendStatus(500);
    }
});

module.exports = router;
