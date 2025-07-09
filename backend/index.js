require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
const QRCode = require('qrcode');
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const pool = require('./config/db');

// ==========================
// 📦 Imports (Modules + DB)
// ==========================
const client = require('./whatsappClient');

// ==========================
// 🔗 Route Files
// ==========================
const authRoutes = require('./routes/authRoutes');
const licenseRoutes = require('./routes/licenseRoutes');
const userRoutes = require('./routes/userRoutes');
const messageRoutes = require('./routes/messageRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const contactRoutes = require('./routes/contactRoutes');
const historyRoutes = require('./routes/historyRoutes');

// ==========================
// 🔐 Middlewares
// ==========================
const tokenMiddleware = require('./middlewares/tokenMiddleware');
const licenseMiddleware = require('./middlewares/licenseMiddleware');

// ==========================
// 📁 Static Files
// ==========================
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/images', express.static(__dirname + '/images'));

// ==========================
// 🛣️ Public Routes
// ==========================
app.use('/api/', authRoutes);        
app.use('/api/', licenseRoutes);    
app.use('/api/', messageRoutes);

// ==========================
// 🛡️ Protected Routes
// ==========================
app.use(licenseMiddleware);        
app.use(tokenMiddleware);           

app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/history', historyRoutes);

// ==========================
// 📲 WhatsApp QR / Ready Events
// ==========================
client.on('qr', async qr => {
  console.log("WhatsApp QR code ready");
  const qrCode = await QRCode.toDataURL(qr);
  io.emit('qr', qrCode);
});

// ==========================
// 🔍 Check License Before Connecting (WORKING SOLUTION)
// ==========================
client.on('authenticated', async () => {
  try {
    // Wait a moment for client.info to be populated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Get number from client.info after authentication
    if (!client.info?.wid?.user) {
      throw new Error('WhatsApp number not available in client info');
    }
    
    const scannedNumber = client.info.wid.user.replace(/\D/g, '');
    console.log(`Authenticated WhatsApp number: ${scannedNumber}`);
    
    // Check license in database
    const result = await pool.query(
      'SELECT * FROM license_keys WHERE whatsapp_number = $1 AND is_active = true',
      [scannedNumber]
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No active license found for this number');
      await client.logout();
      io.emit('license_error', {
        message: 'This WhatsApp number is not licensed. Please contact admin.'
      });
      return;
    }
    
    console.log('✅ Valid license found, proceeding with connection');
  } catch (error) {
    console.error('License verification error:', error);
    try {
      await client.logout();
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    }
    io.emit('license_error', {
      message: 'Error verifying license. Please try again.'
    });
  }
});

// Modified ready event to ensure we have the number
client.on('ready', () => {
  if (client.info?.wid?.user) {
    const number = client.info.wid.user;
    console.log('✅ WhatsApp is ready for number:', number);
    io.emit('ready', { number });
  } else {
    console.log('⚠️ WhatsApp ready but number not available');
  }
});

client.initialize();

// ==========================
// 🚀 Start Server
// ==========================
const PORT = process.env.PORT || 3002;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});