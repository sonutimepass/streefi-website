import type { ReactNode } from 'react';
import ConditionalFloatingButton from "@/components/common/ConditionalFloatingButton";

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Streefi',
};

export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      <ConditionalFloatingButton />
    </>
  );
}
