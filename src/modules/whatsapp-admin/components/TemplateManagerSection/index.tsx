/**
 * Template Manager Section - Phase UI-4: Production Upgrade
 * 
 * Enhanced with:
 * - Comprehensive template metadata display
 * - Sync from Meta functionality
 * - Send test message capability
 * - Better status visualization
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TemplateEditorModal from '../TemplateEditorModal';
import { getCsrfHeader } from '@/lib/csrfClient';

interface Template {
  templateId: string;
  name: string;
  category: string;
  language: string;
  status: string;
  metaStatus: string;
  variables: string[];
  createdAt?: string;
  updatedAt?: string;
  syncedFromMeta?: boolean;
  lastSyncTime?: string;
  metaTemplateId?: string;
}

interface MetaTemplate {
  id: string;
  name: string;
  status: string;
  category: string;
  language: string;
  parameter_format?: string;
  variables: string[];
  components?: any[];
}

export default function TemplateManagerSection() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [fetchingMeta, setFetchingMeta] = useState(false);
  const [metaTemplates, setMetaTemplates] = useState<MetaTemplate[]>([]);
  const [showMetaPreview, setShowMetaPreview] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [testingTemplate, setTestingTemplate] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    try {
      const res = await fetch('/api/whatsapp-admin/templates', { credentials: 'include' });
      if (res.status === 401) {
        showMessage('error', 'Session expired. Redirecting to login...');
        setTimeout(() => router.push('/whatsapp-admin'), 1500);
        return;
      }
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Failed to fetch templates', error);
      showMessage('error', 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchFromMeta() {
    setFetchingMeta(true);
    setMessage(null);
    try {
      const res = await fetch('/api/whatsapp-admin/templates/sync', { credentials: 'include' });
      const data = await res.json();
      if (res.status === 401) {
        showMessage('error', 'Session expired. Redirecting to login...');
        setTimeout(() => router.push('/whatsapp-admin'), 1500);
        return;
      }
      if (!res.ok) throw new Error(data.error || data.details || 'Failed to fetch from Meta');
      setMetaTemplates(data.templates || []);
      setShowMetaPreview(true);
    } catch (error) {
      console.error('Failed to fetch from Meta', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to fetch from Meta');
    } finally {
      setFetchingMeta(false);
    }
  }

  async function handleSyncFromMeta() {
    console.log('🔄 [Template Manager] Sync requested');
    if (!confirm('Sync all templates from Meta? This will import new templates and update existing ones.')) {
      console.log('⚠️ [Template Manager] Sync cancelled by user');
      return;
    }

    console.log('🚀 [Template Manager] Starting template sync from Meta...');
    setSyncing(true);
    setMessage(null);

    try {
      const res = await fetch('/api/whatsapp-admin/templates/sync', {
        method: 'POST',
        headers: { ...getCsrfHeader() },
      });

      const data = await res.json();
      console.log('📥 [Template Manager] Full response:', {
        status: res.status,
        ok: res.ok,
        data: data
      });

      if (!res.ok) {
        console.error('❌ [Template Manager] Sync failed!');
        console.error('Response Status:', res.status);
        console.error('Response Data:', JSON.stringify(data, null, 2));
        
        // Show debug info if available
        if (data.debug) {
          console.error('🔍 Debug Info:', data.debug);
        }
        
        throw new Error(data.error || data.details || 'Sync failed');
      }

      console.log(`✅ [Template Manager] Sync successful - Imported: ${data.result.imported}, Updated: ${data.result.updated}`);
      showMessage('success', `Synced! Imported: ${data.result.imported}, Updated: ${data.result.updated}`);
      
      // Reload templates
      await fetchTemplates();
    } catch (error) {
      console.error('Failed to sync templates', error);
      showMessage('error', error instanceof Error ? error.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  async function handleSendTest(templateName: string) {
    console.log(`🧪 [Template Manager] Test send requested for template: ${templateName}`);
    if (!testPhone) {
      console.warn('⚠️ [Template Manager] No phone number provided');
      showMessage('error', 'Please enter a phone number');
      return;
    }

    console.log(`📱 [Template Manager] Sending test to: ${testPhone}`);
    setSendingTest(true);
    setMessage(null);

    try {
      const res = await fetch('/api/whatsapp-admin/templates/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
        body: JSON.stringify({
          templateName,
          toPhone: testPhone
        })
      });

      const data = await res.json();
      console.log('📥 [Template Manager] Test send response:', data);

      if (!res.ok) {
        console.error('❌ [Template Manager] Test send failed:', data.error);
        throw new Error(data.details || data.error || 'Failed to send test');
      }

      console.log(`✅ [Template Manager] Test message sent successfully to ${testPhone}`);
      showMessage('success', `Test message sent to ${testPhone}!`);
      setTestingTemplate(null);
      setTestPhone('');
    } catch (error) {
      console.error('Failed to send test', error);
      showMessage('error', error instanceof Error ? error.message : 'Failed to send test');
    } finally {
      setSendingTest(false);
    }
  }

  function handleEdit(template: any) {
    if (template.status !== 'draft') {
      showMessage('error', 'Only draft templates can be edited');
      return;
    }

    setEditingTemplate(template);
    setShowModal(true);
  }

  async function handleDelete(templateId: string, status: string) {
    if (status === 'active') {
      showMessage('error', 'Active templates cannot be deleted. Disable it first.');
      return;
    }

    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      const deleteUrl = `/api/whatsapp-admin/templates?templateId=${encodeURIComponent(templateId)}`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { ...getCsrfHeader() },
      });

      showMessage('success', 'Template deleted');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template', error);
      showMessage('error', 'Delete failed');
    }
  }

  async function handleToggleStatus(templateId: string, currentStatus: string) {
    const newStatus = currentStatus === 'active' ? 'draft' : 'active';
    const action = newStatus === 'active' ? 'enable' : 'disable';
    
    if (!confirm(`Are you sure you want to ${action} this template?`)) {
      return;
    }

    try {
      await fetch('/api/whatsapp-admin/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
        body: JSON.stringify({ templateId, status: newStatus }),
      });

      showMessage('success', `Template ${action}d successfully`);
      fetchTemplates();
    } catch (error) {
      console.error('Failed to toggle template status', error);
      showMessage('error', 'Status update failed');
    }
  }

  function showMessage(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMetaStatusBadge = (metaStatus: string) => {
    const baseClasses = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full';
    switch (metaStatus) {
      case 'APPROVED':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'PENDING':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'REJECTED':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Template Manager</h2>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50"
            onClick={handleFetchFromMeta}
            disabled={fetchingMeta || loading}
          >
            {fetchingMeta ? '⏳ Fetching...' : '📡 Fetch from Meta'}
          </button>
          <button
            className="px-4 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            onClick={handleSyncFromMeta}
            disabled={syncing || loading}
          >
            {syncing ? '🔄 Syncing...' : '🔄 Sync to DB'}
          </button>
          <button
            className="px-4 py-2.5 bg-black text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
            onClick={() => setShowModal(true)}
          >
            + Create Template
          </button>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black"></div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-sm sm:text-base">No templates yet.</p>
          <div className="mt-4 space-y-2">
            <button
              onClick={handleSyncFromMeta}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Sync from Meta
            </button>
            <span className="text-gray-400 mx-2">or</span>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Create manually
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="border-b bg-gray-100 text-left">
                  <th className="p-3 text-xs font-semibold text-gray-700">Name</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Category</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Language</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Status</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Meta Status</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Variables</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Synced</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Last Sync</th>
                  <th className="p-3 text-xs font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.templateId} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="p-3 text-sm font-medium text-gray-900">{t.name}</td>
                    <td className="p-3 text-xs text-gray-600">{t.category}</td>
                    <td className="p-3 text-xs text-gray-600">{t.language}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={getMetaStatusBadge(t.metaStatus)}>
                        {t.metaStatus}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-600">
                      {t.variables.length > 0 ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {t.variables.length} vars
                        </span>
                      ) : (
                        <span className="text-gray-400">None</span>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      {t.syncedFromMeta ? (
                        <span className="text-green-600 font-medium">✓ Yes</span>
                      ) : (
                        <span className="text-gray-400">Manual</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500">
                      {t.lastSyncTime ? formatDate(t.lastSyncTime) : '-'}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => setTestingTemplate(t.name)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium text-left"
                          disabled={t.metaStatus !== 'APPROVED'}
                          title={t.metaStatus !== 'APPROVED' ? 'Template must be approved' : 'Send test message'}
                        >
                          📤 Test
                        </button>
                        <button
                          onClick={() => handleEdit(t)}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium text-left"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleStatus(t.templateId, t.status)}
                          className={`text-xs font-medium hover:underline text-left ${
                            t.status === 'active' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'
                          }`}
                        >
                          {t.status === 'active' ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDelete(t.templateId, t.status)}
                          className="text-red-600 hover:text-red-800 hover:underline text-xs font-medium text-left"
                        >
                          Delete
                        </button>
                      </div>
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
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">{t.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t.category} • {t.language}</p>
                  </div>
                </div>
                
                <div className="flex gap-2 flex-wrap mb-3">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {t.status}
                  </span>
                  <span className={getMetaStatusBadge(t.metaStatus)}>
                    {t.metaStatus}
                  </span>
                  {t.syncedFromMeta && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700">
                      ✓ Synced
                    </span>
                  )}
                  {t.variables.length > 0 && (
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700">
                      {t.variables.length} vars
                    </span>
                  )}
                </div>

                {t.lastSyncTime && (
                  <p className="text-xs text-gray-500 mb-3">
                    Last sync: {formatDate(t.lastSyncTime)}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => setTestingTemplate(t.name)}
                    disabled={t.metaStatus !== 'APPROVED'}
                    className="flex-1 text-blue-600 hover:text-blue-800 text-xs font-medium py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    📤 Test
                  </button>
                  <button
                    onClick={() => handleEdit(t)}
                    className="flex-1 text-blue-600 hover:text-blue-800 text-xs font-medium py-2 border border-blue-200 rounded hover:bg-blue-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(t.templateId, t.status)}
                    className={`flex-1 text-xs font-medium py-2 border rounded hover:bg-opacity-50 transition-colors ${
                      t.status === 'active' 
                        ? 'text-orange-600 border-orange-200 hover:bg-orange-50' 
                        : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {t.status === 'active' ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDelete(t.templateId, t.status)}
                    className="flex-1 text-red-600 hover:text-red-800 text-xs font-medium py-2 border border-red-200 rounded hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Meta Preview Modal */}
      {showMetaPreview && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMetaPreview(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Live Templates from Meta Graph API</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{metaTemplates.length} templates found — not yet saved to DB</p>
                </div>
                <button onClick={() => setShowMetaPreview(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              <div className="overflow-y-auto max-h-96 border border-gray-200 rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600">Name</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600">Category</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600">Language</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600">Status</th>
                      <th className="p-3 text-left text-xs font-semibold text-gray-600">Variables</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metaTemplates.map((t) => (
                      <tr key={t.id} className="border-t hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">{t.name}</td>
                        <td className="p-3 text-xs text-gray-600">{t.category}</td>
                        <td className="p-3 text-xs text-gray-600">{t.language}</td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            t.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            t.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                            t.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>{t.status}</span>
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          {t.variables.length > 0 ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{t.variables.length} vars</span>
                          ) : <span className="text-gray-400">None</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={async () => {
                    setShowMetaPreview(false);
                    await handleSyncFromMeta();
                  }}
                  disabled={syncing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {syncing ? '🔄 Syncing...' : '🔄 Sync All to DB'}
                </button>
                <button
                  onClick={() => setShowMetaPreview(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Message Modal */}
      {testingTemplate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setTestingTemplate(null)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Send Test Message: {testingTemplate}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (with country code, no +)
                </label>
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="919876543210"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: 919876543210 (India) or 14155551234 (US)
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSendTest(testingTemplate)}
                  disabled={sendingTest || !testPhone}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                >
                  {sendingTest ? 'Sending...' : 'Send Test'}
                </button>
                <button
                  onClick={() => {
                    setTestingTemplate(null);
                    setTestPhone('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Editor Modal */}
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
