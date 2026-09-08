import fs from 'fs';

const filePath = 'src/layouts/AppLayout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `{currentPage === 'backup-audit' && 'डेटा बॅकअप व सिस्टीम Activity (Backup & Audit Log)'}`;
const replace = `{currentPage === 'backup-audit' && 'डेटा बॅकअप व सिस्टीम Activity (Backup & Audit Log)'}
                {currentPage === 'user-manual' && 'वापरकर्ता पुस्तिका (User Manual)'}`;
content = content.replace(target, replace);

fs.writeFileSync(filePath, content, 'utf8');
