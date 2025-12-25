import dynamic from 'next/dynamic';
import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { SupportHeroSection } from '@/modules/support';
import { Breadcrumb } from '@/modules/policies';

// Lazy load below-the-fold components
const SupportQuickHelpCards = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportQuickHelpCards })), {
  loading: () => <div className="min-h-[300px]" />
});
const SupportContactSection = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportContactSection })));
const SupportFAQSection = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportFAQSection })));
const SupportContactForm = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportContactForm })));


export default function Support() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <section className="bg-green-600">
        <div className="pt-10 px-7 max-w-7xl mx-auto">
          <Breadcrumb
            items={[{ label: 'Support', href: '/policies/support' }]}
            className="text-white relative z-10"
          />
        </div>
        <SupportHeroSection />
      </section>
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