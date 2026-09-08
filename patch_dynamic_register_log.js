import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

content = content.replace("auditService.logActivity({", "auditService.logAction({");
content = content.replace("auditService.logActivity({", "auditService.logAction({");

fs.writeFileSync('src/pages/DynamicRegisterPage.tsx', content, 'utf8');
