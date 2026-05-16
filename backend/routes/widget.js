const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { getAIResponse } = require('../services/gemini');

// Send message from widget
router.post('/message', async (req, res) => {
    try {
        const { sessionId, message, phone } = req.body; // sessionId could be a browser fingerprint or unique ID

        if (!message) return res.status(400).json({ error: "Message is required" });

        // 1. Get or Create Conversation (using sessionId as user_phone for now or a specific field)
        // For the widget, we'll prefix phone with 'WIDGET_' if not provided
        const identifier = phone || `WIDGET_${sessionId}`;

        let { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_phone', identifier)
            .single();

        if (convError || !conv) {
            const { data: newConv, error: createError } = await supabase
                .from('conversations')
                .insert([{ user_phone: identifier }])
                .select()
                .single();
            conv = newConv;
        }

        // 2. Save User Message
        await supabase.from('messages').insert([
            { conversation_id: conv.id, sender: 'user', content: message }
        ]);

        // 3. Get History
        const { data: history } = await supabase
            .from('messages')
            .select('sender, content')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true })
            .limit(10);

        // 4. AI Response
        const aiResult = await getAIResponse(message, history);

        // 5. Save Bot Message
        await supabase.from('messages').insert([
            { conversation_id: conv.id, sender: 'bot', content: aiResult.response }
        ]);

        // 6. Intent-specific (Claims/Quotes)
        if (aiResult.intent === 'claim') {
            await supabase.from('claims').insert([{ conversation_id: conv.id, user_phone: identifier, details: aiResult.data }]);
        } else if (aiResult.intent === 'quote') {
            await supabase.from('quotes').insert([{ conversation_id: conv.id, user_phone: identifier, insurance_type: aiResult.data.type || 'unknown', details: aiResult.data }]);
        }

        res.json({ response: aiResult.response });
    } catch (error) {
        console.error("Widget Error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get message history for widget
router.get('/history/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const identifier = `WIDGET_${sessionId}`;

        const { data: conv } = await supabase
            .from('conversations')
            .select('id')
            .eq('user_phone', identifier)
            .single();

        if (!conv) return res.json([]);

        const { data: messages } = await supabase
            .from('messages')
            .select('sender, content, created_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
