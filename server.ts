import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
