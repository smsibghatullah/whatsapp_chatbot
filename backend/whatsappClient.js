const { Client, LocalAuth } = require('whatsapp-web.js');
const puppeteer = require('puppeteer');

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "main",
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
  headless: true,
  executablePath: '/usr/bin/google-chrome',
  args: ['--no-sandbox', '--disable-setuid-sandbox']
}

});

module.exports = client;
