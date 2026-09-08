import fs from 'fs';

const filePath = 'src/types/navigation.ts';
let content = fs.readFileSync(filePath, 'utf8');

const tbEntry = `  {
    id: 'tb-register',
    labelMarathi: 'क्षयरोग (TB) संशयित रुग्ण नोंद',
    labelEnglish: 'TB Suspected Patient Register',
    iconName: 'Lungs',
    parentTab: 'data-entry',
  },`;
content = content.replace(
  "id: 'malaria-register',\n    labelMarathi: 'मलेरिया रक्त नमुना नोंद'",
  tbEntry + "\n  {\n    id: 'malaria-register',\n    labelMarathi: 'मलेरिया रक्त नमुना नोंद'"
);

const tbReport = `  {
    id: 'tb-reports',
    labelMarathi: 'TB अहवाल',
    labelEnglish: 'TB Reports',
    iconName: 'FileText',
    parentTab: 'reports',
  },`;
content = content.replace(
  "export const REPORTS_SUB_ITEMS: SubNavItem[] = [",
  "export const REPORTS_SUB_ITEMS: SubNavItem[] = [\n" + tbReport
);

fs.writeFileSync(filePath, content, 'utf8');
