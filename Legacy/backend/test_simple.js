const express = require('express');
const app = express();

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Simple test server running on port ${PORT}`);
});
