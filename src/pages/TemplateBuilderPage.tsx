import React, { useState, useEffect } from 'react';
import { RecordRegisterTemplate, PageId } from '../types';
import { templateService } from '../services/templateService';
import { Settings, Plus, FileText, CheckCircle2, XCircle, Layout, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function TemplateBuilderPage({ 
  onNavigate, 
  onSelectTemplate 
}: { 
  onNavigate: (page: PageId) => void;
  onSelectTemplate: (id: string) => void;
}) {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<RecordRegisterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<RecordRegisterTemplate>>({});
  
  const isPhcController = user?.role === 'PHC_CONTROLLER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isPhcController) {
      onNavigate('dashboard');
      return;
    }
    loadTemplates();
  }, [isPhcController, onNavigate]);

  const loadTemplates = async () => {
    setLoading(true);
    const data = await templateService.getTemplates();
    setTemplates(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate.register_name || !editingTemplate.register_code) return;
    
    const newTemplate: RecordRegisterTemplate = {
      id: editingTemplate.id || `TPL-${Date.now()}`,
      register_code: editingTemplate.register_code,
      register_name: editingTemplate.register_name,
      program_name: editingTemplate.program_name || null,
      description: editingTemplate.description || null,
      icon: editingTemplate.icon || 'FileText',
      is_active: editingTemplate.is_active ?? true,
      display_order: editingTemplate.display_order || templates.length + 1,
      created_by: user?.id,
    };
    
    await templateService.saveTemplate(newTemplate);
    setShowModal(false);
    loadTemplates();
  };

  const openNewModal = () => {
    setEditingTemplate({ is_active: true, display_order: templates.length + 1, icon: 'FileText' });
    setShowModal(true);
  };

  const openEditModal = (t: RecordRegisterTemplate) => {
    setEditingTemplate(t);
    setShowModal(true);
  };

  const toggleStatus = async (t: RecordRegisterTemplate) => {
    await templateService.saveTemplate({ ...t, is_active: !t.is_active });
    loadTemplates();
  };

  if (loading) return <div className="p-8 text-center">लोड होत आहे...</div>;

  return (
    <div className="p-4 sm:p-6 pb-24 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-600" />
            रेकॉर्ड टेम्प्लेट व्यवस्थापन
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            डायनॅमिक रेजिस्टर्स आणि फॉर्म्स व्यवस्थापित करा
          </p>
        </div>
        <button
          onClick={openNewModal}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> नवीन टेम्प्लेट
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm font-semibold">
                <th className="p-4">Register Name</th>
                <th className="p-4">Program</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {templates.map(t => (
                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{t.register_name}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{t.register_code}</div>
                  </td>
                  <td className="p-4 text-slate-600">{t.program_name || '-'}</td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleStatus(t)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        t.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {t.is_active ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {t.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button
                      onClick={() => openEditModal(t)}
                      className="text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        onSelectTemplate(t.id); localStorage.setItem('selectedTemplateId', t.id);
                        onNavigate('template-fields');
                      }}
                      className="text-emerald-600 hover:text-emerald-800 font-medium inline-flex items-center gap-1"
                    >
                      Fields <ArrowRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    कोणतेही टेम्प्लेट उपलब्ध नाही.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-lg">
                {editingTemplate.id ? 'टेम्प्लेट संपादित करा' : 'नवीन टेम्प्लेट तयार करा'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">रजिस्टर कोड *</label>
                  <input
                    required
                    type="text"
                    value={editingTemplate.register_code || ''}
                    onChange={e => setEditingTemplate({...editingTemplate, register_code: e.target.value.toUpperCase()})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm font-mono"
                    placeholder="उदा. MALARIA"
                    disabled={!!editingTemplate.id}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">आयकॉन (Lucide)</label>
                  <input
                    type="text"
                    value={editingTemplate.icon || ''}
                    onChange={e => setEditingTemplate({...editingTemplate, icon: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                    placeholder="उदा. FileText"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">रजिस्टरचे नाव *</label>
                <input
                  required
                  type="text"
                  value={editingTemplate.register_name || ''}
                  onChange={e => setEditingTemplate({...editingTemplate, register_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                  placeholder="उदा. मलेरिया रक्त नमुना नोंद"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">आरोग्य कार्यक्रम</label>
                <input
                  type="text"
                  value={editingTemplate.program_name || ''}
                  onChange={e => setEditingTemplate({...editingTemplate, program_name: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                  placeholder="उदा. राष्ट्रीय हिवताप नियंत्रण कार्यक्रम"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">वर्णन</label>
                <textarea
                  rows={2}
                  value={editingTemplate.description || ''}
                  onChange={e => setEditingTemplate({...editingTemplate, description: e.target.value})}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 text-sm"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingTemplate.is_active}
                    onChange={e => setEditingTemplate({...editingTemplate, is_active: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-600 border-slate-300"
                  />
                  <span className="text-sm font-medium text-slate-700">सक्रिय (Active)</span>
                </label>
              </div>

              <div className="pt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  जतन करा
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
