import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888",
  
  // Optimize sampling rates for production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

  // Set `tracePropagationTargets` to control for which URLs trace propagation should be enabled
  tracePropagationTargets: [
    "localhost", 
    /^https:\/\/streefi\.in\/api/,
    /^https:\/\/.*\.streefi\.in\/api/
  ],

  // Session Replay - optimized for production
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0,
  replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,

  // Disable debug mode to reduce console noise
  debug: false,
  
  integrations: [
    // Console logging integration - only warnings and errors in production
    Sentry.consoleLoggingIntegration({ 
      levels: process.env.NODE_ENV === 'production' 
        ? ["warn", "error"] 
        : ["log", "warn", "error"]
    }),
  ],
  
  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Improve performance by filtering out noisy transactions
  beforeSend(event, hint) {
    // Filter out known development/irrelevant errors
    if (process.env.NODE_ENV === 'development') {
      // Don't send HMR related errors
      if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
        return null;
      }
    }
    
    return event;
  },

  // Set environment
  environment: process.env.NODE_ENV || 'production',
  
  // Add release info if available
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
});