import fs from 'fs';

const filePath = 'src/types/index.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  `  | 'backup-audit'
  | 'user-management';`,
  `  | 'backup-audit'
  | 'user-management'
  | 'user-manual';`
);

fs.writeFileSync(filePath, content, 'utf8');
