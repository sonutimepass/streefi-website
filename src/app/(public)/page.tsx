'use client';
import dynamic from 'next/dynamic';
import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { HeroSection } from '@/modules/home';
import { FAQSchema, MobileAppSchema } from '@/components/seo/schemas';

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
const PhoneMockupSection = dynamic(() => import('@/modules/home').then(mod => ({ default: mod.PhoneMockupSection })), {
  loading: () => <div className="min-h-[400px]" />
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
      <PhoneMockupSection />
      <TrustSection />
      
      <FeaturesSection />

      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>
      
      <FAQSchema 
        id="home-faq"
        faqs={[
          {
            question: "What is Streefi?",
            answer: "Streefi is a platform to discover authentic street food vendors around you—no delivery, no agents. We bridge the gap between local food entrepreneurs and customers by offering easy discovery, direct dine-in orders, and a digital way to support local businesses."
          },
          {
            question: "How does Streefi work?",
            answer: "Open the Streefi app or website, explore nearby vendors using map or filters, browse their menu and reviews, decide to dine-in or takeaway, and visit the vendor directly—no agents, no commissions."
          },
          {
            question: "Is Streefi a food delivery app?",
            answer: "No. Streefi does not deliver food. We help you discover and connect with local vendors where you can eat or collect food directly."
          },
          {
            question: "Who are the vendors on Streefi?",
            answer: "Streefi features local street food entrepreneurs, small food stalls, pop-up eateries, and food trucks offering authentic, affordable food."
          },
          {
            question: "How does Streefi support local vendors?",
            answer: "Streefi gives vendors a free digital presence, connects them directly with customers without commissions, and amplifies their reach without middlemen."
          },
          {
            question: "Does Streefi take commission from vendors?",
            answer: "No. Streefi does not take commissions from vendors for Now."
          }
        ]}
      />

      <MobileAppSchema />
    </main>
  );
}
