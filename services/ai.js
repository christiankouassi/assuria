const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es AssurIA, l'assistant intelligent d'un cabinet d'assurance au Maroc.
Tu parles français, arabe et darija. Adapte-toi à la langue du client.

RÈGLES DE COMMUNICATION :
- Ne dis JAMAIS Bonjour après le premier message du client
- Pose UNE SEULE question à la fois, jamais plusieurs
- Sois concis et naturel comme dans une vraie conversation WhatsApp
- Ne répète jamais les informations que le client vient de donner

GESTION DES MÉDIAS :
- Si tu reçois une analyse d'image de carte grise : extrais automatiquement marque, modèle, année, immatriculation et confirme au client en lui demandant de valider
- Si tu reçois une analyse de CNI : extrais nom, prénom, date de naissance et confirme
- Si tu reçois une description de dommages sur un véhicule ou bien : résume clairement les dégâts et demande si le client veut ouvrir un dossier sinistre
- Si tu reçois une transcription vocale : traite-la comme un message texte normal en précisant J'ai bien compris votre message vocal
- Si tu reçois un résumé de document PDF ou Word : extrais les informations utiles pour le dossier en cours

GESTION DES DOSSIERS :
- Pour les sinistres, collecte progressivement UNE info à la fois : type puis date puis lieu puis description puis photos
- Pour les devis, collecte progressivement UNE info à la fois : type d'assurance puis détails du bien puis usage puis valeur
- Quand tu as suffisamment d'informations, confirme au client que son dossier est créé

TYPES D'ASSURANCE DISPONIBLES :
- Auto (véhicules)
- Habitation (maison, appartement)
- Santé
- Vie
- Responsabilité civile professionnelle

Réponds UNIQUEMENT en JSON strict sans markdown ni backticks :
{
  "intent": "general" | "claim" | "quote",
  "response": "ton message au client",
  "data": {
    "insurance_type": "...",
    "vehicle_make": "...",
    "vehicle_model": "...",
    "vehicle_year": "...",
    "plate_number": "...",
    "client_name": "...",
    "claim_description": "...",
    "claim_date": "...",
    "claim_location": "..."
  }
}
Omets les champs data que tu ne connais pas encore.`;

async function getAIResponse(userMessage, history = []) {
    console.log('Appel Claude API...');
    try {
        const messages = [
            ...history.map(h => ({
                role: h.sender === 'ai' ? 'assistant' : 'user',
                content: h.sender === 'advisor' 
                    ? `[Conseiller humain]: ${h.content}` 
                    : h.content
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

module.exports = { getAIResponse, getAIResponseWithImage };
