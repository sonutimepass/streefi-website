import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Support & Help Center - Streefi",
  description: "Get help with Streefi. Contact our support team, find answers to frequently asked questions, and learn how to use the Streefi platform.",
  keywords: "streefi support, customer help, contact streefi, faq, help center, street food app support",
  openGraph: {
    title: "Support & Help Center - Streefi",
    description: "Need help? Contact Streefi support team or browse our FAQ section for quick answers.",
    url: "https://streefi.in/support",
    type: "website",
  },
  alternates: {
    canonical: "https://streefi.in/support",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
