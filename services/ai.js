const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

const TECHNICAL_PROMPT = `
INSTRUCTIONS TECHNIQUES OBLIGATOIRES - NE PAS MODIFIER :
Tu es un agent IA pour cabinet d'assurance au Maroc.
Tu parles français, arabe et darija selon la langue du client.

FORMAT DE RÉPONSE OBLIGATOIRE :
Tu dois TOUJOURS répondre en JSON strict sans markdown :
{"intent": "general|claim|quote", "response": "message au client", "data": {}}

GESTION BASE DE DONNÉES :
- Tu as accès au profil complet du client injecté dans le contexte
- Ne redemande jamais une information déjà connue
- Si un devis est en cours, refuse d'en créer un nouveau et explique-le au client
- Si un sinistre est en cours, refuse d'en créer un nouveau et explique-le au client

RÈGLES MÉTIER :
- Pose UNE SEULE question à la fois
- Ne dis jamais Bonjour après le premier message d'un client existant
- Collecte les informations progressivement
- Pour les sinistres : type → date → lieu → description → photos
- Pour les devis : type assurance → détails bien → usage → valeur
`;

const SETTING_DEFAULTS = {
  agent_name: 'AssurIA',
  welcome_message: 'Bonjour ! Je suis AssurIA, l assistant intelligent de votre cabinet d assurance. Comment puis-je vous aider aujourd hui ?',
  communication_style: 'numbered_options,auto_language',
  custom_instructions: ''
};

async function getSetting(key) {
  try {
    const { data } = await supabase.from('settings').select('value').eq('key', key).maybeSingle();
    return data?.value !== undefined && data?.value !== null ? data.value : (SETTING_DEFAULTS[key] || '');
  } catch (err) {
    console.error(`Erreur getSetting (${key}):`, err.message);
    return SETTING_DEFAULTS[key] || '';
  }
}

async function getCustomPrompt() {
  const [agentName, welcomeMsg, commStyle, customInstructions] = await Promise.all([
    getSetting('agent_name'),
    getSetting('welcome_message'),
    getSetting('communication_style'),
    getSetting('custom_instructions')
  ]);

  const styleInstructions = [];
  if (commStyle.includes('numbered_options')) styleInstructions.push('Propose toujours les options sous forme de liste numérotée.');
  if (commStyle.includes('formal')) styleInstructions.push('Utilise le vouvoiement.');
  if (commStyle.includes('informal')) styleInstructions.push('Utilise un ton chaleureux et informel.');
  if (commStyle.includes('auto_language')) styleInstructions.push('Détecte automatiquement la langue du client et réponds dans la même langue.');
  if (commStyle.includes('only_fr')) styleInstructions.push('Réponds uniquement en français.');
  if (commStyle.includes('only_ar')) styleInstructions.push('Réponds uniquement en arabe.');

  return `
IDENTITÉ DE L'AGENT :
Tu t'appelles ${agentName}.
Message d'accueil pour un nouveau client : ${welcomeMsg}

STYLE DE COMMUNICATION :
${styleInstructions.join('\n')}

INSTRUCTIONS SPÉCIFIQUES DU CABINET :
${customInstructions || 'Aucune instruction supplémentaire.'}
  `;
}

async function getSystemPrompt() {
  const custom = await getCustomPrompt();
  return TECHNICAL_PROMPT + '\n\n' + custom;
}

function clearPromptCache() {
  // Optionnel maintenant que nous lisons directement depuis Supabase ou avec un cache minimal.
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
    const customPrompt = await getCustomPrompt();
    let fullSystemPrompt = TECHNICAL_PROMPT + '\n\n' + customPrompt;

    if (clientProfile && Object.keys(clientProfile).length > 0) {
      fullSystemPrompt += `\n\nProfil client : ${JSON.stringify(clientProfile, null, 2)}`;
    }

    if (clientContext) {
      fullSystemPrompt += `\n\n${clientContext}`;
    }

    const messages = [
      ...filteredHistory.map(h => ({
        role: h.sender === 'ai' ? 'assistant' : 'user',
        content: h.sender === 'advisor' ? `[Conseiller humain]: ${h.content}` : h.content
      })),
      { role: 'user', content: userMessage }
    ];

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: fullSystemPrompt,
      messages: messages
    });

    const text = response.content[0].text;
    console.log('Réponse Claude:', text);
    const clean = text.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(clean);
    } catch {
      return { intent: 'general', response: text.trim(), data: {} };
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
