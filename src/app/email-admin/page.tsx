import dynamic from 'next/dynamic';

// Dynamically import with no SSR - this prevents prerendering
const EmailAdminClient = dynamic(
  () => import('./EmailAdminClient'),
  { ssr: false }
);

export default function EmailAdminPage() {
  return <EmailAdminClient />;
}