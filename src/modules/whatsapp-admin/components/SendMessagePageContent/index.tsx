'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';
import EmergencyKillSwitch from '../EmergencyKillSwitch';
import GlobalSendingStateIndicator from '../GlobalSendingStateIndicator';

interface WhatsAppTemplate {
  templateId: string;
  name: string;
  category: string;
  language: string;
  status: string;
  metaStatus: string;
  variables?: string[];
}

export default function SendMessagePageContent() {
  const router = useRouter();
  const { logout } = useWhatsAppAdminContext();
  
  // Single send state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  
  // Bulk send state
  const [bulkPhones, setBulkPhones] = useState('');
  
  // UI state
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'bulk'>('single');

  // Fetch templates on mount
  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      setMessage(null); // Clear any previous messages
      
      const res = await fetch('/api/whatsapp-admin/templates');
      
      // Handle specific HTTP status codes
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (res.status === 403) {
          throw new Error('Access denied. You do not have permission to view templates.');
        } else if (res.status === 404) {
          throw new Error('Templates API endpoint not found. Please check your configuration.');
        } else if (res.status === 500) {
          throw new Error('Server error while fetching templates. Please try again later.');
        } else if (res.status >= 500) {
          throw new Error('WhatsApp service temporarily unavailable. Please try again in a few minutes.');
        } else {
          // Try to get error message from response
          try {
            const errorData = await res.json();
            throw new Error(errorData.error || `Failed to fetch templates (Status: ${res.status})`);
          } catch {
            throw new Error(`Failed to fetch templates (Status: ${res.status})`);
          }
        }
      }
      
      const data = await res.json();
      
      // Filter only active and approved templates
      const activeTemplates = data.templates?.filter(
        (t: WhatsAppTemplate) => t.status === 'active' && t.metaStatus === 'APPROVED'
      ) || [];
      
      if (activeTemplates.length === 0) {
        setMessage({ 
          type: 'error', 
          text: '⚠️ No approved templates found. Please go to Templates page and sync from Meta first.' 
        });
      }
      
      setTemplates(activeTemplates);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      
      // Network or timeout errors
      if (error.message.includes('fetch') || error.name === 'TypeError') {
        setMessage({ 
          type: 'error', 
          text: '❌ Network error: Unable to connect to server. Please check your internet connection and try again.' 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `❌ ${error.message || 'Failed to load templates. Please refresh the page or contact support.'}` 
        });
      }
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleSingleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!phoneNumber || !selectedTemplate) {
      setMessage({ type: 'error', text: '❌ Please fill in all required fields' });
      return;
    }

    // Validate phone number format (must be digits only, 10-15 chars)
    const cleanPhone = phoneNumber.trim();
    if (!/^\d{10,15}$/.test(cleanPhone)) {
      setMessage({ 
        type: 'error', 
        text: '❌ Invalid phone number. Use international format without + (e.g., 919876543210)' 
      });
      return;
    }

    // Validate variables if template requires them
    const template = templates.find(t => t.name === selectedTemplate);
    if (template?.variables && template.variables.length > 0) {
      const filledVars = variables.filter(v => v.trim() !== '');
      if (filledVars.length !== template.variables.length) {
        setMessage({ 
          type: 'error', 
          text: `❌ Please fill in all ${template.variables.length} template variable(s)` 
        });
        return;
      }
    }

    try {
      setLoading(true);
      setMessage(null);

      const res = await fetch('/api/whatsapp-admin/send-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: selectedTemplate,
          recipient: cleanPhone,
          variables: variables.filter(v => v.trim() !== ''),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific HTTP status codes with helpful messages
        if (res.status === 401) {
          throw new Error('🔒 Session expired. Please log in again.');
        } else if (res.status === 403) {
          // Handle kill switch or access denied
          if (data.killSwitch?.enabled) {
            throw new Error(`🚨 KILL SWITCH ACTIVE: ${data.killSwitch.reason || 'System disabled'}. Contact admin to re-enable sending.`);
          }
          throw new Error('🚫 Access denied. You do not have permission to send messages.');
        } else if (res.status === 404) {
          throw new Error(`❌ Template "${selectedTemplate}" not found in system. Please sync templates.`);
        } else if (res.status === 429) {
          throw new Error('⏸️ Rate limit exceeded. Please wait 1 minute and try again.');
        } else if (res.status >= 500) {
          throw new Error('🔧 WhatsApp service temporarily unavailable. Please try again in a few minutes.');
        } else {
          throw new Error(data.error || 'Failed to send message. Please try again.');
        }
      }

      setMessage({ 
        type: 'success', 
        text: `✅ Message sent successfully to ${cleanPhone}!\nMessage ID: ${data.data?.messageId || 'N/A'}` 
      });
      
      // Clear form on success
      setPhoneNumber('');
      setVariables([]);
    } catch (error: any) {
      console.error('Send error:', error);
      
      // Network errors
      if (error.message.includes('fetch') || error.name === 'TypeError' || error.message.includes('NetworkError')) {
        setMessage({ 
          type: 'error', 
          text: '🌐 Network error: Unable to connect to server. Please check your internet connection and try again.' 
        });
      } else {
        setMessage({ type: 'error', text: error.message || '❌ Failed to send message. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bulkPhones || !selectedTemplate) {
      setMessage({ type: 'error', text: '❌ Please provide phone numbers and select a template' });
      return;
    }

    // Parse and validate phone numbers
    const phones = bulkPhones
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    if (phones.length === 0) {
      setMessage({ type: 'error', text: '❌ No valid phone numbers found' });
      return;
    }

    // Validate all phone numbers before sending
    const invalidPhones = phones.filter(phone => !/^\d{10,15}$/.test(phone));
    if (invalidPhones.length > 0) {
      setMessage({ 
        type: 'error', 
        text: `❌ Invalid phone number format detected: ${invalidPhones[0]}. All numbers must be digits only (10-15 chars).` 
      });
      return;
    }

    // Validate variables if template requires them
    const template = templates.find(t => t.name === selectedTemplate);
    if (template?.variables && template.variables.length > 0) {
      const filledVars = variables.filter(v => v.trim() !== '');
      if (filledVars.length !== template.variables.length) {
        setMessage({ 
          type: 'error', 
          text: `❌ Please fill in all ${template.variables.length} template variable(s)` 
        });
        return;
      }
    }

    // Confirmation for bulk send
    const confirmed = window.confirm(
      `📤 Send to ${phones.length} recipient(s)?\n\nTemplate: ${selectedTemplate}\nThis action cannot be undone.`
    );
    
    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);
      setMessage({ type: 'success', text: `📤 Sending to ${phones.length} recipients... Please wait.` });

      let successCount = 0;
      let failCount = 0;
      const failedNumbers: string[] = [];

      for (let i = 0; i < phones.length; i++) {
        const phone = phones[i];
        
        // Update progress
        setMessage({ 
          type: 'success', 
          text: `📤 Progress: ${i + 1}/${phones.length} - Sending to ${phone}...` 
        });

        try {
          const res = await fetch('/api/whatsapp-admin/send-template', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              templateName: selectedTemplate,
              recipient: phone,
              variables: variables.filter(v => v.trim() !== ''),
            }),
          });

          if (res.ok) {
            successCount++;
          } else {
            const data = await res.json();
            failCount++;
            
            // Create a user-friendly error message
            let errorMsg = 'Unknown error';
            if (res.status === 403 && data.killSwitch?.enabled) {
              errorMsg = 'Kill switch enabled';
            } else if (res.status === 404) {
              errorMsg = 'Template not found';
            } else if (res.status === 429) {
              errorMsg = 'Rate limit';
            } else if (res.status >= 500) {
              errorMsg = 'Service error';
            } else {
              errorMsg = data.error?.substring(0, 30) || 'Send failed';
            }
            
            failedNumbers.push(`${phone} (${errorMsg})`);
          }

          // Delay to avoid rate limiting (1 message per second)
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (err) {
          failCount++;
          failedNumbers.push(`${phone} (Network error)`);
        }
      }

      // Final result
      let resultText = `✅ Bulk send completed!\n\n✅ Success: ${successCount}\n❌ Failed: ${failCount}`;
      
      if (failedNumbers.length > 0 && failedNumbers.length <= 5) {
        resultText += `\n\nFailed numbers:\n${failedNumbers.join('\n')}`;
      }

      setMessage({ 
        type: successCount > 0 ? 'success' : 'error', 
        text: resultText
      });
      
      // Clear form only if all succeeded
      if (failCount === 0) {
        setBulkPhones('');
        setVariables([]);
      }
    } catch (error: any) {
      console.error('Bulk send error:', error);
      setMessage({ type: 'error', text: error.message || '❌ Bulk send failed' });
    } finally {
      setLoading(false);
    }
  };

  // Update variables array when template changes
  useEffect(() => {
    const template = templates.find(t => t.name === selectedTemplate);
    if (template?.variables) {
      setVariables(new Array(template.variables.length).fill(''));
    } else {
      setVariables([]);
    }
  }, [selectedTemplate, templates]);

  const selectedTemplateData = templates.find(t => t.name === selectedTemplate);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/whatsapp-admin/dashboard')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                aria-label="Back to dashboard"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="flex-1">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Send Message</h1>
                <p className="text-xs text-gray-600 hidden sm:block">Send template messages without campaigns</p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <GlobalSendingStateIndicator />
              <EmergencyKillSwitch />
              <button
                onClick={logout}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6 rounded-r-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700 font-medium mb-2">Production Ready - Real User Sends</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Only sends <strong>APPROVED</strong> templates from Meta</li>
                <li>Perfect for initial testing with friends & small user groups (1-20 people)</li>
                <li>Rate limited: 1 message per second for bulk sends</li>
                <li>For 50+ users, switch to Campaigns for better tracking</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`p-4 rounded-lg mb-6 whitespace-pre-line ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Tab Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'single'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📱 Single Send
            </button>
            <button
              onClick={() => setActiveTab('bulk')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'bulk'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              📋 Bulk Send
            </button>
          </div>

          {/* Single Send Form */}
          {activeTab === 'single' && (
            <form onSubmit={handleSingleSend} className="p-6">
              <div className="space-y-5">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template *
                  </label>
                  {loadingTemplates ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">No Templates Available</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>No approved templates found. Please:</p>
                            <ol className="list-decimal list-inside mt-1 space-y-1">
                              <li>Go to <strong>Templates</strong> page</li>
                              <li>Click <strong>"Sync Templates from Meta"</strong></li>
                              <li>Wait for templates to sync</li>
                              <li>Return here and refresh</li>
                            </ol>
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => router.push('/whatsapp-admin/templates')}
                              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                            >
                              Go to Templates →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Choose a template --</option>
                      {templates.map((template) => (
                        <option key={template.templateId} value={template.name}>
                          {template.name} ({template.language})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Template Info Preview */}
                {selectedTemplateData && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-gray-900">Template: {selectedTemplateData.name}</h4>
                        <div className="mt-1 text-xs text-gray-600 space-y-1">
                          <p><strong>Status:</strong> <span className="text-green-600 font-semibold">{selectedTemplateData.metaStatus}</span></p>
                          <p><strong>Language:</strong> {selectedTemplateData.language}</p>
                          <p><strong>Category:</strong> {selectedTemplateData.category}</p>
                          {selectedTemplateData.variables && selectedTemplateData.variables.length > 0 && (
                            <p><strong>Variables required:</strong> {selectedTemplateData.variables.length}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="919876543210"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                    required
                    maxLength={15}
                  />
                  <div className="mt-2 text-xs text-gray-600">
                    <p className="font-medium mb-1">📝 Format: Country Code + Phone Number (no spaces, no +)</p>
                    <div className="pl-4 space-y-1">
                      <p>• India: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">919876543210</span></p>
                      <p>• USA: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">14155551234</span></p>
                      <p>• UK: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">447911123456</span></p>
                    </div>
                  </div>
                  {phoneNumber && !/^\d{10,15}$/.test(phoneNumber) && (
                    <p className="mt-1 text-xs text-red-600">
                      ⚠️ Must be 10-15 digits only
                    </p>
                  )}
                </div>

                {/* Variables */}
                {selectedTemplateData?.variables && selectedTemplateData.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Variables * ({selectedTemplateData.variables.length} required)
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                      Fill in all variables. These will replace placeholders in your template.
                    </p>
                    <div className="space-y-3">
                      {selectedTemplateData.variables.map((varName, index) => (
                        <div key={index}>
                          <input
                            type="text"
                            value={variables[index] || ''}
                            onChange={(e) => {
                              const newVars = [...variables];
                              newVars[index] = e.target.value;
                              setVariables(newVars);
                            }}
                            placeholder={`Enter value for ${varName}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Variable {index + 1}: {varName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || templates.length === 0}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    loading || templates.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Sending...' : '📤 Send Message'}
                </button>
              </div>
            </form>
          )}

          {/* Bulk Send Form */}
          {activeTab === 'bulk' && (
            <form onSubmit={handleBulkSend} className="p-6">
              <div className="space-y-5">
                {/* Template Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Template *
                  </label>
                  {loadingTemplates ? (
                    <div className="flex items-center text-sm text-gray-500">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading templates...
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">No Templates Available</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>No approved templates found. Please:</p>
                            <ol className="list-decimal list-inside mt-1 space-y-1">
                              <li>Go to <strong>Templates</strong> page</li>
                              <li>Click <strong>"Sync Templates from Meta"</strong></li>
                              <li>Wait for templates to sync</li>
                              <li>Return here and refresh</li>
                            </ol>
                          </div>
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() => router.push('/whatsapp-admin/templates')}
                              className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                            >
                              Go to Templates →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">-- Choose a template --</option>
                      {templates.map((template) => (
                        <option key={template.templateId} value={template.name}>
                          {template.name} ({template.language})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Template Info Preview for Bulk */}
                {selectedTemplateData && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="ml-3 flex-1">
                        <h4 className="text-sm font-medium text-gray-900">Template: {selectedTemplateData.name}</h4>
                        <div className="mt-1 text-xs text-gray-600 space-y-1">
                          <p><strong>Status:</strong> <span className="text-green-600 font-semibold">{selectedTemplateData.metaStatus}</span></p>
                          <p><strong>Language:</strong> {selectedTemplateData.language}</p>
                          {selectedTemplateData.variables && selectedTemplateData.variables.length > 0 && (
                            <p><strong>Variables required:</strong> {selectedTemplateData.variables.length}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Phone Numbers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Numbers (one per line) *
                  </label>
                  <textarea
                    value={bulkPhones}
                    onChange={(e) => setBulkPhones(e.target.value)}
                    placeholder="919876543210&#10;919876543211&#10;919876543212&#10;14155551234"
                    rows={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    required
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className={`font-medium ${
                      bulkPhones.split('\n').filter(p => p.trim()).length > 0 
                        ? 'text-green-600' 
                        : 'text-gray-500'
                    }`}>
                      📊 {bulkPhones.split('\n').filter(p => p.trim()).length} phone numbers detected
                    </span>
                    <span className="text-gray-500">
                      Est. time: ~{bulkPhones.split('\n').filter(p => p.trim()).length} seconds
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-gray-600">
                    Each number must be in format: Country code + number (no +), one per line
                  </p>
                </div>

                {/* Variables for Bulk */}
                {selectedTemplateData?.variables && selectedTemplateData.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Variables * (same for all recipients)
                    </label>
                    <p className="text-xs text-gray-600 mb-3">
                      These values will be used for all recipients in the bulk send.
                    </p>
                    <div className="space-y-3">
                      {selectedTemplateData.variables.map((varName, index) => (
                        <div key={index}>
                          <input
                            type="text"
                            value={variables[index] || ''}
                            onChange={(e) => {
                              const newVars = [...variables];
                              newVars[index] = e.target.value;
                              setVariables(newVars);
                            }}
                            placeholder={`Enter value for ${varName}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Variable {index + 1}: {varName}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info & Warning */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-r-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-yellow-800 mb-1">Bulk Send Information</h4>
                      <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                        <li><strong>Rate:</strong> 1 message per second (to prevent Meta rate limits)</li>
                        <li><strong>Recommended:</strong> Best for 1-20 users</li>
                        <li><strong>For 50+ users:</strong> Use Campaigns section instead</li>
                        <li>You'll see a confirmation dialog before sending</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || templates.length === 0}
                  className={`w-full py-3 px-4 rounded-lg font-medium text-white transition-colors ${
                    loading || templates.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading ? 'Sending...' : '📤 Send to All'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Quick Links & Production Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Links</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => router.push('/whatsapp-admin/templates')}
                className="px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                📋 Manage Templates
              </button>
              <button
                onClick={() => router.push('/whatsapp-admin/campaigns')}
                className="px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                🚀 View Campaigns
              </button>
              <button
                onClick={() => router.push('/whatsapp-admin/settings')}
                className="px-4 py-2 text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>

          {/* Production Checklist */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-sm border border-green-200 p-6">
            <h3 className="text-sm font-medium text-green-900 mb-3">✅ Before Sending to Real Users</h3>
            <ul className="text-xs text-green-800 space-y-2">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Templates are <strong>APPROVED</strong> by Meta</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Test sent to your own number successfully</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Users have opted-in to receive messages</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Phone numbers in correct format (country code + number)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Variables filled correctly (if template has any)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Kill switch is OFF in header</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
