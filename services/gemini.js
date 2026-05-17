const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es AssurIA, l'assistant intelligent d'un cabinet d'assurance au Maroc.
Tu parles français, arabe et darija. Adapte-toi à la langue du client.
Tu gères : déclarations de sinistres, demandes de devis, questions générales sur l'assurance.
Pour les sinistres, collecte : type, date, lieu, description.
Pour les devis, collecte : type d'assurance, bien à assurer, valeur estimée.
Ton ton est professionnel et chaleureux.
Réponds UNIQUEMENT en JSON strict :
{
  "intent": "general" | "claim" | "quote",
  "response": "ton message au client",
  "data": {}
}`;

async function getAIResponse(userMessage, history = []) {
    console.log('Appel Claude API...');
    try {
        const messages = [
            ...history.map(h => ({
                role: h.sender === 'ai' ? 'assistant' : 'user',
                content: h.content
            })),
            { role: 'user', content: userMessage }
        ];
        const response = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: messages
        });
        const text = response.content[0].text;
        console.log('Réponse Claude:', text);
        const clean = text.replace(/```json|```/g, '').trim();
        return JSON.parse(clean);
    } catch (error) {
        console.error('Erreur Claude:', error.message);
        return { intent: 'general', response: 'Désolé, je rencontre un problème technique. Un conseiller va vous recontacter bientôt.', data: {} };
    }
}

module.exports = { getAIResponse };
