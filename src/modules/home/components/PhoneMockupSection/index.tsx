'use client';

import { useEffect, useState } from 'react';
import DesktopView from './DesktopView';

export default function PhoneMockupSection() {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Don't render on mobile
  if (isMobile) return null;

  return <DesktopView />;
}
