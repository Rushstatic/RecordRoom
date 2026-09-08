import fs from 'fs';

const filePath = 'src/layouts/AppLayout.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const target = `{currentPage === 'malaria-register' && 'मलेरिया रक्त नमुना नोंदवही (Blood Sample Register)'}`;
const replace = `{currentPage === 'malaria-register' && 'मलेरिया रक्त नमुना नोंदवही (Blood Sample Register)'}
                {currentPage === 'tb-register' && 'राष्ट्रीय क्षयरोग नियंत्रण कार्यक्रम — संशयित रुग्ण नमुना नोंदवही (TB Register)'}
                {currentPage === 'tb-reports' && 'क्षयरोग (TB) अहवाल व सांख्यिकी (TB Reports)'}`;

content = content.replace(target, replace);
fs.writeFileSync(filePath, content, 'utf8');
