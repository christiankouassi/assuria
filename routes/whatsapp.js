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

async function sendWhatsAppMessage(to, aiResult, token, phoneNumberId) {
  const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Vérifier si les boutons sont activés et si Claude a retourné des boutons
  let setting = null;
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'interactive_buttons_enabled')
      .single();
    setting = data;
  } catch (err) {
    console.error('[WhatsApp] Erreur lecture setting interactive_buttons_enabled:', err.message);
  }

  const buttonsEnabled = setting?.value === 'true';
  const hasButtons = aiResult && typeof aiResult === 'object' && 
                     aiResult.buttons && 
                     aiResult.buttons.length > 0 && 
                     aiResult.buttons.length <= 3;

  let messageData;

  if (buttonsEnabled && hasButtons) {
    // Message avec boutons interactifs
    messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: aiResult.response },
        action: {
          buttons: aiResult.buttons.map(btn => ({
            type: 'reply',
            reply: {
              id: btn.id.substring(0, 256),
              title: btn.title.substring(0, 20)
            }
          }))
        }
      }
    };
  } else {
    // Message texte simple
    messageData = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: aiResult && typeof aiResult === 'object' ? aiResult.response : aiResult }
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(messageData)
  });
  return response;
}

async function processMessage(body) {
    if (!body.object) return;
    if (!(body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0])) return;

    const message = body.entry[0].changes[0].value.messages[0];
    const from = message.from;
    const type = message.type; // text, image, audio, document
    
    console.log(`[1/8] Traitement asynchrone pour ${from} (type: ${type})`);

    const contactName = body.entry?.[0]?.changes?.[0]?.value?.contacts?.[0]?.profile?.name || null;

    // 1. Get or Create Conversation
    let { data: conv, error: convError } = await supabase
        .from('conversations')
        .select('id, client_profile, contact_name')
        .eq('user_identifier', from)
        .single();

    if (convError || !conv) {
        console.log(`[2/8] Conversation non trouvée, création d'une nouvelle...`);
        const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert([{ 
                user_identifier: from,
                platform: 'whatsapp',
                client_profile: {},
                contact_name: contactName
            }])
            .select()
            .single();
        
        if (createError) throw createError;
        conv = newConv;
    } else if (contactName && conv.contact_name !== contactName) {
        console.log(`[2/8] Mise à jour du nom de contact WhatsApp: ${contactName}`);
        const { data: updatedConv, error: updateError } = await supabase
            .from('conversations')
            .update({ contact_name: contactName })
            .eq('id', conv.id)
            .select()
            .single();
        if (!updateError && updatedConv) {
            conv = updatedConv;
        }
    }

    const isAiEnabled = conv.client_profile?.ai_mode !== false;
    if (!isAiEnabled) {
        console.log(`[WhatsApp] Mode Conseiller (Humain) actif pour ${from}. L'IA n'enverra pas de réponse automatique.`);
    }

    let clientContext = '';
    if (isAiEnabled) {
        const { data: activeQuotes } = await supabase
            .from('quotes')
            .select('id, status, details, insurance_type')
            .eq('conversation_id', conv.id)
            .in('status', ['pending', 'in_progress']);

        const { data: activeClaims } = await supabase
            .from('claims')
            .select('id, status, details, description')
            .eq('conversation_id', conv.id)
            .in('status', ['pending', 'in_progress', 'processing']);

        const { data: historicalQuotes } = await supabase
            .from('quotes')
            .select('id, status, details, insurance_type, created_at')
            .eq('conversation_id', conv.id)
            .not('status', 'in', '("pending","in_progress")');

        const { data: historicalClaims } = await supabase
            .from('claims')
            .select('id, status, details, description, created_at')
            .eq('conversation_id', conv.id)
            .not('status', 'in', '("pending","in_progress","processing")');

        clientContext = `
CONTEXTE CLIENT :
- Nom : ${conv.contact_name || 'Inconnu'}
- Profil connu : ${JSON.stringify(conv.client_profile || {})}
- Devis actifs : ${JSON.stringify(activeQuotes || [])}
- Sinistres actifs : ${JSON.stringify(activeClaims || [])}
- Historique Devis passés : ${JSON.stringify(historicalQuotes || [])}
- Historique Sinistres passés : ${JSON.stringify(historicalClaims || [])}
Ne redemande jamais une information déjà connue et fais référence aux dossiers passés si pertinent.`;
    }

    let msgBody = "";
    let mediaInfo = null;
    let mimeType = null;
    let filename = null;
    let caption = null;

    if (type === 'text' || type === 'interactive') {
        if (type === 'interactive') {
            const buttonReply = message.interactive?.button_reply;
            if (buttonReply) {
                msgBody = buttonReply.title;
            }
        } else {
            msgBody = message.text ? message.text.body : "";
        }
        if (!msgBody) return;
    } else if (type === 'video') {
        msgBody = '[Le client a envoyé une vidéo. Réponds-lui que tu ne peux pas encore traiter les vidéos mais que tu peux analyser des photos ou des documents PDF.]';
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

    if (type !== 'text' && type !== 'interactive' && mediaInfo) {
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

            if (isAiEnabled) {
                // Récupère l'historique pour le contexte de l'assistant (qui contient maintenant le message utilisateur avec imageContext)
                const { data: history } = await supabase
                    .from('messages')
                    .select('sender, content')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: true })
                    .limit(50);

                const aiResult = await getAIResponse(imageContext, history || [], conv.client_profile, clientContext);

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
                await sendWhatsAppMessage(from, aiResult, WHATSAPP_TOKEN, PHONE_NUMBER_ID);
            } else {
                console.log(`[Media] Mode Conseiller actif. Image enregistrée sans réponse de l'IA.`);
            }

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

            if (isAiEnabled) {
                // Traite la transcription comme du texte normal
                const { data: history } = await supabase
                    .from('messages')
                    .select('sender, content')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: true })
                    .limit(50);

                const aiResult = await getAIResponse(transcription, history || [], conv.client_profile, clientContext);

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
                const richAudioResult = { ...aiResult, response: replyText };
                await sendWhatsAppMessage(from, richAudioResult, WHATSAPP_TOKEN, PHONE_NUMBER_ID);
            } else {
                console.log(`[Media] Mode Conseiller actif. Vocal enregistré sans réponse de l'IA.`);
            }

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

                if (isAiEnabled) {
                    // Répondre au client
                    await sendWhatsAppMessage(from, `📄 Document reçu et analysé :\n\n${summary}`, WHATSAPP_TOKEN, PHONE_NUMBER_ID);

                    // Sauvegarde de la réponse AI
                    await supabase.from('messages').insert([{
                        conversation_id: conv.id,
                        sender: 'ai',
                        content: `Document analysé : ${summary}`
                    }]);
                } else {
                    console.log(`[Media] Mode Conseiller actif. Document enregistré sans réponse de l'IA.`);
                }
            } else {
                console.log(`[Media] Format de document non pris en charge`);
                if (isAiEnabled) {
                    await sendWhatsAppMessage(from, `❌ Désolé, le format de ce document n'est pas pris en charge.`, WHATSAPP_TOKEN, PHONE_NUMBER_ID);
                }
            }
        }
    } else {
        // 2. Save User Message
        const { error: msgError } = await supabase.from('messages').insert([
            { conversation_id: conv.id, sender: 'user', content: msgBody }
        ]);
        if (msgError) console.error('Erreur sauvegarde message utilisateur:', msgError);

        if (isAiEnabled) {
            // 3. Get Chat History for Context
            const { data: history } = await supabase
                .from('messages')
                .select('sender, content')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: true })
                .limit(50);

            // 4. Get AI Response and Intent
            const aiResult = await getAIResponse(msgBody, history || [], conv.client_profile, clientContext);

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
            await sendWhatsAppMessage(from, aiResult, WHATSAPP_TOKEN, PHONE_NUMBER_ID);
        } else {
            console.log(`[Text] Mode Conseiller actif. Message utilisateur enregistré sans réponse de l'IA.`);
        }
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
        console.log(`[Intent] Recherche d'un sinistre actif ('pending', 'in_progress', ou 'processing')...`);
        const { data: existingClaims } = await supabase
            .from('claims')
            .select('id, details')
            .eq('conversation_id', convId)
            .in('status', ['pending', 'in_progress', 'processing'])
            .order('created_at', { ascending: false })
            .limit(1);

        const existingClaim = existingClaims && existingClaims.length > 0 ? existingClaims[0] : null;

        if (existingClaim) {
            const mergedDetails = { ...(existingClaim.details || {}), ...(aiResult.data || {}) };
            if (!mergedDetails.description && msgBody) mergedDetails.description = msgBody;
            
            await supabase.from('claims').update({
                details: mergedDetails,
                status: status
            }).eq('id', existingClaim.id);
            console.log(`[Intent] Sinistre existant mis à jour pour éviter les doublons : ${existingClaim.id}`);
        } else {
            const details = aiResult.data || {};
            if (!details.description && msgBody) details.description = msgBody;

            const newClaim = { 
                conversation_id: convId, 
                user_phone: userPhone,
                details: details,
                status: status
            };
            await supabase.from('claims').insert([newClaim]);
            console.log(`[Intent] Nouveau sinistre créé avec statut: ${status}`);
        }
    } else if (aiResult.intent === 'quote') {
        console.log(`[Intent] Recherche d'un devis actif ('pending', 'in_progress', ou 'sent')...`);
        const { data: existingQuotes } = await supabase
            .from('quotes')
            .select('id, details')
            .eq('conversation_id', convId)
            .in('status', ['pending', 'in_progress', 'sent'])
            .order('created_at', { ascending: false })
            .limit(1);

        const existingQuote = existingQuotes && existingQuotes.length > 0 ? existingQuotes[0] : null;

        if (existingQuote) {
            const mergedDetails = { ...(existingQuote.details || {}), ...(aiResult.data || {}) };
            const updatedQuote = {
                insurance_type: aiResult.data.insurance_type || aiResult.data.type || 'auto',
                details: mergedDetails,
                status: status
            };
            await supabase.from('quotes').update(updatedQuote).eq('id', existingQuote.id);
            console.log(`[Intent] Devis existant mis à jour pour éviter les doublons : ${existingQuote.id}`);
        } else {
            const newQuote = { 
                conversation_id: convId, 
                user_phone: userPhone,
                insurance_type: aiResult.data.insurance_type || aiResult.data.type || 'auto',
                details: aiResult.data || {},
                status: status
            };
            await supabase.from('quotes').insert([newQuote]);
            console.log(`[Intent] Nouveau devis créé avec statut: ${status}`);
        }
    }
}

module.exports = router;
