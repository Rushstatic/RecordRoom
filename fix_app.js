import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes("import DynamicReportPage")) {
  content = "import DynamicReportPage from './pages/DynamicReportPage';\n" + content;
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
