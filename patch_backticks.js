import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicReportPage.tsx', 'utf8');

content = content.replace(/\\\`/g, '\`');
content = content.replace(/\\\$/g, '\$');

fs.writeFileSync('src/pages/DynamicReportPage.tsx', content, 'utf8');
