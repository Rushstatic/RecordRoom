import fs from 'fs';

const filePath = 'src/pages/LoginPage.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import for ForgotPasswordModal
content = content.replace(
  `import { userService } from '../services/userService';`,
  `import { userService } from '../services/userService';\nimport { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';`
);

// 2. Remove internal states related to forgot password flow (keep isForgotModalOpen, forgotEmail)
// Actually we only need `isForgotModalOpen` and `forgotEmail`.
// We will replace the whole internal modal UI with `<ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} initialEmail={forgotEmail} />`

const regexStateToRemove = /  const \[forgotStatus[\s\S]*?const isSupabaseReady = isSupabaseConfigured\(\);/;

content = content.replace(regexStateToRemove, `  const isSupabaseReady = isSupabaseConfigured();`);

const regexMethodsToRemove = /  const handleForgotPasswordSubmit = async[\s\S]*?const handleSetNewPassword = async[\s\S]*?setIsResetting\(false\);\s*}\s*};\s*/;

content = content.replace(regexMethodsToRemove, '');

const regexModalToRemove = /\{\/\* Forgot Password Modal \*\/\}([\s\S]*?)\{\/\* Footer Disclaimer \*\/\}/;
content = content.replace(regexModalToRemove, 
`{/* Forgot Password Modal */}
      <ForgotPasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
        initialEmail={forgotEmail} 
      />

      {/* Footer Disclaimer */}`);

fs.writeFileSync(filePath, content, 'utf8');
