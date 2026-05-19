require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const supabase = require('./services/supabase');
const whatsappRoutes = require('./routes/whatsapp');
const widgetRoutes = require('./routes/widget');
const conversationsRoutes = require('./routes/conversations');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: [
    'https://dashboard-assuria.netlify.app',
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.DASHBOARD_URL
  ]
}));
app.use(bodyParser.json());

// Routes
app.use('/webhook', whatsappRoutes);
app.use('/api/widget', widgetRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/settings', require('./routes/settings'));

app.get('/api/media/:mediaId', async (req, res) => {
  try {
    // 1. Déterminer le token WhatsApp en fonction du tenant
    let token = process.env.WHATSAPP_TOKEN;
    const tenantId = req.headers['x-tenant-id'] || req.query.tenant_id;

    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('whatsapp_token')
        .eq('id', tenantId)
        .maybeSingle();
      if (tenant?.whatsapp_token) {
        token = tenant.whatsapp_token;
      }
    } else {
      // Recherche du tenant_id via le message qui fait référence à ce média
      const { data: msg } = await supabase
        .from('messages')
        .select('tenant_id')
        .eq('media_url', req.params.mediaId)
        .maybeSingle();

      if (msg?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('whatsapp_token')
          .eq('id', msg.tenant_id)
          .maybeSingle();
        if (tenant?.whatsapp_token) {
          token = tenant.whatsapp_token;
        }
      }
    }

    const response = await fetch(`https://graph.facebook.com/v18.0/${req.params.mediaId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const mediaData = await response.json();
    if (!mediaData.url) return res.status(404).send('Media non trouvé chez Meta');
    const fileResponse = await fetch(mediaData.url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    res.set('Content-Type', fileResponse.headers.get('content-type'));
    const arrayBuffer = await fileResponse.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (error) {
    console.error('Erreur proxy média:', error);
    res.status(500).send('Erreur');
  }
});

app.get('/', (req, res) => {
    res.send('Assuria AI Agent Backend is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
