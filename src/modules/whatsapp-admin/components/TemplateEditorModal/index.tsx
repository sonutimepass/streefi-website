'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onCreated: () => void;
  template?: any; // optional for edit
}

export default function TemplateEditorModal({ onClose, onCreated, template }: Props) {
  const [name, setName] = useState(template?.name || '');
  const [category, setCategory] = useState(template?.category || 'MARKETING');
  const [language, setLanguage] = useState(template?.language || 'en');
  const [variables, setVariables] = useState(
    template?.variables?.join(', ') || ''
  );
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name) return alert('Template name required');

    setLoading(true);

    try {
      const method = template ? 'PUT' : 'POST';

      await fetch('/api/whatsapp-admin/templates', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: template?.templateId,
          name,
          category,
          language,
          variables: variables
            ? variables.split(',').map((v: string) => v.trim())
            : [],
        }),
      });

      onCreated();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-[400px]">
        <h3 className="text-lg font-semibold mb-4">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>

        <input
          placeholder="Template name"
          className="w-full border p-2 mb-3"
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <select
          className="w-full border p-2 mb-3"
          value={category}
          onChange={e => setCategory(e.target.value)}
        >
          <option value="MARKETING">MARKETING</option>
          <option value="UTILITY">UTILITY</option>
          <option value="AUTHENTICATION">AUTHENTICATION</option>
        </select>

        <input
          placeholder="Language (en)"
          className="w-full border p-2 mb-3"
          value={language}
          onChange={e => setLanguage(e.target.value)}
        />

        <input
          placeholder="Variables (comma separated)"
          className="w-full border p-2 mb-4"
          value={variables}
          onChange={e => setVariables(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-black text-white rounded"
          >
            {loading ? 'Saving...' : template ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
