import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    domains: [],
    unoptimized: false,
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    qualities: [75, 90],
  },
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
      destination: '/#download',
      permanent: false,
    },
    {
      source: '/app',
      destination: '/#download',
      permanent: false,
    },
    {
      source: '/get-app',
      destination: '/#download',
      permanent: false,
    },
    {
      source: '/mobile',
      destination: '/#download',
      permanent: false,
    },
    {
      source: '/mobile-app',
      destination: '/#download',
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
      destination: '/',
      permanent: false,
    },
    {
      source: '/jobs',
      destination: '/',
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
            value: 'SAMEORIGIN'
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' https://streefi-public-assets.s3.ap-south-1.amazonaws.com; connect-src 'self' https://www.google-analytics.com https://*.clarity.ms https://www.googletagmanager.com; frame-src 'self' https://www.googletagmanager.com; object-src 'none'; base-uri 'self';"
          }
        ],
      },
    ];
  },
  compress: true,
  poweredByHeader: false,
}

export default nextConfig;
