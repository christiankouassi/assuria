const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { clearPromptCache, getSystemPrompt } = require('../services/ai');

// GET /api/settings
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase.from('settings').select('key, value');
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
        const settings = req.body;
        const upserts = Object.keys(settings).map(key => ({
            key,
            value: settings[key]
        }));
        
        const { error } = await supabase.from('settings').upsert(upserts, { onConflict: 'key' });
        if (error) throw error;
        
        clearPromptCache();
        res.json({ success: true });
    } catch (err) {
        console.error('Erreur PUT settings:', err.message);
        res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres.' });
    }
});

// GET /api/settings/prompt
router.get('/prompt', async (req, res) => {
    try {
        const prompt = await getSystemPrompt();
        res.json({ prompt });
    } catch (err) {
        console.error('Erreur GET prompt:', err.message);
        res.status(500).json({ error: 'Erreur lors de la récupération du prompt.' });
    }
});

// PUT /api/settings/prompt
router.put('/prompt', async (req, res) => {
    try {
        const { prompt } = req.body;
        if (!prompt) {
            return res.status(400).json({ error: 'Le champ prompt est requis.' });
        }

        const { error } = await supabase
            .from('settings')
            .upsert({ key: 'system_prompt', value: prompt }, { onConflict: 'key' });

        if (error) throw error;

        clearPromptCache();

        res.json({ success: true });
    } catch (err) {
        console.error('Erreur PUT prompt:', err.message);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du prompt.' });
    }
});

module.exports = router;
