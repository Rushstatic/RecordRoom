import fs from 'fs';

const filePath = 'src/types/navigation.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("  {\n      {\n    id: 'tb-register',", "  {\n    id: 'tb-register',");
fs.writeFileSync(filePath, content, 'utf8');
