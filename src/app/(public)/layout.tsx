import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Streefi',
};

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
