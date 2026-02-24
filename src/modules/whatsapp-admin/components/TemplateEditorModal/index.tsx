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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-4 sm:p-6 rounded-lg w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-900">
          {template ? 'Edit Template' : 'Create Template'}
        </h3>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name
            </label>
            <input
              placeholder="e.g., welcome_message"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="MARKETING">MARKETING</option>
              <option value="UTILITY">UTILITY</option>
              <option value="AUTHENTICATION">AUTHENTICATION</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <input
              placeholder="e.g., en"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={language}
              onChange={e => setLanguage(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Variables (comma separated)
            </label>
            <input
              placeholder="e.g., {{1}}, {{2}}"
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
              value={variables}
              onChange={e => setVariables(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Saving...' : template ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
