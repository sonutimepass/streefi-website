// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888",
  
  // Edge runtime optimized settings - minimal tracing
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 0,
  
  // Disable debug mode
  debug: false,
  
  integrations: [
    // Minimal logging for edge runtime
    Sentry.consoleLoggingIntegration({ 
      levels: process.env.NODE_ENV === 'production' 
        ? ["error"] 
        : ["error"]
    }),
  ],
  
  // Enable logs
  enableLogs: true,
  
  // Set environment
  environment: process.env.NODE_ENV || 'production',
  
  // Add release info
  release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
});