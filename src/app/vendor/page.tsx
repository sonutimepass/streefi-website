'use client';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/header/Header';
import MobileHeader from '@/components/layout/header/MobileHeader';
import VendorHeroSection from '@/components/vendor/VendorHeroSection';
import Breadcrumb from '@/components/common/Breadcrumb';
import { useVendors } from '@/lib/useVendors';

// Lazy load below-the-fold components
const VendorBenefitsSection = dynamic(() => import('@/components/vendor/VendorBenefitsSection'), {
  loading: () => <div className="min-h-[500px]" />
});
const VendorGrid = dynamic(() => import('@/components/vendor/VendorGrid'), {
  loading: () => <div className="min-h-[600px]" />
});
const VendorCTASection = dynamic(() => import('@/components/vendor/VendorCTASection'), {
  loading: () => <div className="min-h-[400px]" />
});
const Footer = dynamic(() => import('@/components/layout/footer/Footer'));
const MobileFooter = dynamic(() => import('@/components/layout/footer/MobileFooter'));

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
