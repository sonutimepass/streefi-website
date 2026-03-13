'use client';

import dynamic from 'next/dynamic';
import { LoadingSection } from '@/modules/email-admin';

const EmailAdminClient = dynamic(
  () => import('../../components/EmailAdminClient'),
  { 
    ssr: false,
    loading: () => <LoadingSection />
  }
);

export default function EmailAdminPage() {
  return <EmailAdminClient />;
}