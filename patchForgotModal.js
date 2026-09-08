import fs from 'fs';

const filePath = 'src/components/auth/ForgotPasswordModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importSupabase = `import { supabase, isSupabaseConfigured } from '../../lib/supabase';`;
content = content.replace(`import { userService } from '../../services/userService';`, `import { userService } from '../../services/userService';\n${importSupabase}`);

// Replace handleForgotPasswordSubmit
const handleForgotTarget = /const handleForgotPasswordSubmit = async[\s\S]*?const handleVerifyOtp = async/m;
const handleForgotReplace = `const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setForgotStatus({ success: false, message: 'कृपया आपला नोंदणीकृत ईमेल प्रविष्ट करा.' });
      return;
    }

    setIsResetting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      // Check if user is registered before sending OTP
      const profiles = await userService.getUserProfiles();
      const exists = profiles.some(p => p.email && p.email.toLowerCase() === cleanEmail);
      
      if (!exists) {
        setForgotStatus({ success: false, message: 'हा ईमेल आयडी सिस्टीममध्ये नोंदणीकृत नाही.' });
        setIsResetting(false);
        return;
      }

      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail);
        if (error) throw error;
      } else {
        // Fallback for local mock
        const response = await fetch('/api/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'OTP पाठवताना त्रुटी आली.');
      }
      
      setForgotStatus({
        success: true,
        message: 'तुमच्या नोंदणीकृत ईमेलवर 6-अंकी OTP पाठवण्यात आला आहे. कृपया तुमचा इनबॉक्स तपासा.',
      });
      setForgotStep('otp');
    } catch (err: any) {
      setForgotStatus({
        success: false,
        message: err.message || 'विनंती पाठवताना त्रुटी आली.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleVerifyOtp = async`;
content = content.replace(handleForgotTarget, handleForgotReplace);

// Replace handleVerifyOtp
const handleVerifyTarget = /const handleVerifyOtp = async[\s\S]*?const handleSetNewPassword = async/m;
const handleVerifyReplace = `const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsResetting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      const cleanOtp = otp.trim();

      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanOtp, type: 'recovery' });
        if (error) throw error;
      } else {
        // Fallback for local mock
        const response = await fetch('/api/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, otp: cleanOtp }),
        });
        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'अवैध OTP.');
      }
      
      setForgotStatus({ success: true, message: 'OTP यशस्वीरीत्या पडताळला गेला. कृपया नवीन पासवर्ड सेट करा.' });
      setForgotStep('new_password');
    } catch (err: any) {
      setForgotStatus({ success: false, message: err.message || 'पडताळणी करताना त्रुटी आली.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSetNewPassword = async`;
content = content.replace(handleVerifyTarget, handleVerifyReplace);

// Replace handleSetNewPassword
const handleSetPasswordTarget = /const handleSetNewPassword = async[\s\S]*?const handleClose = \(\) =>/m;
const handleSetPasswordReplace = `const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setForgotStatus({ success: false, message: 'पासवर्ड किमान 6 वर्णांचा असावा.' });
      return;
    }
    
    setIsResetting(true);
    try {
      const cleanEmail = forgotEmail.trim().toLowerCase();
      if (isSupabaseConfigured() && supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        // Sign out to clear the recovery session so they can login normally
        await supabase.auth.signOut();
      }

      await userService.resetPasswordByEmailOrMobile(cleanEmail, newPassword);
      setForgotStatus({ success: true, message: 'पासवर्ड यशस्वीरीत्या बदलण्यात आला आहे! आता तुम्ही लॉगिन करू शकता.' });
      setTimeout(() => {
        handleClose();
      }, 3000);
    } catch (err: any) {
      setForgotStatus({ success: false, message: err.message || 'पासवर्ड सेट करताना त्रुटी आली.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () =>`;
content = content.replace(handleSetPasswordTarget, handleSetPasswordReplace);

fs.writeFileSync(filePath, content, 'utf8');
