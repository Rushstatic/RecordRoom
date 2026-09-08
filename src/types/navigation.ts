import { PageId } from './index';

export type MainNavTabId = 'dashboard' | 'data-entry' | 'reports';

export interface MainNavTabItem {
  id: MainNavTabId;
  labelMarathi: string;
  labelEnglish: string;
  iconName: string;
  defaultPage: PageId;
  descriptionMarathi: string;
}

export const MAIN_NAV_TABS: MainNavTabItem[] = [
  {
    id: 'dashboard',
    labelMarathi: 'Dashboard',
    labelEnglish: 'Dashboard',
    iconName: 'LayoutDashboard',
    defaultPage: 'dashboard',
    descriptionMarathi: 'माहिती पाहणे, KPI, चार्ट्स व अलर्ट्स',
  },
  {
    id: 'data-entry',
    labelMarathi: 'Data Entry',
    labelEnglish: 'Data Entry',
    iconName: 'FileEdit',
    defaultPage: 'daily-work',
    descriptionMarathi: 'नोंद करणे / operational काम करणे',
  },
  {
    id: 'reports',
    labelMarathi: 'Reports',
    labelEnglish: 'Reports',
    iconName: 'BarChart3',
    defaultPage: 'reports',
    descriptionMarathi: 'अहवाल पाहणे, Print व Export',
  },
];

export interface SubNavItem {
  id: PageId;
  labelMarathi: string;
  labelEnglish: string;
  iconName: string;
  badge?: string;
  badgeColor?: string;
  isControllerOnly?: boolean;
  parentTab: MainNavTabId;
}

export const DATA_ENTRY_SUB_ITEMS: SubNavItem[] = [
  {
    id: 'daily-work',
    labelMarathi: '📅 आजचे काम',
    labelEnglish: 'Daily Work & Quick Actions',
    iconName: 'CalendarCheck',
    parentTab: 'data-entry',
  },
  {
    id: 'tb-register',
    labelMarathi: 'क्षयरोग (TB) संशयित रुग्ण नोंद',
    labelEnglish: 'TB Suspected Patient Register',
    iconName: 'Activity',
    parentTab: 'data-entry',
  },
  {
    id: 'malaria-register',
    labelMarathi: 'मलेरिया रक्त नमुना नोंद',
    labelEnglish: 'Malaria Blood Sample Register',
    iconName: 'FileSpreadsheet',
    parentTab: 'data-entry',
  },
  {
    id: 'send-samples',
    labelMarathi: 'नमुने पाठविणे व प्रिंट',
    labelEnglish: 'Send Samples & Print Receipt',
    iconName: 'Send',
    parentTab: 'data-entry',
  },
  {
    id: 'malaria-targets',
    labelMarathi: 'मलेरिया उद्दिष्टे (लक्ष्य)',
    labelEnglish: 'Malaria Target Setting',
    iconName: 'Target',
    parentTab: 'data-entry',
  },
  {
    id: 'offline-drafts',
    labelMarathi: 'Offline Drafts (ऑफलाइन नोंदी)',
    labelEnglish: 'Offline Drafts & Safe Sync',
    iconName: 'CloudOff',
    parentTab: 'data-entry',
  },
  {
    id: 'phc-master',
    labelMarathi: 'प्रा.आ. केंद्र मास्टर',
    labelEnglish: 'PHC Master',
    iconName: 'Building2',
    isControllerOnly: true,
    parentTab: 'data-entry',
  },
  {
    id: 'subcentre-master',
    labelMarathi: 'उपकेंद्र मास्टर',
    labelEnglish: 'Subcentre Master',
    iconName: 'Home',
    parentTab: 'data-entry',
  },
  {
    id: 'village-master',
    labelMarathi: 'गाव मास्टर',
    labelEnglish: 'Village Master',
    iconName: 'MapPin',
    parentTab: 'data-entry',
  },
  {
    id: 'employee-master',
    labelMarathi: 'कर्मचारी मास्टर',
    labelEnglish: 'Employee Master',
    iconName: 'Users',
    parentTab: 'data-entry',
  },
  {
    id: 'user-management',
    labelMarathi: 'वापरकर्ता व्यवस्थापन',
    labelEnglish: 'User Management & Roles',
    iconName: 'UserCog',
    isControllerOnly: true,
    parentTab: 'data-entry',
  },
];

export const REPORTS_SUB_ITEMS: SubNavItem[] = [
  {
    id: 'tb-reports',
    labelMarathi: 'TB अहवाल',
    labelEnglish: 'TB Reports',
    iconName: 'FileText',
    parentTab: 'reports',
  },
  {
    id: 'reports',
    labelMarathi: 'मलेरिया अहवाल (M1/M2)',
    labelEnglish: 'Malaria Reports & Registers',
    iconName: 'BarChart3',
    parentTab: 'reports',
  },
  {
    id: 'malaria-coverage',
    labelMarathi: 'मलेरिया Coverage',
    labelEnglish: 'Malaria Coverage & Performance',
    iconName: 'Target',
    parentTab: 'reports',
  },
  {
    id: 'malaria-targets',
    labelMarathi: 'लक्ष्य व प्रगती अहवाल',
    labelEnglish: 'Target vs Actual Progress Report',
    iconName: 'Flag',
    parentTab: 'reports',
  },
  {
    id: 'data-validation',
    labelMarathi: 'डेटा गुणवत्ता अहवाल',
    labelEnglish: 'Data Quality & Validation Report',
    iconName: 'ShieldCheck',
    parentTab: 'reports',
  },
  {
    id: 'backup-audit',
    labelMarathi: 'Activity / Audit Report',
    labelEnglish: 'System Activity & Audit Log',
    iconName: 'Database',
    parentTab: 'reports',
  },
];

export function getParentTabForPage(page: PageId, currentTabPreference?: MainNavTabId): MainNavTabId {
  if (page === 'dashboard') return 'dashboard';

  if (page === 'malaria-targets') {
    return currentTabPreference === 'data-entry' ? 'data-entry' : 'reports';
  }

  const inDataEntry = DATA_ENTRY_SUB_ITEMS.some((item) => item.id === page);
  if (inDataEntry) return 'data-entry';

  const inReports = REPORTS_SUB_ITEMS.some((item) => item.id === page);
  if (inReports) return 'reports';

  return 'dashboard';
}
