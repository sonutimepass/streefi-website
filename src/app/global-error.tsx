'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-white flex items-center justify-center px-6">
          <div className="max-w-2xl w-full text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Something went wrong!
            </h1>
            <p className="text-gray-700 text-lg mb-8">
              Our team has been notified. Please try again.
            </p>
            <button
              onClick={reset}
              className="px-8 py-4 bg-[#06c167] text-white rounded-full font-medium hover:bg-[#05a857] transition-all"
            >
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
