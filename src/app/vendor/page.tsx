'use client';
import dynamic from 'next/dynamic';
import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { VendorHeroSection } from '@/modules/vendor';
import { Breadcrumb } from '@/modules/policies';
import { useVendors } from '@/hooks';

// Lazy load below-the-fold components
const VendorBenefitsSection = dynamic(() => import('@/modules/vendor').then(mod => ({ default: mod.VendorBenefitsSection })), {
  loading: () => <div className="min-h-[500px]" />
});
const VendorGrid = dynamic(() => import('@/modules/vendor').then(mod => ({ default: mod.VendorGrid })), {
  loading: () => <div className="min-h-[600px]" />
});
const VendorCTASection = dynamic(() => import('@/modules/vendor').then(mod => ({ default: mod.VendorCTASection })), {
  loading: () => <div className="min-h-[400px]" />
});


export default function VendorPage() {
  const { vendors, loading } = useVendors();

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <Breadcrumb
          items={[{ label: 'Vendors', href: '/vendor' }]}
          className="text-gray-600"
        />
      </div>
      <VendorHeroSection />
      <VendorBenefitsSection />
      <VendorGrid vendors={vendors} loading={loading} />
      <VendorCTASection />
      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>
    </main>
  );
}
