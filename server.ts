import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

declare const IS_PRODUCTION_BUILD: boolean | undefined;

async function startServer() {
  const app = express();

  // Detect whether running in production mode:
  // - Compiled bundle with IS_PRODUCTION_BUILD=true
  // - NODE_ENV is set to 'production'
  // - Running inside Cloud Run (process.env.K_SERVICE is present)
  // - File path includes 'dist'
  const isProd =
    (typeof IS_PRODUCTION_BUILD !== 'undefined' && Boolean(IS_PRODUCTION_BUILD)) ||
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE) ||
    (typeof __filename !== 'undefined' && __filename.includes('dist'));

  const isDev = !isProd;

  app.use(cors());
  app.use(express.json());

  // Health check endpoint for Cloud Run and container lifecycle probes
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // In-memory store for OTPs (in production, use a database or redis)
  const otpStore = new Map<string, { otp: string, expiresAt: number }>();

  // Nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // API route to send OTP
  app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ 
        success: false, 
        message: 'GMAIL_USER किंवा GMAIL_APP_PASSWORD कॉन्फिगर केलेले नाही. (कृपया Settings मधील Secrets तपासा)' 
      });
    }

    // Generate 6-digit OTP
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minute expiration
    otpStore.set(email, {
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    try {
      await transporter.sendMail({
        from: `"आरोग्य उपकेंद्र प्रणाली" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'तुमचा पासवर्ड रीसेट OTP (Arogya Subcentre System)',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #065f46; text-align: center;">पासवर्ड रीसेट विनंती</h2>
            <p>नमस्कार,</p>
            <p>तुमच्या खात्याचा पासवर्ड रीसेट करण्यासाठी खालील OTP वापरा:</p>
            <div style="background-color: #f1f5f9; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h1 style="margin: 0; color: #0f172a; letter-spacing: 5px;">${generatedOtp}</h1>
            </div>
            <p style="color: #64748b; font-size: 12px;">हा OTP पुढील 10 मिनिटांसाठी वैध आहे. जर तुम्ही ही विनंती केली नसेल, तर कृपया या ईमेलकडे दुर्लक्ष करा.</p>
          </div>
        `
      });

      res.json({ success: true, message: 'OTP यशस्वीरीत्या ईमेलवर पाठवला.' });
    } catch (error: any) {
      console.error('Error sending email:', error);
      res.status(500).json({ success: false, message: 'ईमेल पाठवताना त्रुटी आली.', error: error.message });
    }
  });

  // Verify OTP Route
  app.post('/api/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    
    const record = otpStore.get(email);
    if (!record) {
      return res.status(400).json({ success: false, message: 'OTP सापडला नाही. कृपया पुन्हा विनंती करा.' });
    }
    
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ success: false, message: 'OTP ची वेळ संपली आहे (Expired).' });
    }
    
    if (record.otp === otp) {
      otpStore.delete(email); // Clear after successful verification
      return res.json({ success: true, message: 'OTP बरोबर आहे.' });
    } else {
      return res.status(400).json({ success: false, message: 'अवैध OTP.' });
    }
  });

  // Serve assets:
  // In development, hook into Vite development server
  // In production (Cloud Run), serve the compiled static files from dist/
  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (viteError) {
      console.error('Failed to start Vite dev server:', viteError);
    }

    // In dev container, the server must listen on port 3000 to work with nginx reverse proxy
    const devPort = 3000;
    const server = app.listen(devPort, '0.0.0.0', () => {
      console.log(`Server running in development mode on http://0.0.0.0:${devPort}`);
    });

    process.on('SIGTERM', () => {
      server.close(() => process.exit(0));
    });
  } else {
    const cwdDist = path.join(process.cwd(), 'dist');
    const localDist = typeof __dirname !== 'undefined' ? __dirname : cwdDist;
    const distPath = fs.existsSync(path.join(cwdDist, 'index.html'))
      ? cwdDist
      : (fs.existsSync(path.join(localDist, 'index.html')) ? localDist : cwdDist);

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    // In production (Cloud Run), listen on process.env.PORT (defaults to 8080)
    const primaryPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
    const activeServers: any[] = [];

    const primaryServer = app.listen(primaryPort, '0.0.0.0', () => {
      console.log(`Production server listening on http://0.0.0.0:${primaryPort}`);
    });
    activeServers.push(primaryServer);

    // If primaryPort is not 3000, also attempt to listen on 3000 for any internal proxy routing
    if (primaryPort !== 3000) {
      try {
        const secondaryServer = app.listen(3000, '0.0.0.0', () => {
          console.log(`Production secondary listener active on http://0.0.0.0:3000`);
        });
        secondaryServer.on('error', (err: any) => {
          console.warn(`Secondary port 3000 not bound (${err.message}) - continuing with primary port ${primaryPort}`);
        });
        activeServers.push(secondaryServer);
      } catch (err: any) {
        console.warn(`Could not start secondary port 3000:`, err.message);
      }
    }

    process.on('SIGTERM', () => {
      console.log('SIGTERM signal received: shutting down HTTP server gracefully');
      activeServers.forEach(s => {
        try { s.close(); } catch {}
      });
      setTimeout(() => process.exit(0), 1000);
    });
  }
}

startServer();
