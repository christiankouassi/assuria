const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabase');
const { getAIResponse, getAIResponseWithImage } = require('../services/ai');
const Anthropic = require('@anthropic-ai/sdk');
const FormData = require('form-data');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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

// Incoming messages (POST) - Immediate reply to WhatsApp
router.post('/', (req, res) => {
    console.log('=== NOUVEAU MESSAGE WHATSAPP (RECU) ===');
    res.status(200).send('OK');

    processMessage(req.body).catch(err => {
        console.error('=== ERREUR TRAITEMENT ASYNCHRONE ===');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
    });
});

async function downloadMedia(mediaId) {
    console.log(`[Media] Téléchargement du média ID: ${mediaId}...`);
    // Étape 1 : obtenir l'URL
    const response = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
    });
    const url = response.data.url;
    console.log(`[Media] URL obtenue: ${url}`);
    
    // Étape 2 : télécharger le fichier
    const fileResponse = await axios.get(url, {
        headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` },
        responseType: 'arraybuffer'
    });
    
    return { buffer: Buffer.from(fileResponse.data), url };
}

async function sendWhatsAppMessage(to, text) {
    console.log(`[WhatsApp] Envoi du message à ${to}...`);
    try {
        const waResponse = await axios({
            method: 'POST',
            url: `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
            data: {
                messaging_product: 'whatsapp',
                to: to,
                type: 'text',
                text: { body: text }
            },
            headers: { 'Authorization': `Bearer ${WHATSAPP_TOKEN}` }
        });
        console.log(`[WhatsApp] Statut réponse: ${waResponse.status} ${waResponse.statusText}`);
    } catch (waErr) {
        console.error('[WhatsApp] Erreur envoi:', waErr.response ? JSON.stringify(waErr.response.data) : waErr.message);
    }
}

async function processMessage(body) {
    if (!body.object) return;
    if (!(body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0])) return;

    const message = body.entry[0].changes[0].value.messages[0];
    const from = message.from;
    const type = message.type; // text, image, audio, document
    
    console.log(`[1/8] Traitement asynchrone pour ${from} (type: ${type})`);

    // 1. Get or Create Conversation
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
        
        if (createError) throw createError;
        conv = newConv;
    }

    let msgBody = "";
    let mediaInfo = null;
    let mimeType = null;
    let filename = null;
    let caption = null;

    if (type === 'text') {
        msgBody = message.text ? message.text.body : "";
        if (!msgBody) return;
    } else if (type === 'image') {
        mediaInfo = message.image;
        mimeType = mediaInfo.mime_type;
        caption = mediaInfo.caption || "";
    } else if (type === 'audio') {
        mediaInfo = message.audio;
        mimeType = mediaInfo.mime_type;
    } else if (type === 'document') {
        mediaInfo = message.document;
        mimeType = mediaInfo.mime_type;
        filename = mediaInfo.filename;
    }

    if (type !== 'text' && mediaInfo) {
        // Traitement de média
        const { buffer, url } = await downloadMedia(mediaInfo.id);

        if (type === 'image') {
            console.log(`[Media] Analyse de l'image par Claude...`);
            const base64Data = buffer.toString('base64');
            const analysis = await getAIResponseWithImage(base64Data, mimeType);
            const desc = analysis.description || 'Photo reçue et analysée.';
            const extractedType = analysis.extracted_data?.type || 'autre';
            console.log(`[Media] Analyse Claude Vision: Type=${extractedType}, Desc=${desc.substring(0, 50)}...`);

            // Construction du contexte d'image détaillé
            const imageContext = `[ANALYSE IMAGE - ${extractedType}]
Informations extraites de l'image :
${JSON.stringify(analysis.extracted_data?.fields || {}, null, 2)}
Description : ${desc}

INSTRUCTION : Affiche TOUTES ces informations extraites au client sous forme de liste claire, puis demande confirmation. Ne pose pas de question sans d'abord montrer les données.`;

            // Sauvegarde le message utilisateur (l'image) avec le contexte structuré pour ne pas perdre l'historique
            const { error: msgErr } = await supabase.from('messages').insert([{
                conversation_id: conv.id,
                sender: 'user',
                content: imageContext,
                media_url: mediaInfo.id,
                media_type: mimeType,
                media_description: desc
            }]);
            if (msgErr) console.error('Erreur sauvegarde message image:', msgErr);

            // Met à jour le sinistre en attente si existant
            const { data: pendingClaim } = await supabase
                .from('claims')
                .select('id, media_urls')
                .eq('conversation_id', conv.id)
                .eq('status', 'pending')
                .maybeSingle();

            if (pendingClaim) {
                const currentUrls = pendingClaim.media_urls || [];
                const updatedUrls = [...currentUrls, { url, type: mimeType, description: desc }];
                await supabase
                    .from('claims')
                    .update({ media_urls: updatedUrls })
                    .eq('id', pendingClaim.id);
            }

            // Récupère l'historique pour le contexte de l'assistant (qui contient maintenant le message utilisateur avec imageContext)
            const { data: history } = await supabase
                .from('messages')
                .select('sender, content')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true })
                .limit(50);

            const aiResult = await getAIResponse(imageContext, history || [], conv.client_profile);

            // Mise à jour du profil client si nécessaire
            if (aiResult.extracted_profile && Object.keys(aiResult.extracted_profile).length > 0) {
                const updatedProfile = { ...(conv.client_profile || {}), ...aiResult.extracted_profile };
                await supabase.from('conversations').update({ client_profile: updatedProfile }).eq('id', conv.id);
                conv.client_profile = updatedProfile;
            }

            // Sauvegarde de la réponse de l'assistant
            await supabase.from('messages').insert([{
                conversation_id: conv.id,
                sender: 'ai',
                content: aiResult.response
            }]);

            // Gère l'intention
            await handleIntent(conv.id, imageContext, aiResult);

            // Répondre au client
            await sendWhatsAppMessage(from, aiResult.response);

        } else if (type === 'audio') {
            console.log(`[Media] Envoi du vocal à Whisper...`);
            const form = new FormData();
            form.append('file', buffer, { filename: 'audio.ogg', contentType: 'audio/ogg' });
            form.append('model', 'whisper-1');
            form.append('language', 'fr');

            const whisperResponse = await axios.post('https://api.openai.com/v1/audio/transcriptions', form, {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    ...form.getHeaders()
                }
            });
            const transcription = whisperResponse.data.text;
            console.log(`[Media] Transcription: "${transcription}"`);

            // Sauvegarde le message utilisateur (le vocal)
            const { error: msgErr } = await supabase.from('messages').insert([{
                conversation_id: conv.id,
                sender: 'user',
                content: transcription,
                media_url: mediaInfo.id,
                media_type: mimeType,
                media_description: transcription
            }]);
            if (msgErr) console.error('Erreur sauvegarde message vocal:', msgErr);

            // Traite la transcription comme du texte normal
            const { data: history } = await supabase
                .from('messages')
                .select('sender, content')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true })
                .limit(50);

            const aiResult = await getAIResponse(transcription, history || [], conv.client_profile);

            // Mise à jour du profil client si nécessaire
            if (aiResult.extracted_profile && Object.keys(aiResult.extracted_profile).length > 0) {
                const updatedProfile = { ...(conv.client_profile || {}), ...aiResult.extracted_profile };
                await supabase.from('conversations').update({ client_profile: updatedProfile }).eq('id', conv.id);
                conv.client_profile = updatedProfile;
            }

            // Sauvegarde la réponse AI
            await supabase.from('messages').insert([{
                conversation_id: conv.id,
                sender: 'ai',
                content: aiResult.response
            }]);

            // Gère l'intention
            await handleIntent(conv.id, transcription, aiResult);

            // Répondre à l'utilisateur
            const replyText = `🎙️ J'ai bien entendu votre message : "${transcription.substring(0, 80)}..."\n\n${aiResult.response}`;
            await sendWhatsAppMessage(from, replyText);

        } else if (type === 'document') {
            console.log('Type message reçu:', message.type);
            console.log('Document info:', JSON.stringify(message.document));

            const mimeType = message.document?.mime_type;
            const fileName = message.document?.filename;
            const mediaId = message.document?.id;
            
            const isPDF = mimeType?.includes('pdf') || fileName?.endsWith('.pdf');
            const isWord = mimeType?.includes('word') || mimeType?.includes('officedocument') || fileName?.endsWith('.docx') || fileName?.endsWith('.doc');

            let textContent = "";
            console.log(`[Media] Traitement du document: ${fileName} (${mimeType})`);

            if (isPDF) {
                const pdfData = await pdfParse(buffer);
                textContent = pdfData.text;
            } else if (isWord) {
                const docxResult = await mammoth.extractRawText({ buffer: buffer });
                textContent = docxResult.value;
            }

            if (textContent) {
                console.log(`[Media] Analyse du document par Claude...`);
                const response = await anthropicClient.messages.create({
                    model: 'claude-haiku-4-5',
                    max_tokens: 1024,
                    messages: [{
                        role: 'user',
                        content: `Analyse et résume le contenu utile de ce document dans le contexte de l'assurance au Maroc :\n\n${textContent}`
                    }]
                });
                const summary = response.content[0].text;

                // Sauvegarde le message utilisateur (le document)
                await supabase.from('messages').insert([{
                    conversation_id: conv.id,
                    sender: 'user',
                    content: `Document reçu: ${fileName}`,
                    media_url: mediaId,
                    media_type: mimeType,
                    media_description: summary
                }]);

                // Répondre au client
                await sendWhatsAppMessage(from, `📄 Document reçu et analysé :\n\n${summary}`);

                // Sauvegarde de la réponse AI
                await supabase.from('messages').insert([{
                    conversation_id: conv.id,
                    sender: 'ai',
                    content: `Document analysé : ${summary}`
                }]);
            } else {
                console.log(`[Media] Format de document non pris en charge`);
                await sendWhatsAppMessage(from, `❌ Désolé, le format de ce document n'est pas pris en charge.`);
            }
        }
    } else {
        // 2. Save User Message
        const { error: msgError } = await supabase.from('messages').insert([
            { conversation_id: conv.id, sender: 'user', content: msgBody }
        ]);
        if (msgError) console.error('Erreur sauvegarde message utilisateur:', msgError);

        // 3. Get Chat History for Context
        const { data: history } = await supabase
            .from('messages')
            .select('sender, content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true })
            .limit(50);

        // 4. Get AI Response and Intent
        const aiResult = await getAIResponse(msgBody, history || [], conv.client_profile);

        // Mise à jour du profil client si nécessaire
        if (aiResult.extracted_profile && Object.keys(aiResult.extracted_profile).length > 0) {
            const updatedProfile = { ...(conv.client_profile || {}), ...aiResult.extracted_profile };
            await supabase.from('conversations').update({ client_profile: updatedProfile }).eq('id', conv.id);
            conv.client_profile = updatedProfile;
        }

        // 5. Save Bot Message
        const { error: aiMsgError } = await supabase.from('messages').insert([
            { conversation_id: conv.id, sender: 'ai', content: aiResult.response }
        ]);
        if (aiMsgError) console.error('Erreur sauvegarde message AI:', aiMsgError);

        // 6. Intent-specific handling
        await handleIntent(conv.id, msgBody, aiResult);

        // 7. Send message back to WhatsApp
        await sendWhatsAppMessage(from, aiResult.response);
    }

    // 8. Update last interaction
    await supabase.from('conversations')
        .update({ last_message_at: new Date() })
        .eq('id', conv.id);
    
    console.log('=== TRAITEMENT TERMINE AVEC SUCCES ===');
}

async function handleIntent(convId, msgBody, aiResult) {
    if (!aiResult.intent || aiResult.intent === 'general') return;

    // Récupérer le user_phone
    const { data: conv } = await supabase.from('conversations').select('user_identifier').eq('id', convId).single();
    const userPhone = conv?.user_identifier || 'unknown';

    // Déterminer le statut
    let status = 'pending';
    if (aiResult.action === 'complete') status = 'submitted';
    else if (aiResult.action === 'cancel') status = 'cancelled';

    if (aiResult.intent === 'claim') {
        console.log(`[Intent] Recherche d'un sinistre en attente...`);
        const { data: existingClaims } = await supabase
            .from('claims')
            .select('id, details')
            .eq('conversation_id', convId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        const existingClaim = existingClaims && existingClaims.length > 0 ? existingClaims[0] : null;

        if (existingClaim) {
            const mergedDetails = { ...existingClaim.details, ...aiResult.data };
            if (!mergedDetails.description && msgBody) mergedDetails.description = msgBody;
            
            await supabase.from('claims').update({
                details: mergedDetails,
                status: status
            }).eq('id', existingClaim.id);
        } else if (status === 'pending') {
            const details = aiResult.data || {};
            if (!details.description && msgBody) details.description = msgBody;

            const newClaim = { 
                conversation_id: convId, 
                user_phone: userPhone,
                details: details,
                status: 'pending'
            };
            await supabase.from('claims').insert([newClaim]);
        }
    } else if (aiResult.intent === 'quote') {
        console.log(`[Intent] Recherche d'un devis en attente...`);
        const { data: existingQuotes } = await supabase
            .from('quotes')
            .select('id, details')
            .eq('conversation_id', convId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1);

        const existingQuote = existingQuotes && existingQuotes.length > 0 ? existingQuotes[0] : null;

        if (existingQuote) {
            const mergedDetails = { ...existingQuote.details, ...aiResult.data };
            const updatedQuote = {
                insurance_type: aiResult.data.insurance_type || aiResult.data.type || 'auto',
                details: mergedDetails,
                status: status
            };
            await supabase.from('quotes').update(updatedQuote).eq('id', existingQuote.id);
        } else if (status === 'pending') {
            const newQuote = { 
                conversation_id: convId, 
                user_phone: userPhone,
                insurance_type: aiResult.data.insurance_type || aiResult.data.type || 'auto',
                details: aiResult.data || {},
                status: 'pending'
            };
            await supabase.from('quotes').insert([newQuote]);
        }
    }
}

module.exports = router;
