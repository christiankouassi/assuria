const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
Tu es l'assistant intelligent d'Assuria, un cabinet d'assurance leader au Maroc. 
Ton objectif est d'aider les clients avec professionnalisme, empathie et clarté.
Tu parles couramment le français, l'arabe classique et la Darija marocaine. Adapte-toi à la langue du client.

Expertise :
1. Assurance Automobile (Auto)
2. Assurance Habitation (Home)
3. Assurance Santé (Health)
4. Assurance Vie

Tes missions :
- Répondre aux questions générales sur les produits Assuria.
- Guider l'utilisateur pour une déclaration de sinistre (collecter : type de sinistre, date, lieu, description).
- Aider pour une demande de devis (collecter : type d'assurance, détails pertinents).

IMPORTANT : Tu dois répondre au format JSON strict suivant :
{
  "intent": "general" | "claim" | "quote",
  "response": "Le message que tu envoies au client",
  "data": { ... les informations extraites si c'est un claim ou un quote ... }
}

Si c'est un message général, data peut être vide.
Si l'utilisateur commence une déclaration de sinistre, l'intent est "claim".
Si l'utilisateur demande un prix ou un devis, l'intent est "quote".
`;

async function getAIResponse(userMessage, history = []) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history: history.map(h => ({
                role: h.role === 'bot' ? 'model' : 'user',
                parts: [{ text: h.content }],
            })),
            generationConfig: {
                responseMimeType: "application/json",
            },
        });

        const result = await chat.sendMessage(SYSTEM_PROMPT + "\n\nMessage client : " + userMessage);
        const response = await result.response;
        return JSON.parse(response.text());
    } catch (error) {
        console.error("Error with Gemini:", error);
        return {
            intent: "general",
            response: "Désolé, je rencontre un petit problème technique. Un conseiller va vous recontacter bientôt.",
            data: {}
        };
    }
}

module.exports = { getAIResponse };
