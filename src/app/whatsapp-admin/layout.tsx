import WhatsAppAdminClientWrapper from './WhatsAppAdminClientWrapper'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function WhatsAppAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WhatsAppAdminClientWrapper>
      {children}
    </WhatsAppAdminClientWrapper>
  );
}
