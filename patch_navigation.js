import fs from 'fs';

let content = fs.readFileSync('src/types/navigation.ts', 'utf8');

const newItem = `  {
    id: 'template-builder',
    labelMarathi: 'रेकॉर्ड टेम्प्लेट व्यवस्थापन',
    labelEnglish: 'Register Builder',
    iconName: 'Settings',
    isControllerOnly: true,
    parentTab: 'data-entry',
  },
  {
    id: 'user-management',`;

content = content.replace("  {\n    id: 'user-management',", newItem);

fs.writeFileSync('src/types/navigation.ts', content, 'utf8');
