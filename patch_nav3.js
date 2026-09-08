import fs from 'fs';

let content = fs.readFileSync('src/types/navigation.ts', 'utf8');

const replacement = `  if (page === 'malaria-targets') {
    return currentTabPreference === 'data-entry' ? 'data-entry' : 'reports';
  }
  if (page === 'template-fields' || page === 'dynamic-register') {
    return 'data-entry';
  }
  if (page === 'dynamic-report') {
    return 'reports';
  }`;

content = content.replace("  if (page === 'template-fields' || page === 'dynamic-register') {\n    return 'data-entry';\n  }", "  if (page === 'template-fields' || page === 'dynamic-register') {\n    return 'data-entry';\n  }\n  if (page === 'dynamic-report') {\n    return 'reports';\n  }");

fs.writeFileSync('src/types/navigation.ts', content, 'utf8');
