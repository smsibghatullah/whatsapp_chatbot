const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "main", // keep fixed
    dataPath: './.wwebjs_auth' // must match session deletion path
  }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox']
  }
});

module.exports = client;
