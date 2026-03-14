'use client'

import { EmailAdminProvider } from "@/modules/email-admin/context/EmailAdminProvider"
import { WhatsAppAdminProvider } from "@/modules/whatsapp-admin/context/WhatsAppAdminProvider"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <EmailAdminProvider>
      <WhatsAppAdminProvider>
        {children}
      </WhatsAppAdminProvider>
    </EmailAdminProvider>
  )
}
