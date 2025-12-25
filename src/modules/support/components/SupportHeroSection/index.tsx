'use client';

import { useEffect, useState } from 'react';
import DesktopView from './DesktopView';
import MobileView from './MobileView';

export default function SupportHeroSection() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <MobileView /> : <DesktopView />;
}
