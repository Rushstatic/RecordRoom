import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

content = content.replace("action: editingId ? 'UPDATE' : 'CREATE',", "action: editingId ? 'DYNAMIC_RECORD_UPDATE' : 'DYNAMIC_RECORD_CREATE',");
content = content.replace("action: 'DELETE',", "action: 'DYNAMIC_RECORD_DELETE',");

fs.writeFileSync('src/pages/DynamicRegisterPage.tsx', content, 'utf8');
