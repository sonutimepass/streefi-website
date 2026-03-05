'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import SettingsPageContent from '@/modules/whatsapp-admin/components/SettingsPageContent';

export default function SettingsPage() {
  return (
    <WhatsAppAdminProvider>
      <SettingsPageContentWrapper />
    </WhatsAppAdminProvider>
  );
}

function SettingsPageContentWrapper() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <SettingsPageContent />;
}
