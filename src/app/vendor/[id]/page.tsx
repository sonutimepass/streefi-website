import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { generateVendorMetadata } from '@/lib/seo';
import VendorDetailClient from './VendorDetailClient';

interface VendorPageProps {
  params: {
    id: string;
  };
}

// This would fetch vendor data from your API
async function getVendor(id: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streefi.in';
    const response = await fetch(`${baseUrl}/api/vendors/${id}`, {
      next: { revalidate: 3600 } // Revalidate every hour
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.json();
  } catch (error) {
    console.error('Error fetching vendor:', error);
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
  const vendor = await getVendor(params.id);
  
  if (!vendor) {
    return {
      title: 'Vendor Not Found | Streefi',
      description: 'The vendor you are looking for could not be found.',
      robots: { index: false, follow: false }
    };
  }

  return generateVendorMetadata({
    name: vendor.name,
    description: vendor.description,
    image: vendor.image,
    location: vendor.location,
    cuisine: vendor.cuisineTypes || [],
    rating: vendor.rating,
  });
}

export default async function VendorDetailPage({ params }: VendorPageProps) {
  const vendor = await getVendor(params.id);

  if (!vendor) {
    notFound();
  }

  return <VendorDetailClient vendor={vendor} />;
}

// Optional: Generate static paths for known vendors (good for SEO)
// Uncomment this if you want to pre-generate pages at build time
/*
export async function generateStaticParams() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://streefi.in';
  const response = await fetch(`${baseUrl}/api/vendors`);
  const vendors = await response.json();
  
  return vendors.map((vendor: any) => ({
    id: vendor._id,
  }));
}
*/
