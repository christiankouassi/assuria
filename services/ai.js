const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

let cachedSystemPrompt = null;
let lastFetch = 0;

const DEFAULT_SYSTEM_PROMPT = `Tu es AssurIA, l assistant intelligent d un cabinet d assurance au Maroc.
Tu parles français, arabe et darija. Adapte-toi à la langue du client.
RÈGLES : Ne dis JAMAIS Bonjour après le premier message. Pose UNE SEULE question à la fois. Sois concis comme WhatsApp.
Pour les sinistres : collecte type → date → lieu → description → photos
Pour les devis : collecte type assurance → détails bien → usage → valeur
Réponds UNIQUEMENT en JSON strict sans markdown :
{"intent": "general|claim|quote", "response": "message au client", "data": {}}`;

async function getSystemPrompt() {
  if (cachedSystemPrompt && Date.now() - lastFetch < 5 * 60 * 1000) {
    return cachedSystemPrompt;
  }
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', 'system_prompt').single();
    cachedSystemPrompt = data?.value || DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.error('Erreur getSystemPrompt Supabase:', err.message);
    cachedSystemPrompt = DEFAULT_SYSTEM_PROMPT;
  }
  lastFetch = Date.now();
  return cachedSystemPrompt;
}

function clearPromptCache() {
  cachedSystemPrompt = null;
  lastFetch = 0;
}

async function getAIResponse(userMessage, history = [], clientProfile = {}, clientContext = '') {
    console.log('Appel Claude API...');
    try {
        let filteredHistory = [...history];
        if (filteredHistory.length > 0 && 
            filteredHistory[filteredHistory.length - 1].content === userMessage && 
            filteredHistory[filteredHistory.length - 1].sender === 'user') {
            filteredHistory.pop();
        }
        const messages = [
            ...filteredHistory.map(h => ({
                role: h.sender === 'ai' ? 'assistant' : 'user',
                content: h.sender === 'advisor' 
                    ? `[Conseiller humain]: ${h.content}` 
                    : h.content
            })),
            { role: 'user', content: userMessage }
        ];

        // Remplacement dynamique du prompt systeme
        const systemPromptBase = await getSystemPrompt();
        let promptWithContext = systemPromptBase;

        if (clientProfile && Object.keys(clientProfile).length > 0) {
            if (promptWithContext.includes('{{CLIENT_PROFILE}}')) {
                promptWithContext = promptWithContext.replace('{{CLIENT_PROFILE}}', JSON.stringify(clientProfile, null, 2));
            } else {
                promptWithContext += `\n\nProfil client : ${JSON.stringify(clientProfile, null, 2)}`;
            }
        }

        if (clientContext) {
            promptWithContext += `\n\n${clientContext}`;
        }

        const response = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: promptWithContext,
            messages: messages
        });
        const text = response.content[0].text;
        console.log('Réponse Claude:', text);
        try {
            const clean = text.replace(/```json|```/g, '').trim();
            return JSON.parse(clean);
        } catch {
            // Si Claude ne répond pas en JSON, on construit le JSON manuellement
            return {
                intent: 'general',
                response: text.trim(),
                data: {}
            };
        }
    } catch (error) {
        console.error('Erreur Claude:', error.message);
        return {
            intent: 'general',
            response: 'Désolé, je rencontre un problème technique. Un conseiller va vous recontacter bientôt.',
            data: {}
        };
    }
}

async function getAIResponseWithImage(imageBase64, mimeType, context = '') {
    console.log('Appel Claude API avec image...');
    try {
        const response = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image',
                        source: { type: 'base64', media_type: mimeType, data: imageBase64 }
                    },
                    {
                        type: 'text',
                        text: `Analyse cette image dans le contexte de l'assurance au Maroc. ${context} Si c'est une carte grise, extrais : marque, modèle, année, immatriculation. Si c'est une CNI, extrais : nom, prénom, date de naissance. Si c'est des dommages sur un véhicule ou bien, décris précisément ce que tu vois. Réponds en JSON strict : {"description": "...", "extracted_data": {"type": "carte_grise|cni|dommages|autre", "fields": {}}}`
                    }
                ]
            }]
        });
        const text = response.content[0].text;
        console.log('Réponse Claude Vision:', text);
        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch (error) {
        console.error('Erreur Claude Vision:', error.message);
        return { description: 'Image reçue mais analyse impossible.', extracted_data: {} };
    }
}

module.exports = { getAIResponse, getAIResponseWithImage, getSystemPrompt, clearPromptCache };
