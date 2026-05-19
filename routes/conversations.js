const express = require('express');
const router = express.Router();
const axios = require('axios');
const supabase = require('../services/supabase');

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// POST /api/conversations/:id/message
router.post('/:id/message', async (req, res) => {
    const conversationId = req.params.id;
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: 'Le contenu du message est requis' });
    }

    try {
        // 1. Récupérer le numéro du client depuis la conversation avec son tenant
        const { data: conv, error: convError } = await supabase
            .from('conversations')
            .select('user_identifier, platform, tenant_id, tenants(whatsapp_token, whatsapp_phone_number_id)')
            .eq('id', conversationId)
            .single();

        if (convError || !conv) {
            console.error('Erreur récupération conversation:', convError);
            return res.status(404).json({ error: 'Conversation non trouvée' });
        }

        const to = conv.user_identifier;
        const activeToken = conv.tenants?.whatsapp_token || WHATSAPP_TOKEN;
        const activePhoneId = conv.tenants?.whatsapp_phone_number_id || PHONE_NUMBER_ID;

        // 2. Envoyer via l'API WhatsApp Business si c'est une conv whatsapp
        if (conv.platform === 'whatsapp') {
            console.log(`[Conseiller] Envoi WhatsApp à ${to} via PhoneID: ${activePhoneId}...`);
            try {
                const waResponse = await axios({
                    method: 'POST',
                    url: `https://graph.facebook.com/v19.0/${activePhoneId}/messages`,
                    data: {
                        messaging_product: 'whatsapp',
                        to: to,
                        type: 'text',
                        text: { body: content }
                    },
                    headers: { 'Authorization': `Bearer ${activeToken}` }
                });
                console.log(`[Conseiller] WhatsApp a répondu: ${waResponse.status} ${waResponse.statusText}`);
            } catch (waErr) {
                console.error('[Conseiller] Erreur lors de l\'envoi WhatsApp:', waErr.response ? JSON.stringify(waErr.response.data) : waErr.message);
                return res.status(500).json({ error: 'Erreur lors de l\'envoi via WhatsApp', details: waErr.message });
            }
        } else {
            console.log(`[Conseiller] Envoi pour la plateforme ${conv.platform}...`);
            // Handle other platforms if necessary (e.g. web widget uses polling or websocket)
        }

        // 3. Sauvegarder le message dans Supabase
        const { data: newMessage, error: msgError } = await supabase
            .from('messages')
            .insert([
                { 
                    conversation_id: conversationId, 
                    sender: 'advisor', 
                    content: content,
                    tenant_id: conv.tenant_id
                }
            ])
            .select()
            .single();

        if (msgError) {
            console.error('Erreur sauvegarde message conseiller:', msgError);
            return res.status(500).json({ error: 'Erreur lors de la sauvegarde du message' });
        }

        // 4. Update last interaction
        await supabase.from('conversations')
            .update({ last_message_at: new Date() })
            .eq('id', conversationId);

        res.status(200).json(newMessage);

    } catch (error) {
        console.error('Erreur inattendue dans /api/conversations/:id/message:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Helper to get tenant_id from headers
const getTenantId = (req) => {
    return req.headers['x-tenant-id'] || 'f70a0bcb-2487-42f1-bd63-cda1acd9ce91';
};

// PUT /api/conversations/quotes/:id/status
router.put('/quotes/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = getTenantId(req);

    try {
        const { data, error } = await supabase
            .from('quotes')
            .update({ status })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select();

        if (error) {
            console.error('Erreur Supabase update quote:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, data });
    } catch (err) {
        console.error('Erreur update quote:', err);
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/conversations/claims/:id/status
router.put('/claims/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const tenantId = getTenantId(req);

    try {
        const { data, error } = await supabase
            .from('claims')
            .update({ status })
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .select();

        if (error) {
            console.error('Erreur Supabase update claim:', error);
            return res.status(500).json({ error: error.message });
        }
        res.json({ success: true, data });
    } catch (err) {
        console.error('Erreur update claim:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
