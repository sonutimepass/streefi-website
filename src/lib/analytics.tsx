'use client';
import Script from 'next/script';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || '';

// Google Analytics Component
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}

// Google Tag Manager Component
export function GoogleTagManager() {
  if (!GTM_ID) return null;

  return (
    <>
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `,
        }}
      />
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0"
          width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>
    </>
  );
}

// Combined Analytics Component
export function Analytics() {
  return (
    <>
      <GoogleAnalytics />
      <GoogleTagManager />
    </>
  );
}

// Event tracking helpers for GA4
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Common event trackers
export const analytics = {
  // Page view
  pageView: (url: string) => {
    trackEvent('page_view', {
      page_path: url,
    });
  },

  // Vendor interactions
  viewVendor: (vendorId: string, vendorName: string) => {
    trackEvent('view_vendor', {
      vendor_id: vendorId,
      vendor_name: vendorName,
    });
  },

  searchVendors: (searchTerm: string, resultsCount: number) => {
    trackEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount,
    });
  },

  // App download clicks
  downloadApp: (platform: 'android' | 'ios', location: string) => {
    trackEvent('download_app', {
      platform,
      location,
    });
  },

  // Contact/Support
  submitContactForm: (formType: string) => {
    trackEvent('submit_contact_form', {
      form_type: formType,
    });
  },

  // Vendor sign up
  vendorSignupStart: () => {
    trackEvent('vendor_signup_start');
  },

  vendorSignupComplete: (vendorId: string) => {
    trackEvent('vendor_signup_complete', {
      vendor_id: vendorId,
    });
  },

  // Offer views
  viewOffer: (offerId: string, offerName: string) => {
    trackEvent('view_offer', {
      offer_id: offerId,
      offer_name: offerName,
    });
  },

  // Social media clicks
  socialClick: (platform: string, location: string) => {
    trackEvent('social_click', {
      platform,
      location,
    });
  },
};

// Type declarations for gtag
declare global {
  interface Window {
    gtag?: (
      command: 'config' | 'event' | 'js',
      targetId: string | Date,
      config?: Record<string, any>
    ) => void;
    dataLayer?: any[];
  }
}
