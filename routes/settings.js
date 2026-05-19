const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { clearPromptCache, getSystemPrompt } = require('../services/ai');

// Helper to get tenant_id from headers
const getTenantId = (req) => {
    return req.headers['x-tenant-id'] || 'f70a0bcb-2487-42f1-bd63-cda1acd9ce91';
};

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { data, error } = await supabase
            .from('settings')
            .select('key, value')
            .eq('tenant_id', tenantId);
            
        if (error) throw error;
        
        const settings = {};
        data.forEach(item => {
            settings[item.key] = item.value;
        });
        res.json(settings);
    } catch (err) {
        console.error('Erreur GET settings:', err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération des paramètres.' });
    }
});

// PUT /api/settings
router.put('/', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const settings = req.body;
        const upserts = Object.keys(settings).map(key => ({
            tenant_id: tenantId,
            key,
            value: settings[key]
        }));
        
        const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'tenant_id,key' });
        if (error) throw error;
        
        clearPromptCache(tenantId);
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur PUT settings:', err.message);
        res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres.' });
    }
});

// GET /api/settings/prompt
router.get('/prompt', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const prompt = await getSystemPrompt(tenantId);
        res.json({ prompt });
    } catch (err) {
        console.error('Erreur GET prompt:', err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération du prompt.' });
    }
});

// PUT /api/settings/prompt
router.put('/prompt', async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Le champ prompt est requis.' });
        }

        const { error } = await supabase
            .from('settings')
            .upsert({ tenant_id: tenantId, key: 'system_prompt', value: prompt }, { onConflict: 'tenant_id,key' });

        if (error) throw error;

        clearPromptCache(tenantId);

        res.json({ success: true });
    } catch (err) {
        console.error('Erreur PUT prompt:', err.message);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du prompt.' });
    }
});

module.exports = router;
