import dynamic from 'next/dynamic';
import Header from '@/components/layout/header/Header';
import MobileHeader from '@/components/layout/header/MobileHeader';
import SupportHeroSection from '@/components/support/SupportHeroSection';

// Lazy load below-the-fold components
const SupportQuickHelpCards = dynamic(() => import('@/components/support/SupportQuickHelpCards'), {
  loading: () => <div className="min-h-[300px]" />
});
const SupportContactSection = dynamic(() => import('@/components/support/SupportContactSection'));
const SupportFAQSection = dynamic(() => import('@/components/support/SupportFAQSection'));
const SupportContactForm = dynamic(() => import('@/components/support/SupportContactForm'));
const Footer = dynamic(() => import('@/components/layout/footer/Footer'));
const MobileFooter = dynamic(() => import('@/components/layout/footer/MobileFooter'));

export default function Support() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <SupportHeroSection />
      <SupportQuickHelpCards />
      
      <section className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <SupportContactSection />
            <SupportFAQSection />
          </div>
          <SupportContactForm />
        </div>
      </section>

      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>
    </main>
  );
}