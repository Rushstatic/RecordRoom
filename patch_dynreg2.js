import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

const regex = /\{error && \([\s\S]*?<\/form>\n        <\/div>\n      \) : \(/;

const newFormBlock = `<DynamicRecordForm 
            fields={fields} 
            initialData={formData} 
            onSave={(data) => handleSaveDirect(data)}
            onCancel={() => { setShowForm(false); setEditingId(null); setFormData({}); }}
            error={error}
            success={success}
          />
        </div>
      ) : (`;

content = content.replace(regex, newFormBlock);

if (!content.includes('import { DynamicRecordForm }')) {
  content = content.replace("import { templateService } from '../services/templateService';", "import { templateService } from '../services/templateService';\nimport { DynamicRecordForm } from '../components/DynamicRecordForm';");
}

const validateFormRegex = /const validateForm = \(\) => \{[\s\S]*?return true;\n  \};\n/;
// We need to rewrite handleSave to handleSaveDirect(data: any)
const handleSaveStr = `  const validateForm = (dataToValidate: any) => {
    for (const f of activeFields) {
      if (f.is_required) {
        let isVisible = true;
        if (f.conditional_json && f.conditional_json.depends_on) {
           if (dataToValidate[f.conditional_json.depends_on] !== f.conditional_json.value) {
              isVisible = false;
           }
        }
        if (isVisible && (!dataToValidate[f.field_key] || dataToValidate[f.field_key].toString().trim() === '')) {
          setError(\`कृपया '\${f.field_label}' भरा.\`);
          return false;
        }
      }
      if (f.field_type === 'date' && dataToValidate[f.field_key]) {
         const dateVal = new Date(dataToValidate[f.field_key]);
         if (f.validation_json?.allow_future === false && dateVal > new Date()) {
            setError(\`\${f.field_label} भविष्यातील तारीख निवडता येणार नाही.\`);
            return false;
         }
      }
    }
    return true;
  };

  const handleSaveDirect = async (dataToSave: any) => {
    if (!templateId) return;
    setError(null);
    setSuccess(null);

    if (!validateForm(dataToSave)) return;

    try {
      const newRecord: DynamicRecordEntry = {
        id: editingId || \`REC-\${Date.now()}\`,
        template_id: templateId,
        employee_id: user?.employeeId,
        phc_id: user?.phcId,
        subcentre_id: user?.subcentreId,
        record_data: dataToSave,
        record_date: new Date().toISOString().split('T')[0],
        created_by: user?.id,
      };

      await templateService.saveDynamicRecord(newRecord);
      
      auditService.logAction({
        action: editingId ? 'DYNAMIC_RECORD_UPDATE' : 'DYNAMIC_RECORD_CREATE',
        module: 'Daily Work' as any,
        record_description: \`Dynamic Record: \${template?.register_name}\`,
      });

      setSuccess('नोंद यशस्वीरित्या जतन झाली.');
      setTimeout(() => {
        setShowForm(false);
        setFormData({});
        setEditingId(null);
        setSuccess(null);
        loadData();
      }, 1500);
    } catch (err) {
      setError('नोंद जतन करता आली नाही. कृपया पुन्हा प्रयत्न करा.');
    }
  };`;

// replace old validateForm and handleSave
content = content.replace(/const validateForm = \(\) => \{[\s\S]*?\} catch \(err\) \{[\s\S]*?\}\n  \};/, handleSaveStr);

fs.writeFileSync('src/pages/DynamicRegisterPage.tsx', content, 'utf8');
