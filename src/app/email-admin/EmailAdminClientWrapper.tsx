'use client'

import { EmailAdminProvider } from "@/modules/email-admin/context/EmailAdminProvider"

export default function EmailAdminClientWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EmailAdminProvider>
      {children}
    </EmailAdminProvider>
  )
}
