'use client';

import DesktopView from './DesktopView';
import MobileView from './MobileView';

export default function VendorBenefitsSection() {
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