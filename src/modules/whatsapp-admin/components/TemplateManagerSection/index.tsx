'use client';

import { useEffect, useState } from 'react';
import TemplateEditorModal from '../TemplateEditorModal';

interface Template {
  templateId: string;
  name: string;
  category: string;
  language: string;
  status: string;
  metaStatus: string;
}

export default function TemplateManagerSection() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/whatsapp-admin/templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates', error);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit(template: any) {
    if (template.status !== 'DRAFT') {
      alert('Only draft templates can be edited.');
      return;
    }

    setEditingTemplate(template);
    setShowModal(true);
  }

  async function handleDelete(templateId: string, status: string) {
    if (status === 'ACTIVE') {
      alert('Active templates cannot be deleted.');
      return;
    }

    const confirmDelete = confirm('Are you sure you want to delete this template?');
    if (!confirmDelete) return;

    try {
      await fetch('/api/whatsapp-admin/templates', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      });

      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template', error);
      alert('Delete failed');
    }
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Template Manager</h2>

        <button
          className="w-full sm:w-auto px-4 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm sm:text-base font-medium"
          onClick={() => setShowModal(true)}
        >
          + Create Template
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-sm sm:text-base">No templates created yet.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Create your first template
          </button>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="border-b bg-gray-100 text-left">
                  <th className="p-3 text-sm font-semibold text-gray-700">Name</th>
                  <th className="p-3 text-sm font-semibold text-gray-700">Category</th>
                  <th className="p-3 text-sm font-semibold text-gray-700">Language</th>
                  <th className="p-3 text-sm font-semibold text-gray-700">Status</th>
                  <th className="p-3 text-sm font-semibold text-gray-700">Meta Status</th>
                  <th className="p-3 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.templateId} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="p-3 text-sm text-gray-600">{t.category}</td>
                    <td className="p-3 text-sm text-gray-600">{t.language}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        t.metaStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                        t.metaStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {t.metaStatus}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleEdit(t)}
                        className="text-blue-600 hover:text-blue-800 hover:underline mr-3 text-sm font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.templateId, t.status)}
                        className="text-red-600 hover:text-red-800 hover:underline text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {templates.map((t) => (
              <div key={t.templateId} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-base">{t.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t.category} • {t.language}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(t)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.templateId, t.status)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t.status}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    t.metaStatus === 'APPROVED' ? 'bg-green-100 text-green-800' : 
                    t.metaStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }`}>
                    Meta: {t.metaStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => {
            setShowModal(false);
            setEditingTemplate(null);
          }}
          onCreated={fetchTemplates}
        />
      )}
    </div>
  );
}
