  require('dotenv').config();
  const express = require('express');
  const { createServer } = require('http');
  const { Server } = require('socket.io');
  const path = require('path');
  const QRCode = require('qrcode');
  const app = express();
  const httpServer = createServer(app);
  const pool = require('./config/db');
  const cors = require('cors');
  const IP = "192.168.10.29";

  const io = new Server(httpServer, {
    cors: {
      origin: 'http://192.168.10.29:3000',
        methods: 'GET,POST,PUT,DELETE',
        allowedHeaders: ['Content-Type', 'Authorization', 'license_key'] ,
        credentials: true
    }
  });
  io.on("connection", (socket) => {
  console.log("New client connected");

  // Always emit current status upon new connection
if (!client.info || !client.info.wid || !client.info.wid.user) {
  client.once('qr', async (qr) => {
    console.log('🔄 Emitting QR on new connection');
    const qrCode = await QRCode.toDataURL(qr);
    socket.emit('qr', qrCode);
  });
} else {
  socket.emit("ready", { number: client.info.wid.user });
}


  // other event listeners here...
});


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

  //cors
  app.use(cors({
    origin: 'http://192.168.10.29:3000', // ✅ NOT '*'
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'license_key'],
    credentials: true
  }));
  // ==========================
  // 🛣️ Public Routes
  // ==========================
  app.use('/api/', authRoutes);        
  app.use('/api/', licenseRoutes);    
  app.use('/api/', messageRoutes);

  // ==========================
  // 🛡️ Protected Routes
  // ==========================
  // app.use(licenseMiddleware);
  app.use(tokenMiddleware);           

  app.use('/api/users', userRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/contacts', contactRoutes);
  app.use('/api/history', historyRoutes);

  // ==========================
  // 📲 WhatsApp QR / Ready Events
  // ==========================
  client.on('loading_screen', (percent, message) => {
    console.log(`Loading WhatsApp: ${percent}% - ${message}`);
  });

  client.on('qr', async qr => {
    console.log('🔄 QR EVENT TRIGGERED');
    const qrCode = await QRCode.toDataURL(qr);
    io.emit('qr', qrCode);
  });

  // ==========================

  // 🔍 Check License Before Connecting (WORKING SOLUTION)
  // ==========================
  // client.on('authenticated', async () => {
  //   try {
  //     // Wait a moment for client.info to be populated
  //     await new Promise(resolve => setTimeout(resolve, 1000));
      
  //     // Get number from client.info after authentication
  //     if (!client.info?.wid?.user) {
  //       throw new Error('WhatsApp number not available in client info');
  //     }

  //     const scannedNumber = client.info.wid.user.replace(/\D/g, '');
  //     console.log(`Authenticated WhatsApp number: ${scannedNumber}`);

  //     // Check license in database
  //     const result = await pool.query(
  //       'SELECT * FROM license_keys WHERE whatsapp_number = $1 AND is_active = true',
  //       [scannedNumber]
  //     );

  //     if (result.rows.length === 0) {
  //       console.log('❌ No active license found for this number');
  //       await client.logout();
  //       io.emit('license_error', {
  //         message: 'This WhatsApp number is not licensed. Please contact admin.'
  //       });
  //       return;
  //     }

  //     console.log('✅ Valid license found, proceeding with connection');
  //   } catch (error) {
  //     console.error('License verification error:', error);
  //     try {
  //       await client.logout();
  //     } catch (logoutError) {
  //       console.error('Logout error:', logoutError);
  //     }
  //     io.emit('license_error', {
  //       message: 'Error verifying license. Please try again.'
  //     });
  //   }
  // });

  // Modified ready event to ensure we have the number
  // client.on('ready', async () => {
  //   console.log('✅ WhatsApp is ready');

  //   if (!client.info || !client.info.wid || !client.info.wid.user) {
  //     console.error('❌ WhatsApp number not available in client info');
  //     return;
  //   }

  //   const scannedNumber = client.info.wid.user.replace(/\D/g, '');
  //   console.log(`Logged in WhatsApp number: ${scannedNumber}`);

  //   // ✅ License verification moved here
  //   try {
  //     const result = await pool.query(
  //       'SELECT * FROM license_keys WHERE whatsapp_number = $1 AND is_active = true',
  //       [scannedNumber]
  //     );

  //     if (result.rows.length === 0) {
  //       console.log('❌ No active license found for this number');
  //       await client.logout();
  //       io.emit('license_error', {
  //         message: 'This WhatsApp number is not licensed. Please contact admin.'
  //       });
  //       return;
  //     }

  //     console.log('✅ Valid license found, proceeding with connection');
  //     io.emit('ready', { number: scannedNumber });

  //   } catch (error) {
  //     console.error('License verification error:', error);
  //     await client.logout();
  //     io.emit('license_error', {
  //       message: 'Error verifying license. Please try again.'
  //     });
  //   }
  // });
  client.on('authenticated', () => {
    console.log('✅ WhatsApp Authenticated');
    // ❌ Do NOT check license here
  });

  client.on('ready', async () => {
    console.log('✅ WhatsApp is ready');

      if (!client.info || !client.info.wid || !client.info.wid.user) {
        console.error('❌ WhatsApp number not available in client info');
        io.emit('license_error', {
          message: 'WhatsApp number not found. Please try restarting.'
        });
        return;
      }

      const scannedNumber = client.info.wid.user.replace(/\D/g, '');
      console.log(`Logged in WhatsApp number: ${scannedNumber}`);

    // 🔑 License verification here
    try {
      const result = await pool.query(
        'SELECT * FROM license_keys WHERE whatsapp_number = $1 AND is_active = true',
        [scannedNumber]
      );

      if (result.rows.length === 0) {
        console.log('❌ No active license found for this number');
        io.emit('license_error', {
          message: 'This WhatsApp number is not licensed. Please contact admin.'
        });

        // Schedule logout to avoid crashing puppeteer
        setTimeout(async () => {
          try {
            await client.logout();
          } catch (err) {
            console.error('Logout error:', err);
          }
        }, 2000);

        return;
      }

      console.log('✅ Valid license found, proceeding with connection');
      io.emit('ready', { number: scannedNumber });

    } catch (error) {
      console.error('License verification error:', error);
      io.emit('license_error', {
        message: 'Error verifying license. Please try again.'
      });

      setTimeout(async () => {
        try {
          await client.logout();
        } catch (err) {
          console.error('Logout error:', err);
        }
      }, 2000);
    }
  });




  client.initialize();

  // ==========================
  // 🚀 Start Server
  // ==========================
  const PORT = process.env.PORT || 3002;
  httpServer.listen(PORT, IP, () => {
    console.log(`Server running on http://${IP}:${PORT}`);
  });