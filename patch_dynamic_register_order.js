import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

// The active fields are already sorted by templateService, so no need to sort here explicitly.

