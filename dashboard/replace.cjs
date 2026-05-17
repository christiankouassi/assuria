const fs = require('fs');
const lines = fs.readFileSync('src/App.jsx', 'utf8').split('\n');
const newContent = fs.readFileSync('C:/Users/PC/.gemini/antigravity/brain/be679b6c-9bd0-4ae8-a518-8edaf2431ab1/scratch/tabs_replacement.jsx', 'utf8').split('\n');
const startIdx = lines.findIndex(l => l.includes(") : activeTab === 'claims' ? ("));
const updatedLines = [...lines.slice(0, startIdx), ...newContent];
fs.writeFileSync('src/App.jsx', updatedLines.join('\n'));
