'use client';
import dynamic from 'next/dynamic';
import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { HeroSection } from '@/modules/home';
import { JsonLd } from '@/components/seo/JsonLd';
import { FAQPage, MobileApplication } from 'schema-dts';

// Lazy load below-the-fold components
const TrustSection = dynamic(() => import('@/modules/home').then(mod => ({ default: mod.TrustSection })), {
  loading: () => <div className="min-h-[400px]" />
});
const FeaturesSection = dynamic(() => import('@/modules/home').then(mod => ({ default: mod.FeaturesSection })), {
  loading: () => <div className="min-h-[600px]" />
});
const VendorSuccessSection = dynamic(() => import('@/modules/home').then(mod => ({ default: mod.VendorSuccessSection })), {
  loading: () => <div className="min-h-[500px]" />
});


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
                "text": "Streefi is a platform to discover authentic street food vendors around you—no delivery, no agents. We bridge the gap between local food entrepreneurs and customers by offering easy discovery, direct dine-in orders, and a digital way to support local businesses."
              }
            },
            {
              "@type": "Question",
              "name": "How does Streefi work?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Open the Streefi app or website, explore nearby vendors using map or filters, browse their menu and reviews, decide to dine-in or takeaway, and visit the vendor directly—no agents, no commissions."
              }
            },
            {
              "@type": "Question",
              "name": "Is Streefi a food delivery app?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. Streefi does not deliver food. We help you discover and connect with local vendors where you can eat or collect food directly."
              }
            },
            {
              "@type": "Question",
              "name": "Who are the vendors on Streefi?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Streefi features local street food entrepreneurs, small food stalls, pop-up eateries, and food trucks offering authentic, affordable food."
              }
            },
            {
              "@type": "Question",
              "name": "How does Streefi support local vendors?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "Streefi gives vendors a free digital presence, connects them directly with customers without commissions, and amplifies their reach without middlemen."
              }
            },
            {
              "@type": "Question",
              "name": "Does Streefi take commission from vendors?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "No. Streefi does not take commissions from vendors for Now."
              }
            }
          ]
        }}
      />

      <JsonLd<MobileApplication>
        id="app-schema"
        schema={{
          "@context": "https://schema.org",
          "@type": "MobileApplication",
          "name": "Streefi",
          "operatingSystem": "Android",
          "applicationCategory": "FoodEstablishment",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "INR"
          }
        }}
      />
    </main>
  );
}
