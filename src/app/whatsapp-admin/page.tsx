'use client';

import { 
  AuthSection, 
  MessageFormSection, 
  LoadingSection,
  WhatsAppAdminProvider,
  useWhatsAppAdminContext
} from '@/modules/whatsapp-admin';

function WhatsAppAdminContent() {
  const { isUnlocked, isCheckingAuth } = useWhatsAppAdminContext();

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return <LoadingSection />;
  }

  // Show login screen if not authenticated
  if (!isUnlocked) {
    return <AuthSection />;
  }

  // Show admin panel if authenticated
  return <MessageFormSection />;
}

export default function WhatsAppAdminPage() {
  return (
    <WhatsAppAdminProvider>
      <WhatsAppAdminContent />
    </WhatsAppAdminProvider>
  );
}
