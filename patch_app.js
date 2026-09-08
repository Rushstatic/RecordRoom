import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace setSelectedTemplateId logic
content = content.replace("templateId={selectedTemplateId}", "templateId={selectedTemplateId || localStorage.getItem('selectedTemplateId') || ''}");
content = content.replace("templateId={selectedTemplateId}", "templateId={selectedTemplateId || localStorage.getItem('selectedTemplateId') || ''}");

fs.writeFileSync('src/App.tsx', content, 'utf8');
