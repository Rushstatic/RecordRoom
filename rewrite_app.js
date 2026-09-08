import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const importReplacement = `import { MyAccountModal } from './components/auth/MyAccountModal';
import TemplateBuilderPage from './pages/TemplateBuilderPage';
import TemplateFieldsPage from './pages/TemplateFieldsPage';
import DynamicRegisterPage from './pages/DynamicRegisterPage';`;

content = content.replace("import { MyAccountModal } from './components/auth/MyAccountModal';", importReplacement);

const stateReplacement = `  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');`;

content = content.replace("  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');", stateReplacement);

const routerReplacement = `      case 'template-builder':
        return <TemplateBuilderPage onNavigate={setCurrentPage} onSelectTemplate={(id: string) => setSelectedTemplateId(id)} />;
      case 'template-fields':
        return <TemplateFieldsPage onNavigate={setCurrentPage} templateId={selectedTemplateId} />;
      case 'dynamic-register':
        return <DynamicRegisterPage onNavigate={setCurrentPage} templateId={selectedTemplateId} />;
      default:`;

content = content.replace("      default:", routerReplacement);

fs.writeFileSync('src/App.tsx', content, 'utf8');
