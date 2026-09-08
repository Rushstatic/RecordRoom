import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

content = content.replace(`      auditService.logAction({
        ...({
        ...({
        action: editingId ? 'DYNAMIC_RECORD_UPDATE' : 'DYNAMIC_RECORD_CREATE',
        module: 'Daily Work',
        record_description: \`Dynamic Record: \${template?.register_name}\`,
      })});`, `      auditService.logAction({
        action: editingId ? 'DYNAMIC_RECORD_UPDATE' : 'DYNAMIC_RECORD_CREATE',
        module: 'Daily Work' as any,
        record_description: \`Dynamic Record: \${template?.register_name}\`,
      });`);
      
content = content.replace(`       auditService.logAction({
         action: 'DYNAMIC_RECORD_DELETE',
         module: 'Daily Work',
         record_description: \`Dynamic Record Deleted\`,
       })});`, `       auditService.logAction({
         action: 'DYNAMIC_RECORD_DELETE',
         module: 'Daily Work' as any,
         record_description: \`Dynamic Record Deleted\`,
       });`);

fs.writeFileSync('src/pages/DynamicRegisterPage.tsx', content, 'utf8');
