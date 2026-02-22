'use client';

import { 
  AuthSection, 
  MessageFormSection, 
  LoadingSection,
  WhatsAppAdminProvider,
  useWhatsAppAdminContext
} from '@/modules/whatsapp-admin';

export default function WhatsAppAdminPage() {
  return (
    <WhatsAppAdminProvider>
      <WhatsAppAdminContent />
    </WhatsAppAdminProvider>
  );
}

function WhatsAppAdminContent() {
  const { isAuthenticated, isLoading } = useWhatsAppAdminContext();

  if (isLoading) return <LoadingSection />;

  if (!isAuthenticated) return <AuthSection />;

  return <MessageFormSection />;
}
