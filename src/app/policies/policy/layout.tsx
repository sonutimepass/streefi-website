import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Streefi Policies - Privacy, Terms & Conditions",
    description: "Read Streefi's Privacy Policy, Terms of Service, and Refund Policies. We are committed to transparency and protecting your data.",
    robots: {
        index: true,
        follow: true,
    },
};

export default function PolicyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
