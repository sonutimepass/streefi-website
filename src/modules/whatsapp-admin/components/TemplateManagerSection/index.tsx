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
    <div className="bg-white p-6 rounded shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Template Manager</h2>

        <button
          className="px-4 py-2 bg-black text-white rounded"
          onClick={() => setShowModal(true)}
        >
          + Create Template
        </button>
      </div>

      {loading ? (
        <p>Loading templates...</p>
      ) : templates.length === 0 ? (
        <p>No templates created yet.</p>
      ) : (
        <table className="w-full border">
          <thead>
            <tr className="border-b bg-gray-100 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Language</th>
              <th className="p-2">Status</th>
              <th className="p-2">Meta Status</th>
              <th className="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.templateId} className="border-b">
                <td className="p-2">{t.name}</td>
                <td className="p-2">{t.category}</td>
                <td className="p-2">{t.language}</td>
                <td className="p-2">{t.status}</td>
                <td className="p-2">{t.metaStatus}</td>
                <td className="p-2">
                  <button
                    onClick={() => handleEdit(t)}
                    className="text-blue-600 hover:underline mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(t.templateId, t.status)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
