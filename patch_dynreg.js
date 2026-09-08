import fs from 'fs';

let content = fs.readFileSync('src/pages/DynamicRegisterPage.tsx', 'utf8');

// replace the form block with DynamicRecordForm usage
const replacement = `import { DynamicRecordForm } from '../components/DynamicRecordForm';`;

if (!content.includes('DynamicRecordForm')) {
  content = content.replace("import { templateService } from '../services/templateService';", "import { templateService } from '../services/templateService';\nimport { DynamicRecordForm } from '../components/DynamicRecordForm';");
}

// Remove form code and replace with component
const formStart = `          {error && (`;
const formEnd = `      ) : (`;

const formComp = `          <DynamicRecordForm 
            fields={fields} 
            initialData={formData} 
            onSave={(data) => {
              setFormData(data);
              // Wait for state to update, then save (or just pass data to handleSave directly)
            }}
            onCancel={() => { setShowForm(false); setEditingId(null); setFormData({}); }}
            error={error}
            success={success}
          />
        </div>
      ) : (`;

// Actually we need to change handleSave to take the data.
// Let's rewrite handleSave.
