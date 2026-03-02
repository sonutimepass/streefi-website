/**
 * Campaign Creation Modal - Production Grade
 * 
 * Full-featured form for creating WhatsApp campaigns with:
 * - Campaign name
 * - Template selection
 * - Recipient list upload
 * - Daily hard cap
 * - Advanced settings (batch size, send delay)
 */

'use client';

import { useState, useEffect } from 'react';

interface Template {
  templateId: string;
  name: string;
  category: string;
  metaStatus: string;
  status: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CampaignCreationModal({ isOpen, onClose, onCreated }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Form state
  const [campaignName, setCampaignName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [dailyCap, setDailyCap] = useState('1000');
  const [batchSize, setBatchSize] = useState('25');
  const [sendDelay, setSendDelay] = useState('50');

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/whatsapp-admin/templates');
      const data = await response.json();
      
      // Only show approved, active templates
      const availableTemplates = (data.templates || []).filter(
        (t: Template) => t.status === 'active' && t.metaStatus === 'APPROVED'
      );
      
      setTemplates(availableTemplates);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setRecipientFile(file);
      setError(null);
    }
  };

  const handleCreate = async () => {
    console.log('🎬 [Campaign Creation Modal] Starting campaign creation...');
    console.log('📝 [Campaign Creation Modal] Form data:', { campaignName, selectedTemplate, fileName: recipientFile?.name, dailyCap });
    
    // Validation
    if (!campaignName.trim()) {
      setError('Campaign name is required');
      return;
    }

    if (!selectedTemplate) {
      setError('Please select a template');
      return;
    }

    if (!recipientFile) {
      setError('Please upload a recipient list (CSV)');
      return;
    }

    const dailyCapNum = parseInt(dailyCap);
    if (isNaN(dailyCapNum) || dailyCapNum < 1) {
      setError('Daily cap must be at least 1');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Read and parse CSV file
      console.log('📄 [Campaign Creation Modal] Reading CSV file...');
      const fileContent = await recipientFile.text();
      const lines = fileContent.split('\n').filter(line => line.trim());
      console.log(`📊 [Campaign Creation Modal] CSV contains ${lines.length} lines`);
      
      // Extract phone numbers (assume first column or only column)
      const phones: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (i === 0 && (line.toLowerCase().includes('phone') || line.toLowerCase().includes('number'))) {
          continue; // Skip header
        }
        
        const phone = line.split(',')[0].trim();
        if (phone && /^\d{10,15}$/.test(phone)) {
          phones.push(phone);
        }
      }

      console.log(`📱 [Campaign Creation Modal] Extracted ${phones.length} valid phone numbers`);
      
      if (phones.length === 0) {
        console.error('❌ [Campaign Creation Modal] No valid phone numbers found');
        setError('No valid phone numbers found in CSV. Phone numbers must be 10-15 digits.');
        setCreating(false);
        return;
      }

      // Create campaign
      console.log('🚀 [Campaign Creation Modal] Sending API request...');
      const response = await fetch('/api/campaigns/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName: campaignName.trim(),
          templateName: selectedTemplate,
          recipients: phones,
          dailyCap: dailyCapNum
        })
      });

      const data = await response.json();
      console.log('📥 [Campaign Creation Modal] API response:', data);

      if (!response.ok) {
        console.error('❌ [Campaign Creation Modal] API error:', data.error);
        throw new Error(data.error || 'Failed to create campaign');
      }

      // Success
      console.log('✅ [Campaign Creation Modal] Campaign created successfully:', data.campaignId);
      onCreated();
      handleClose();
    } catch (err) {
      console.error('Campaign creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setCampaignName('');
    setSelectedTemplate('');
    setRecipientFile(null);
    setDailyCap('1000');
    setBatchSize('25');
    setSendDelay('50');
    setShowAdvanced(false);
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Campaign</h2>
              <p className="text-sm text-gray-600 mt-1">Set up a new WhatsApp campaign</p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-6">
            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Campaign Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Diwali Promotion 2026"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={creating}
              />
            </div>

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Template <span className="text-red-600">*</span>
              </label>
              {loading ? (
                <div className="text-sm text-gray-500">Loading templates...</div>
              ) : templates.length === 0 ? (
                <div className="text-sm text-red-600">
                  No approved templates available. Please create and approve a template first.
                </div>
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  disabled={creating}
                >
                  <option value="">Select a template...</option>
                  {templates.map((t) => (
                    <option key={t.templateId} value={t.name}>
                      {t.name} ({t.category})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Only approved templates are shown
              </p>
            </div>

            {/* Recipient List Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient List (CSV) <span className="text-red-600">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="recipient-upload"
                  disabled={creating}
                />
                <label
                  htmlFor="recipient-upload"
                  className="cursor-pointer inline-flex flex-col items-center"
                >
                  {recipientFile ? (
                    <>
                      <svg className="h-12 w-12 text-green-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">{recipientFile.name}</span>
                      <span className="text-xs text-gray-500 mt-1">Click to change file</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-sm font-medium text-gray-900">Upload CSV file</span>
                      <span className="text-xs text-gray-500 mt-1">Click or drag and drop</span>
                    </>
                  )}
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                CSV format: One phone number per line (10-15 digits, no + or spaces)
                <br />
                Example: 919876543210
              </p>
            </div>

            {/* Daily Cap */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Message Limit <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={dailyCap}
                onChange={(e) => setDailyCap(e.target.value)}
                min="1"
                max="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                disabled={creating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum messages to send per day (Meta enforces daily conversation limits)
              </p>
            </div>

            {/* Advanced Settings */}
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
              >
                <svg className={`h-4 w-4 mr-1 transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced Settings (Optional)
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Batch Size
                      </label>
                      <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(e.target.value)}
                        min="1"
                        max="100"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={creating}
                      />
                      <p className="text-xs text-gray-500 mt-1">Messages per batch (default: 25)</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Send Delay (ms)
                      </label>
                      <input
                        type="number"
                        value={sendDelay}
                        onChange={(e) => setSendDelay(e.target.value)}
                        min="10"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={creating}
                      />
                      <p className="text-xs text-gray-500 mt-1">Delay between messages (default: 50ms)</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs text-blue-800">
                      ⚠️ Only modify these if you understand rate limiting. Default values are safe for Meta's API.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📋 Next Steps:</strong><br />
                1. Campaign will be created in DRAFT status<br />
                2. Review settings in Campaign Manager<br />
                3. Click "Start" to begin sending<br />
                4. Monitor progress in real-time
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={creating}
              className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !campaignName || !selectedTemplate || !recipientFile}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? '⏳ Creating...' : '✨ Create Campaign'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
