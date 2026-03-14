'use client'

import { WhatsAppAdminProvider } from "@/modules/whatsapp-admin/context/WhatsAppAdminProvider"

export default function WhatsAppAdminClientWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WhatsAppAdminProvider>
      {children}
    </WhatsAppAdminProvider>
  );
}
