import { withSentryConfig } from '@sentry/nextjs';
import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // Externalize problematic Node.js modules for Windows compatibility
  serverExternalPackages: ['@sentry/nextjs'],
  
  turbopack: {
    root: __dirname,
  },
  
  // Webpack configuration to handle node:inspector module
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize node:inspector to prevent Windows file path issues
      config.externals = [...(config.externals || []), 'node:inspector'];
    }
    return config;
  },
  images: {
    domains: [],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
  },
  // Redirects are disabled for static exports - configure these at hosting level (Amplify, Vercel, etc.)
  async redirects() {
  return [
    // WWW to non-WWW redirect (Production)
    {
      source: '/:path*',
      has: [{ type: 'host', value: 'www.streefi.in' }],
      destination: 'https://streefi.in/:path*',
      permanent: true,
    },
    
    // Trailing slash normalization - MUST be before other redirects
    {
      source: '/:path+/',
      destination: '/:path+',
      permanent: true,
    },

    // Home/Index redirects
    {
      source: '/home',
      destination: '/',
      permanent: true,
    },
    {
      source: '/index',
      destination: '/',
      permanent: true,
    },
    {
      source: '/index.html',
      destination: '/',
      permanent: true,
    },
    {
      source: '/index.php',
      destination: '/',
      permanent: true,
    },
    {
      source: '/default.html',
      destination: '/',
      permanent: true,
    },

    // QR Code redirects
    {
      source: '/qr-code',
      destination: '/qrcode',
      permanent: true,
    },
    // QR Code redirects
    {
      source: '/qr',
      destination: '/qrcode',
      permanent: true,
    },
    // Policy page redirects
    {
      source: '/policy',
      destination: '/policies/policy',
      permanent: true,
    },
    {
      source: '/policies',
      destination: '/policies/policy',
      permanent: true,
    },
    
    // Individual policy section redirects
    {
      source: '/privacy',
      destination: '/policies/policy#privacy',
      permanent: true,
    },
    {
      source: '/privacy-policy',
      destination: '/policies/policy#privacy',
      permanent: true,
    },
    {
      source: '/terms',
      destination: '/policies/policy#terms',
      permanent: true,
    },
    {
      source: '/terms-and-conditions',
      destination: '/policies/policy#terms',
      permanent: true,
    },
    {
      source: '/terms-of-service',
      destination: '/policies/policy#terms',
      permanent: true,
    },
    {
      source: '/tos',
      destination: '/policies/policy#terms',
      permanent: true,
    },
    {
      source: '/refund',
      destination: '/policies/policy#refund',
      permanent: true,
    },
    {
      source: '/refund-policy',
      destination: '/policies/policy#refund',
      permanent: true,
    },
    {
      source: '/returns',
      destination: '/policies/policy#refund',
      permanent: true,
    },
    {
      source: '/pricing',
      destination: '/policies/policy#pricing',
      permanent: true,
    },
    {
      source: '/cookies',
      destination: '/policies/policy#cookies',
      permanent: true,
    },
    {
      source: '/cookie-policy',
      destination: '/policies/policy#cookies',
      permanent: true,
    },
    {
      source: '/security',
      destination: '/policies/policy#security',
      permanent: true,
    },
    {
      source: '/customer',
      destination: '/policies/policy#customer',
      permanent: true,
    },
    {
      source: '/promotion',
      destination: '/policies/policy#promotion',
      permanent: true,
    },
    {
      source: '/promotions',
      destination: '/policies/policy#promotion',
      permanent: true,
    },
    {
      source: '/rating',
      destination: '/policies/policy#rating',
      permanent: true,
    },
    {
      source: '/ratings',
      destination: '/policies/policy#rating',
      permanent: true,
    },
    {
      source: '/wishlist',
      destination: '/policies/policy#wishlist',
      permanent: true,
    },
    {
      source: '/dinein',
      destination: '/policies/policy#dineinpolicy',
      permanent: true,
    },
    {
      source: '/dine-in',
      destination: '/policies/policy#dineinpolicy',
      permanent: true,
    },
    
    // Support redirects
    {
      source: '/help',
      destination: '/support',
      permanent: true,
    },
    {
      source: '/contact',
      destination: '/support',
      permanent: true,
    },
    {
      source: '/contact-us',
      destination: '/support',
      permanent: true,
    },
    {
      source: '/support-center',
      destination: '/support',
      permanent: true,
    },
    {
      source: '/customer-service',
      destination: '/support',
      permanent: true,
    },
    {
      source: '/faq',
      destination: '/support#FAQs',
      permanent: true,
    },
    {
      source: '/faqs',
      destination: '/support#FAQs',
      permanent: true,
    },
    
    // Legacy/incorrect routes
    {
      source: '/policies/support',
      destination: '/support',
      permanent: true,
    },
    {
      source: '/policy/support',
      destination: '/support',
      permanent: true,
    },
    
    // Vendor related redirects
    {
      source: '/vendors',
      destination: '/vendor',
      permanent: true,
    },
    {
      source: '/partner',
      destination: '/vendor',
      permanent: true,
    },
    {
      source: '/partners',
      destination: '/vendor',
      permanent: true,
    },
    {
      source: '/merchant',
      destination: '/vendor',
      permanent: true,
    },
    {
      source: '/merchants',
      destination: '/vendor',
      permanent: true,
    },
    {
      source: '/vendor-signup',
      destination: '/vendor',
      permanent: false,
    },
    {
      source: '/partner-with-us',
      destination: '/vendor',
      permanent: false,
    },
    
    // App download shortcuts
    {
      source: '/download',
      destination: '/qrcode',
      permanent: false,
    },
    {
      source: '/app',
      destination: '/qrcode',
      permanent: false,
    },
    {
      source: '/get-app',
      destination: '/qrcode',
      permanent: false,
    },
    {
      source: '/mobile',
      destination: '/qrcode',
      permanent: false,
    },
    {
      source: '/mobile-app',
      destination: '/qrcode',
      permanent: false,
    },
    
    // About redirects
    {
      source: '/about',
      destination: '/',
      permanent: true,
    },
    {
      source: '/about-us',
      destination: '/',
      permanent: true,
    },
    
    // Common CMS/Platform paths that should 404
    {
      source: '/wp-admin',
      destination: '/404',
      permanent: false,
    },
    {
      source: '/wp-login.php',
      destination: '/404',
      permanent: false,
    },
    {
      source: '/wp-login',
      destination: '/404',
      permanent: false,
    },
    {
      source: '/admin',
      destination: '/404',
      permanent: false,
    },
    {
      source: '/administrator',
      destination: '/404',
      permanent: false,
    },
    
    // Social media & external (using actual URLs from your codebase)
    {
      source: '/facebook',
      destination: 'https://facebook.com/streefi',
      permanent: false,
    },
    {
      source: '/instagram',
      destination: 'https://www.instagram.com/streefifoods?igsh=cjdyMHp6eTNxdGk5',
      permanent: false,
    },
    {
      source: '/linkedin',
      destination: 'https://www.linkedin.com/company/streefi/',
      permanent: false,
    },
    {
      source: '/twitter',
      destination: 'https://twitter.com/streefi',
      permanent: false,
    },
    
    // Additional common paths
    {
      source: '/legal',
      destination: '/policies/policy',
      permanent: true,
    },
    {
      source: '/disclaimer',
      destination: '/policies/policy',
      permanent: true,
    },
    
    // Careers/Jobs (redirect to home for now, update when page exists)
    {
      source: '/careers',
      destination: '/support',
      permanent: false,
    },
    {
      source: '/career',
      destination: '/support',
      permanent: false,
    },
    {
      source: '/jobs',
      destination: '/support',
      permanent: false,
    },
    
    // Order/Tracking (redirect to app download)
    {
      source: '/order',
      destination: '/#download',
      permanent: false,
    },
    {
      source: '/track',
      destination: '/#download',
      permanent: false,
    },
    {
      source: '/track-order',
      destination: '/#download',
      permanent: false,
    },
    
    // Business/Enterprise
    {
      source: '/business',
      destination: '/vendor',
      permanent: false,
    },
    {
      source: '/enterprise',
      destination: '/vendor',
      permanent: false,
    },
    {
      source: '/b2b',
      destination: '/vendor',
      permanent: false,
    },
  ];
  },
  // Headers are disabled for static exports - configure these at hosting level (Amplify, Vercel, etc.)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY' // Prevent clickjacking attacks
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(self)'
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups'
          },
          {
            key: 'Content-Security-Policy',
            value: process.env.NODE_ENV === 'production' 
              ? "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob: https://*.clarity.ms; media-src 'self' https://streefi-public-assets.s3.ap-south-1.amazonaws.com https://videos.streefi.in; connect-src 'self' https://www.google-analytics.com https://*.clarity.ms https://www.googletagmanager.com https://*.ingest.sentry.io https://*.sentry.io https://o4510702448803840.ingest.de.sentry.io; frame-src 'self' https://www.googletagmanager.com https://*.clarity.ms; worker-src 'self' blob:; object-src 'none'; base-uri 'self';"
              : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob: https://*.clarity.ms; media-src 'self' https://streefi-public-assets.s3.ap-south-1.amazonaws.com https://videos.streefi.in; connect-src 'self' https://www.google-analytics.com https://*.clarity.ms https://www.googletagmanager.com https://*.ingest.sentry.io https://*.sentry.io https://o4510702448803840.ingest.de.sentry.io; frame-src 'self' https://www.googletagmanager.com https://*.clarity.ms; worker-src 'self' blob:; object-src 'none'; base-uri 'self';"
          }
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "streefi-private-limited",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI/production builds
  silent: !process.env.CI && process.env.NODE_ENV !== 'production',

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Note: tunnelRoute disabled for static exports compatibility
  // tunnelRoute: "/monitoring", // Disabled - not compatible with static exports

  // Upload source maps to Sentry for better error tracking
  sourcemaps: {
    disable: true, // Temporarily disabled to fix build hanging issue
    deleteSourcemapsAfterUpload: true,
    // Only upload specific source maps, ignore all JS files without corresponding maps
    assets: ['**/*.js.map', '**/*.css.map'],
    ignore: [
      // Ignore Next.js internal manifest files
      '*_client-reference-manifest.js',
      'interception-route-rewrite-manifest.js',
      'middleware-build-manifest.js', 
      'next-font-manifest.js',
      'server-reference-manifest.js',
      // Ignore files without source maps to prevent warnings
      '**/chunks/**/*.js',
    ]
  },
});
