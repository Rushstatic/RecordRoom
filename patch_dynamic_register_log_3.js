import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

content = content.replace("auditService.logAction({", "auditService.logAction({\n        ...({");
content = content.replace("}, user);", "})});");

content = content.replace("auditService.logAction({", "auditService.logAction({\n        ...({");
content = content.replace("}, user);", "})});");


fs.writeFileSync('src/pages/DynamicRegisterPage.tsx', content, 'utf8');
