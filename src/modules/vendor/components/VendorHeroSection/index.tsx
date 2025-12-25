'use client';

import DesktopView from './DesktopView';
import MobileView from './MobileView';

export default function VendorHeroSection() {
  return (
    <>
      <div className="block md:hidden">
        <MobileView />
      </div>
      <div className="hidden md:block">
        <DesktopView />
      </div>
    </>
  );
}
