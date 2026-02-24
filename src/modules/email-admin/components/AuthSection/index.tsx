'use client';
import { useState } from 'react';
import { useEmailAdminContext } from '../../context/EmailAdminProvider';

export default function AuthSection() {
  const { login, error, clearError, isLoading } = useEmailAdminContext();
  const [passwordInput, setPasswordInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const result = await login(passwordInput);
    
    if (!result.success) {
      // Error is already set in context
      setPasswordInput(''); // Clear password on error
    } else {
      setPasswordInput(''); // Clear password on success
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-4">
      <div className="bg-white p-6 sm:p-8 md:p-10 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            📧 Email Admin
          </h1>
          <p className="text-sm text-gray-600">Enter your admin password to continue</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Password
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter admin password"
              disabled={isLoading}
              className="w-full px-4 py-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !passwordInput.trim()}
            className={`w-full py-3 text-sm sm:text-base font-semibold text-white rounded-md transition-colors duration-200 ${
              isLoading || !passwordInput.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Authenticating...' : 'Unlock Admin Panel'}
          </button>
        </form>

        <p className="mt-5 text-xs text-gray-500 text-center">
          Secure access for Streefi email management
        </p>
      </div>
    </div>
  );
}
