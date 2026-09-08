import fs from 'fs';

const filePath = 'src/App.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add import
const importTarget = `import { UserManagementPage } from './pages/UserManagementPage';`;
const importReplace = `import { UserManagementPage } from './pages/UserManagementPage';
import { UserManualPage } from './pages/UserManualPage';`;
content = content.replace(importTarget, importReplace);

// Add case
const caseTarget = `      case 'user-management':
        return <UserManagementPage onNavigate={setCurrentPage} />;`;
const caseReplace = `      case 'user-management':
        return <UserManagementPage onNavigate={setCurrentPage} />;
      case 'user-manual':
        return <UserManualPage />;`;
content = content.replace(caseTarget, caseReplace);

fs.writeFileSync(filePath, content, 'utf8');
