import fs from 'fs';

const filePath = 'src/components/Header.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(
  '  BarChart3,\n} from \'lucide-react\';',
  '  BarChart3,\n  HelpCircle,\n} from \'lucide-react\';'
);

const bellTarget = `{/* CODE 13A: Notification Bell with real counter & actions */}
            <NotificationBell
              currentUser={user}
              onNavigatePage={onNavigatePage || (() => {})}
            />`;

const bellReplace = `{/* CODE 13A: Notification Bell with real counter & actions */}
            <NotificationBell
              currentUser={user}
              onNavigatePage={onNavigatePage || (() => {})}
            />

            {/* Help / User Manual Button */}
            {user && onNavigatePage && (
              <button
                type="button"
                onClick={() => onNavigatePage('user-manual')}
                title="वापरकर्ता पुस्तिका (User Manual)"
                className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-white/10 hover:bg-amber-500 hover:text-emerald-950 text-amber-200 transition-colors cursor-pointer border border-white/10"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}`;

content = content.replace(bellTarget, bellReplace);

fs.writeFileSync(filePath, content, 'utf8');
