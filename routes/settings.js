const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { clearPromptCache, getSystemPrompt } = require('../services/ai');

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

        // Réinitialise le cache en mémoire
        clearPromptCache();

        res.json({ success: true });
    } catch (err) {
        console.error('Erreur PUT prompt:', err.message);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du prompt.' });
    }
});

module.exports = router;
