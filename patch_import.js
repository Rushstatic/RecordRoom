import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

if (!content.includes('import DynamicReportPage')) {
  content = content.replace("import ReportsPage", "import DynamicReportPage from './pages/DynamicReportPage';\nimport ReportsPage");
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
