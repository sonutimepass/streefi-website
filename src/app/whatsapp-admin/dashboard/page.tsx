'use client';

import { WhatsAppAdminProvider, useWhatsAppAdminContext, LoadingSection, AuthSection } from '@/modules/whatsapp-admin';
import DashboardContent from '@/modules/whatsapp-admin/components/DashboardContent';

export default function WhatsAppDashboardPage() {
  return (
    <WhatsAppAdminProvider>
      <WhatsAppDashboardPageContent />
    </WhatsAppAdminProvider>
  );
}

function WhatsAppDashboardPageContent() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;
  if (!isAuthenticated) return <AuthSection />;

  return <DashboardContent />;
}
