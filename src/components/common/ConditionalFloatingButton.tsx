'use client';

import { usePathname } from 'next/navigation';
import FloatingDownloadButton from './FloatingDownloadButton';

export default function ConditionalFloatingButton() {
  const pathname = usePathname();
  
  // Hide floating button on policies and support pages
  const shouldHideButton = pathname.startsWith('/policies') || pathname.startsWith('/support');
  
  if (shouldHideButton) {
    return null;
  }
  
  return <FloatingDownloadButton />;
}
