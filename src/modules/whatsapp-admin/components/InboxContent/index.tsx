'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';

interface Conversation {
  phone: string;
  name?: string;
  lastMessage?: string;
  lastDirection?: 'inbound' | 'outbound';
  lastMessageTimestamp?: number;
  unreadCount?: number;
  updatedAt: number;
}

interface Message {
  messageId: string;
  direction: 'inbound' | 'outbound';
  content: string;
  messageType: string;
  timestamp: number;
  status: string;
  createdAt: string;
  deliveredAt?: number;
  readAt?: number;
}

export default function InboxContent() {
  const { logout } = useWhatsAppAdminContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConversations(true);
      setError(null);
      
      const response = await fetch('/api/conversations');
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to load conversations');
      }

      const data = await response.json();
      setConversations(data.conversations || []);
    } catch (err) {
      console.error('Error loading conversations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  // Load messages for selected conversation
  const loadMessages = useCallback(async (phone: string) => {
    try {
      setIsLoadingMessages(true);
      setError(null);

      const response = await fetch(`/api/conversations/${phone}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load messages');
      }

      const data = await response.json();
      setMessages(data.messages || []);

      // Mark conversation as read
      await fetch(`/api/conversations/${phone}/read`, { method: 'POST' });
      
      // Update unread count in local state
      setConversations(prev => 
        prev.map(conv => 
          conv.phone === phone ? { ...conv, unreadCount: 0 } : conv
        )
      );
    } catch (err) {
      console.error('Error loading messages:', err);
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // Send message
  const sendMessage = async () => {
    if (!selectedPhone || !messageInput.trim()) return;

    try {
      setIsSending(true);
      setError(null);

      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          message: messageInput.trim()
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || 'Failed to send message');
      }

      const data = await response.json();
      
      // Add message to local state immediately
      const newMessage: Message = {
        messageId: data.messageId,
        direction: 'outbound',
        content: messageInput.trim(),
        messageType: 'text',
        timestamp: data.timestamp,
        status: 'sent',
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [newMessage, ...prev]);
      setMessageInput('');

      // Update conversation list
      setConversations(prev => 
        prev.map(conv => 
          conv.phone === selectedPhone 
            ? { 
                ...conv, 
                lastMessage: messageInput.trim().substring(0, 100),
                lastDirection: 'outbound' as const,
                lastMessageTimestamp: data.timestamp,
                updatedAt: data.timestamp
              } 
            : conv
        ).sort((a, b) => b.updatedAt - a.updatedAt)
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  // Delete conversation
  const deleteConversation = async () => {
    if (!selectedPhone) return;

    try {
      setIsDeleting(true);
      setError(null);

      const response = await fetch(`/api/conversations/${selectedPhone}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete conversation');
      }

      // Remove from local state
      setConversations(prev => prev.filter(conv => conv.phone !== selectedPhone));
      setSelectedPhone(null);
      setMessages([]);
      setShowDeleteModal(false);
      
    } catch (err) {
      console.error('Error deleting conversation:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete conversation');
      setShowDeleteModal(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // Select conversation
  const selectConversation = (phone: string) => {
    setSelectedPhone(phone);
    loadMessages(phone);
  };

  // Initial load
  useEffect(() => {
    loadConversations();
    
    // Auto-refresh conversations every 10 seconds
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const selectedConvo = conversations.find(c => c.phone === selectedPhone);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-xl font-bold text-gray-900">💬 WhatsApp Inbox</h1>
              <p className="text-xs text-gray-600">Customer conversations</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadConversations}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                disabled={isLoadingConversations}
              >
                🔄 Refresh
              </button>
              <a
                href="/whatsapp-admin/dashboard"
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                ← Dashboard
              </a>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-md">
            <div className="flex items-center">
              <span className="text-red-800 text-sm">{error}</span>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          
          {/* Left Panel - Conversation List */}
          <div className="lg:col-span-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                Conversations ({conversations.length})
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoadingConversations ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-2"></div>
                  <p className="text-sm">Loading conversations...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-2">Messages will appear here when customers reply</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {conversations.map((conv) => (
                    <button
                      key={conv.phone}
                      onClick={() => selectConversation(conv.phone)}
                      className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                        selectedPhone === conv.phone ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-medium text-gray-900">
                          {conv.name || `+${conv.phone}`}
                        </span>
                        {(conv.unreadCount ?? 0) > 0 && (
                          <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <span className="mr-1">
                          {conv.lastDirection === 'outbound' ? '→' : '←'}
                        </span>
                        <span className="truncate flex-1">
                          {conv.lastMessage || 'No messages'}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        {conv.lastMessageTimestamp ? formatTime(conv.lastMessageTimestamp) : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Chat Window */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
            {!selectedPhone ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <p className="text-lg mb-2">👈 Select a conversation</p>
                  <p className="text-sm">Choose a customer to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {selectedConvo?.name || `+${selectedPhone}`}
                      </h3>
                      <p className="text-xs text-gray-600">{selectedPhone}</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md border border-red-200 transition-colors"
                      title="Delete conversation"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p className="text-sm">No messages yet</p>
                    </div>
                  ) : (
                    <div className="flex flex-col-reverse">
                      {messages.map((msg) => (
                        <div
                          key={`${msg.timestamp}-${msg.direction}-${msg.messageId}`}
                          className={`flex mb-4 ${
                            msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg px-4 py-2 ${
                              msg.direction === 'outbound'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                            <div
                              className={`text-xs mt-1 ${
                                msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-600'
                              }`}
                            >
                              {formatTime(msg.timestamp)}
                              {msg.direction === 'outbound' && (
                                <span className="ml-2">
                                  {msg.readAt ? '✓✓' : msg.deliveredAt ? '✓✓' : msg.status === 'sent' ? '✓' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={isSending || !messageInput.trim()}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      {isSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Tip: You can only send messages within 24 hours of customer's last message
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Delete Conversation
                </h3>
                <p className="text-sm text-gray-600 mb-1">
                  Are you sure you want to delete this conversation with{' '}
                  <strong>{selectedConvo?.name || `+${selectedPhone}`}</strong>?
                </p>
                <p className="text-sm text-red-600 font-medium">
                  This action cannot be undone. All messages will be permanently deleted.
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={deleteConversation}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Conversation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
