import fs from 'fs';

let types = fs.readFileSync('src/types/index.ts', 'utf8');
types = types.replace(
  "| 'Daily Work';",
  "| 'Daily Work'\n  | 'TB Register'\n  | 'TB Reports';"
);
fs.writeFileSync('src/types/index.ts', types, 'utf8');

