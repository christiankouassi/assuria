const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabase');
const { getAIResponse } = require('../services/gemini');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

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
    try {
        const body = req.body;

        if (body.object) {
            if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
                const message = body.entry[0].changes[0].value.messages[0];
                const from = message.from;
                const msgBody = message.text ? message.text.body : "";

                if (!msgBody) return res.sendStatus(200);

                console.log(`Message from ${from}: ${msgBody}`);

                // 1. Get or Create Conversation
                let { data: conv, error: convError } = await supabase
                    .from('conversations')
                    .select('id')
                    .eq('user_phone', from)
                    .single();

                if (convError || !conv) {
                    const { data: newConv, error: createError } = await supabase
                        .from('conversations')
                        .insert([{ user_phone: from }])
                        .select()
                        .single();
                    conv = newConv;
                }

                // 2. Save User Message
                await supabase.from('messages').insert([
                    { conversation_id: conv.id, sender: 'user', content: msgBody }
                ]);

                // 3. Get Chat History for Context
                const { data: history } = await supabase
                    .from('messages')
                    .select('sender, content')
                    .eq('conversation_id', conv.id)
                    .order('created_at', { ascending: true })
                    .limit(10);

                // 4. Get AI Response and Intent
                const aiResult = await getAIResponse(msgBody, history);

                // 5. Save Bot Message
                await supabase.from('messages').insert([
                    { conversation_id: conv.id, sender: 'bot', content: aiResult.response }
                ]);

                // 6. Handle Intent-specific tables
                if (aiResult.intent === 'claim') {
                    await supabase.from('claims').insert([
                        { conversation_id: conv.id, user_phone: from, details: aiResult.data }
                    ]);
                } else if (aiResult.intent === 'quote') {
                    await supabase.from('quotes').insert([
                        { 
                            conversation_id: conv.id, 
                            user_phone: from, 
                            insurance_type: aiResult.data.type || 'unknown',
                            details: aiResult.data 
                        }
                    ]);
                }

                // 7. Send message back to WhatsApp
                await axios({
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

                // 8. Update last interaction
                await supabase.from('conversations').update({ last_interaction: new Date() }).eq('id', conv.id);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error("Error processing message:", error.response ? error.response.data : error.message);
        res.sendStatus(500);
    }
});

module.exports = router;
