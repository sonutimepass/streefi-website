'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSection } from '@/modules/whatsapp-admin';

/**
 * WhatsApp Admin Root - Redirects to /dashboard
 * 
 * Route structure:
 * /whatsapp-admin/dashboard   - Dashboard overview
 * /whatsapp-admin/send        - Quick message send (no campaign needed)
 * /whatsapp-admin/campaigns   - Campaign list
 * /whatsapp-admin/campaigns/[id] - Campaign detail
 * /whatsapp-admin/templates   - Template manager
 * /whatsapp-admin/settings    - Global settings
 */
export default function WhatsAppAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/whatsapp-admin/dashboard');
  }, [router]);

  return <LoadingSection />;
}
