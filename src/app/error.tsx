'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { Home, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Send error to Sentry with additional context
    Sentry.captureException(error, {
      tags: {
        errorBoundary: 'app-error',
      },
      contexts: {
        errorInfo: {
          digest: error.digest,
        },
      },
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-[#06c167]/10 to-emerald-500/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-l from-[#ff6b35]/10 to-orange-500/5 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative z-10">
          {/* Error Icon */}
          <div className="mb-6 inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full">
            <svg
              className="w-10 h-10 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
            Oops! Something went wrong
          </h1>

          <p className="text-gray-700 text-lg md:text-xl mb-8 max-w-xl mx-auto">
            We encountered an unexpected error. Don't worry, our team has been notified and we're working on it!
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-8 py-4 bg-[#06c167] text-white rounded-full font-medium hover:bg-[#05a857] transition-all duration-300 shadow-md hover:shadow-lg group"
            >
              <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              Try Again
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gray-100 text-gray-900 rounded-full font-medium hover:bg-gray-200 transition-all duration-300 border-2 border-gray-300 hover:border-[#06c167] group"
            >
              <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Go Home
            </Link>
          </div>

          {/* Help Text */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-gray-600 mb-4">
              Need help? We're here for you!
            </p>
            <Link
              href="/policies/support"
              className="text-[#06c167] hover:text-[#05a857] font-medium underline"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
