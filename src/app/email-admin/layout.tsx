import EmailAdminClientWrapper from './EmailAdminClientWrapper'

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

export default function EmailAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <EmailAdminClientWrapper>
      {children}
    </EmailAdminClientWrapper>
  );
}
