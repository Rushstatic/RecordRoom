import fs from 'fs';

let content = fs.readFileSync('src/types/navigation.ts', 'utf8');

const replacement = `  if (page === 'malaria-targets') {
    return currentTabPreference === 'data-entry' ? 'data-entry' : 'reports';
  }
  if (page === 'template-fields' || page === 'dynamic-register') {
    return 'data-entry';
  }`;

content = content.replace("  if (page === 'malaria-targets') {\n    return currentTabPreference === 'data-entry' ? 'data-entry' : 'reports';\n  }", replacement);

fs.writeFileSync('src/types/navigation.ts', content, 'utf8');
