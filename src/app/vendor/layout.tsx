import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Become a Streefi Vendor - Grow Your Street Food Business",
    description: "Join Streefi to connect with thousands of foodies. List your stall, get dine-in orders, and manage your business with our dedicated vendor app.",
    keywords: "street food vendor registration, sell food online, streefi vendor, restaurant partner, food business growth",
    openGraph: {
        title: "Become a Streefi Vendor | Grow Your Business",
        description: "Join India's fastest growing street food network. Zero listing fees, instant onboarding, and dedicated support for vendors.",
        url: "https://streefi.in/vendor",
        type: "website",
    }
};

export default function VendorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
