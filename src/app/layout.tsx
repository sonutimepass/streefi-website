import type { Metadata, Viewport } from "next";
import { Ubuntu } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import ConditionalFloatingButton from "@/components/common/ConditionalFloatingButton";
import ParticleBackground from "@/components/common/ParticleBackground";

const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ubuntu",
});

export const viewport: Viewport = {
  themeColor: "#06C167",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://streefi.in'),
  title: {
    default: "Streefi - Find Best Street Food Near You | Verified Vendors & Offers",
    template: "%s | Streefi"
  },
  description: "Find local street food vendors in Gandhinagar & Ahmedabad using Streefi. Discover verified food heroes, read reviews, and get exclusive dine-in offers on the app.",
  keywords: "street food near me, street food Gandhinagar, street food Ahmedabad, local food vendors, street food app, verified street food vendors, best street food in Gandhinagar, best street food in Ahmedabad, dine in restaurants near me, food offers near me, chaat, vada pav, momos, samosa, dosa, food heroes, support local vendors, food delivery app, authentic street food, Indian street food, street food discovery, food truck finder, local cuisine, traditional food, hawker food, local food culture, street eats",
  authors: [{ name: "Streefi Team" }],
  creator: "Streefi",
  publisher: "Streefi",
  formatDetection: {
    telephone: false,
  },
  verification: {
    google: "x47UvMbVX8CCcAYdDvw5YnglwYhM1HPOeCaU-AtVSFo",
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/assets/streefi-logo.ico", type: "image/x-icon" },
      { url: "/assets/streefi-logo-72.svg", sizes: "72x72", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-96.svg", sizes: "96x96", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-128.svg", sizes: "128x128", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-144.svg", sizes: "144x144", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-152.svg", sizes: "152x152", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-384.svg", sizes: "384x384", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/assets/streefi-logo-152.svg", sizes: "152x152", type: "image/svg+xml" },
      { url: "/assets/streefi-logo-192.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
    shortcut: "/assets/streefi-logo.ico",
  },
  openGraph: {
    siteName: "Streefi - Street Food Discovery",
    title: "Streefi - Find Best Street Food Near You",
    description: "Find local street food vendors, reviews, and dine-in offers with Streefi. Download the app to explore India's best street food culture.",
    url: "https://streefi.in/",
    type: "website",
    locale: "en_IN",
    images: [
      {
        url: "/assets/streefi-logo.png",
        width: 1200,
        height: 630,
        alt: "Streefi - Discover authentic street food vendors and support local food heroes",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@streefifoods",
    creator: "@streefifoods",
    title: "Streefi - Find Best Street Food Near You",
    description: "Find local street food vendors, reviews, and dine-in offers with Streefi. Download the app to explore India's best street food culture.",
    images: ["/assets/streefi-logo.png"],
  },
  alternates: {
    canonical: "https://streefi.in/",
    languages: {
      "en": "https://streefi.in/",
      "en-IN": "https://streefi.in/",
      "hi": "https://streefi.in/hi/",
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  other: {
    "msapplication-TileColor": "#06C167",
    "msapplication-navbutton-color": "#06C167",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "language": "en-IN",
    "geo.region": "IN",
    "geo.placename": "India",
    "revisit-after": "7 days",
    "distribution": "global",
    "rating": "general",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <head>
        {/* Google Tag Manager */}
        <Script id="google-tag-manager" strategy="beforeInteractive">
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-5ZFVTDQV');
          `}
        </Script>

        {/* Microsoft Clarity */}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "uh6jomdw1m");
          `}
        </Script>

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.clarity.ms" />
        <link rel="dns-prefetch" href="https://www.clarity.ms" />

        {/* Preload critical assets */}
        <link rel="preload" href="/assets/streefi-logo-192.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/assets/qwerty.png" as="image" />

        {/* Structured Data */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://streefi.in/#organization",
                  "name": "Streefi",
                  "alternateName": "Streefi Foods",
                  "url": "https://streefi.in",
                  "logo": {
                    "@type": "ImageObject",
                    "@id": "https://streefi.in/#logo",
                    "url": "https://streefi.in/assets/streefi-logo.ico",
                    "contentUrl": "https://streefi.in/assets/streefi-logo.ico",
                    "width": 512,
                    "height": 512,
                    "caption": "Streefi Logo"
                  },
                  "image": { "@id": "https://streefi.in/#logo" },
                  "description": "Streefi connects food lovers with authentic local street food vendors, supporting food heroes in communities across India.",
                  "foundingDate": "2024",
                  "founders": { "@type": "Person", "name": "Streefi Team" },
                  "contactPoint": {
                    "@type": "ContactPoint",
                    "telephone": "+91-7777933650",
                    "contactType": "Customer Support",
                    "email": "support@streefi.in",
                    "availableLanguage": ["English", "Hindi"]
                  },
                  "sameAs": [
                    "https://www.instagram.com/streefifoods",
                    "https://www.linkedin.com/company/streefi/",
                    "https://play.google.com/store/apps/details?id=com.streefi.customer",
                    "https://apps.apple.com/in/app/streefi/id6747432924"
                  ]
                },
                {
                  "@type": "LocalBusiness",
                  "@id": "https://streefi.in/#business",
                  "name": "Streefi",
                  "image": "https://streefi.in/assets/streefi-logo.ico",
                  "description": "Discover authentic street food vendors near you with Streefi. Support local food heroes and enjoy exclusive dine-in offers on traditional Indian street food.",
                  "url": "https://streefi.in",
                  "telephone": "+91-7777933650",
                  "email": "support@streefi.in",
                  "priceRange": "Free",
                  "currenciesAccepted": "INR",
                  "paymentAccepted": "Cash, UPI, Digital Payments",
                  "address": { "@type": "PostalAddress", "addressCountry": "IN", "addressRegion": "India" },
                  "geo": { "@type": "GeoCoordinates", "latitude": "20.5937", "longitude": "78.9629" },
                  "areaServed": { "@type": "Country", "name": "India" },
                  "serviceType": "Street Food Discovery Platform"
                }
              ]
            })
          }}
        />

        {/* WebSite Schema with SearchAction */}
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "url": "https://streefi.in/",
              "name": "Streefi",
              "description": "Discover authentic street food vendors near you",
              "potentialAction": {
                "@type": "SearchAction",
                "target": {
                  "@type": "EntryPoint",
                  "urlTemplate": "https://streefi.in/search?q={search_term_string}"
                },
                "query-input": "required name=search_term_string"
              },
              "inLanguage": ["en-IN", "hi-IN"]
            })
          }}
        />
      </head>
      <body className={`${ubuntu.variable} font-sans bg-[#fffdf9]`}>
        {/* Google Tag Manager (noscript) */}
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-5ZFVTDQV"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>

        {children}
        <ConditionalFloatingButton />

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-23ZXPRW9QQ"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-23ZXPRW9QQ');
          `}
        </Script>
      </body>
    </html>
  );
}
