'use client';

import { useState } from 'react';
import { useWhatsAppAdminContext } from '../../context/WhatsAppAdminProvider';

export default function AuthSection() {
  const { login, error, clearError, isLoading } = useWhatsAppAdminContext();
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const result = await login(emailInput, passwordInput);
    
    if (!result.success) {
      setPasswordInput('');
    } else {
      setEmailInput('');
      setPasswordInput('');
    }
  };

  const isDisabled = isLoading || !emailInput.trim() || !passwordInput.trim();

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            WhatsApp Admin
          </h1>
          <p className="text-sm text-gray-600">Sign in with your admin credentials</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="admin@streefi.in"
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter your password"
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              autoComplete="current-password"
            />
          </div>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isDisabled}
            className={`w-full py-3 text-sm sm:text-base font-semibold text-white rounded-md transition-colors duration-200 ${
              isDisabled
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-500 hover:bg-green-600'
            }`}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">Powered by Streefi</p>
        </div>
      </div>
    </div>
  );
}

