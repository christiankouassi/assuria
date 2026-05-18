require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
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
    const response = await fetch(`https://graph.facebook.com/v18.0/${req.params.mediaId}`, {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });
    const mediaData = await response.json();
    if (!mediaData.url) return res.status(404).send('Media non trouvé chez Meta');
    const fileResponse = await fetch(mediaData.url, {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });
    res.set('Content-Type', fileResponse.headers.get('content-type'));
    const reader = fileResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
    res.end();
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
