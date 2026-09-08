import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const replacement = `      case 'dynamic-report':
        return <DynamicReportPage onNavigate={setCurrentPage} templateId={selectedTemplateId || localStorage.getItem('selectedTemplateId') || ''} />;
      case 'reports':`;

content = content.replace("      case 'reports':", replacement);

if (!content.includes('import DynamicReportPage')) {
  content = content.replace("import ReportsPage from './pages/ReportsPage';", "import ReportsPage from './pages/ReportsPage';\nimport DynamicReportPage from './pages/DynamicReportPage';");
}

fs.writeFileSync('src/App.tsx', content, 'utf8');
