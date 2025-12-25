'use client';

import DesktopView from './DesktopView';
import MobileView from './MobileView';

interface Vendor {
  _id: string;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  description: string;
  location: string;
  experience: number;
  revenueGrowth: number;
}

interface VendorGridSectionProps {
  vendors: Vendor[];
  loading: boolean;
}

export default function VendorGridSection({ vendors, loading }: VendorGridSectionProps) {
  return (
    <div id="vendors">
      <div className="block md:hidden">
        <MobileView vendors={vendors} loading={loading} />
      </div>
      <div className="hidden md:block">
        <DesktopView vendors={vendors} loading={loading} />
      </div>
    </div>
  );
}
