import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const importTarget = "import { UserManualPage } from './pages/UserManualPage';";
const importReplace = "import { UserManualPage } from './pages/UserManualPage';\nimport { TBRegisterPage } from './pages/TBRegisterPage';\nimport { TBReportsPage } from './pages/TBReportsPage';";
content = content.replace(importTarget, importReplace);

const caseTarget = `      case 'malaria-register':
        return <MalariaRegisterPage onNavigate={setCurrentPage} />;`;
const caseReplace = `      case 'malaria-register':
        return <MalariaRegisterPage onNavigate={setCurrentPage} />;
      case 'tb-register':
        return <TBRegisterPage onNavigate={setCurrentPage} />;
      case 'tb-reports':
        return <TBReportsPage onNavigate={setCurrentPage} />;`;
content = content.replace(caseTarget, caseReplace);

fs.writeFileSync(filePath, content, 'utf8');
