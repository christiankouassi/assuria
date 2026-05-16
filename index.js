require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsapp');
const widgetRoutes = require('./routes/widget');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// Routes
app.use('/webhook', whatsappRoutes);
app.use('/api/widget', widgetRoutes);

app.get('/', (req, res) => {
    res.send('Assuria AI Agent Backend is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
