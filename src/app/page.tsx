'use client';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/header/Header';
import MobileHeader from '@/components/layout/header/MobileHeader';
import HeroSection from '@/components/home/HeroSection';
import { JsonLd } from '@/components/seo/JsonLd';
import { FAQPage, MobileApplication } from 'schema-dts';

// Lazy load below-the-fold components

const TrustSection = dynamic(() => import('@/components/home/TrustSection'), {
  loading: () => <div className="min-h-[400px]" />
});
const FeaturesSection = dynamic(() => import('@/components/home/FeaturesSection'), {
  loading: () => <div className="min-h-[600px]" />
});
const VendorSuccessSection = dynamic(() => import('@/components/home/VendorSuccessSection'), {
  loading: () => <div className="min-h-[500px]" />
});
const Footer = dynamic(() => import('@/components/layout/footer/Footer'));
const MobileFooter = dynamic(() => import('@/components/layout/footer/MobileFooter'));

export default function Home() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <HeroSection />
      <VendorSuccessSection />

      <TrustSection />
      <FeaturesSection />

      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>

      <JsonLd<FAQPage>
        id="faq-schema"
        schema={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "What is Streefi?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Streefi is a mobile app that helps you discover authentic street food vendors near you. We connect food lovers with local food heroes in their community, offering exclusive dine-in experiences and deals."
              }
            },
            {
              "@type": "Question",
              "name": "How does Streefi work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Simply download the Streefi app, explore street food vendors near you, pick your favorite dishes, and enjoy delicious meals with exclusive discounts. Support local food heroes while discovering authentic street food culture."
              }
            },
            {
              "@type": "Question",
              "name": "Is Streefi available on both Android and iOS?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Yes! Streefi is available for free download on both Google Play Store for Android devices and App Store for iOS devices. The app works on Android 6.0+ and iOS 12.0+ versions."
              }
            }
          ]
        }}
      />
      <JsonLd<MobileApplication>
        id="mobile-app-schema"
        schema={{
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          "@id": "https://streefi.in/#mobileapp",
          "name": "Streefi - Street Food Discovery",
          "alternateName": "Streefi",
          "description": "Discover authentic street food vendors near you, support local food heroes, and enjoy exclusive dine-in offers with Streefi mobile app",
          "operatingSystem": ["Android 6.0+", "iOS 12.0+"],
          "applicationCategory": ["Food & Drink", "Lifestyle"],
          "applicationSubCategory": "Food Discovery",
          "softwareVersion": "1.0+",
          "datePublished": "2024-01-01",
          "dateModified": "2025-11-25",
          "inLanguage": ["en-IN", "hi-IN"],
          "contentRating": "Everyone",
          "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR", "availability": "https://schema.org/InStock" },
          "downloadUrl": [
            "https://play.google.com/store/apps/details?id=com.streefi.customer",
            "https://apps.apple.com/in/app/streefi/id6747432924"
          ],
          "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.5", "ratingCount": "1000", "bestRating": "5", "worstRating": "1" }
        }}
      />
    </main>
  );
}
