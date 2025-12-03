'use client';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/header/Header';
import MobileHeader from '@/components/layout/header/MobileHeader';
import HeroSection from '@/components/home/HeroSection';

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
    </main>
  );//
}
