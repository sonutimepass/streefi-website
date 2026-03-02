'use client';

import { usePathname } from 'next/navigation';
import FloatingDownloadButton from './FloatingDownloadButton';

export default function ConditionalFloatingButton() {
  const pathname = usePathname();
  
  // Hide floating button on policies, support, and WhatsApp admin pages
  const shouldHideButton = pathname.startsWith('/policies') || pathname.startsWith('/support') || pathname.startsWith('/whatsapp-admin');
  
  if (shouldHideButton) {
    return null;
  }
  
  return <FloatingDownloadButton />;
}