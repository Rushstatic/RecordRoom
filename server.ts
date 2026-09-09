import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function startServer() {
  const app = express();

  // Determine environment:
  // In development inside AI Studio sandbox, DEFAULT_APP_PORT is 3000 and NODE_ENV !== 'production'
  const isDev = process.env.NODE_ENV !== 'production' && Boolean(process.env.DEFAULT_APP_PORT);

  // In AI Studio sandbox, DEFAULT_APP_PORT=3000 is required by the nginx proxy layer.
  // In deployed Cloud Run production, Cloud Run injects PORT (defaults to 8080) and sends traffic to it.
  const PORT = process.env.DEFAULT_APP_PORT
    ? parseInt(process.env.DEFAULT_APP_PORT, 10)
    : (process.env.PORT ? parseInt(process.env.PORT, 10) : (isDev ? 3000 : 8080));

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
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Mode: ${isDev ? 'development' : 'production'})`);
  });

  // Graceful termination for Cloud Run container lifecycle
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: shutting down HTTP server gracefully');
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

startServer();
