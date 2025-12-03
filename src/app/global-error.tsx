'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center">
            {/* Error Icon */}
            <div className="mb-8 flex justify-center">
              <div className="w-32 h-32 bg-red-100 rounded-full flex items-center justify-center border-4 border-red-200">
                <AlertTriangle className="w-16 h-16 text-red-500" />
              </div>
            </div>

            {/* Error Message */}
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
              Critical Error
            </h1>
            
            <p className="text-gray-700 text-lg md:text-xl mb-8">
              Something went very wrong. Please try refreshing the page.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={reset}
                className="px-8 py-4 bg-green-600 text-white rounded-full font-medium hover:bg-green-700 transition-all"
              >
                Try Again
              </button>

              <Link
                href="/"
                className="px-8 py-4 bg-gray-100 text-gray-900 rounded-full font-medium hover:bg-gray-200 transition-all border-2 border-gray-300"
              >
                <Home className="w-5 h-5 inline mr-2" />
                Go Home
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
