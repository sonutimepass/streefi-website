// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888",
  
  // Optimize for production performance
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
  
  // Server-side specific integrations
  integrations: [
    // Console logging - only warnings and errors in production
    Sentry.consoleLoggingIntegration({ 
      levels: process.env.NODE_ENV === 'production' 
        ? ["warn", "error"] 
        : ["warn", "error"]
    }),
  ],
  
  // Enable logs
  enableLogs: true,
  
  // Disable debug mode to reduce console noise
  debug: false,
  
  // Set environment
  environment: process.env.NODE_ENV || 'production',
  
  // Add release info
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
  
  // Server-side error filtering
  beforeSend(event, hint) {
    // Filter out noise in production
    if (process.env.NODE_ENV === 'production') {
      // Don't send 404s as errors (they're expected)
      if (event.exception?.values?.[0]?.type === 'NotFoundError') {
        return null;
      }
    }
    
    return event;
  },
});