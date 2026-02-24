import type { Metadata } from 'next';

const SITE_URL = 'https://streefi.in';
const SITE_NAME = 'Streefi';
const DEFAULT_TITLE = 'Streefi - Find Best Street Food Near You | Verified Vendors & Offers';
const DEFAULT_DESCRIPTION = 'Find local street food vendors in Gandhinagar & Ahmedabad using Streefi. Discover verified food heroes, read reviews, and get exclusive dine-in offers on the app.';
const DEFAULT_IMAGE = '/assets/streefi-logo.png';
const TWITTER_HANDLE = '@streefifoods';

export interface SEOConfig {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  keywords?: string[];
  noIndex?: boolean;
  canonical?: string;
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
}

/**
 * Generate complete metadata for a page
 */
export function generateMetadata(config: SEOConfig): Metadata {
  const {
    title = DEFAULT_TITLE,
    description = DEFAULT_DESCRIPTION,
    image = DEFAULT_IMAGE,
    url,
    type = 'website',
    keywords = [],
    noIndex = false,
    canonical,
    publishedTime,
    modifiedTime,
    author,
  } = config;

  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;
  const imageUrl = image.startsWith('http') ? image : `${SITE_URL}${image}`;
  const canonicalUrl = canonical || pageUrl;

  return {
    title,
    description,
    keywords: keywords.join(', '),
    authors: author ? [{ name: author }] : [{ name: 'Streefi Team' }],
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      locale: 'en_IN',
      type,
      ...(type === 'article' && publishedTime && {
        publishedTime,
        ...(modifiedTime && { modifiedTime }),
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
      creator: TWITTER_HANDLE,
      site: TWITTER_HANDLE,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/**
 * Generate metadata for vendor pages
 */
export function generateVendorMetadata(vendor: {
  name: string;
  description?: string;
  image?: string;
  location?: string;
  cuisine?: string[];
  rating?: number;
}): Metadata {
  const title = `${vendor.name} - ${vendor.location || 'Gandhinagar'} | Streefi`;
  const description = vendor.description 
    ? `${vendor.description} Visit ${vendor.name} in ${vendor.location || 'Gandhinagar'}. ${vendor.cuisine?.join(', ') || 'Authentic street food'}.`
    : `Discover ${vendor.name}, a verified street food vendor in ${vendor.location || 'Gandhinagar'}.`;

  const keywords = [
    vendor.name,
    vendor.location || 'Gandhinagar',
    'street food',
    'local vendor',
    ...(vendor.cuisine || []),
    'best street food',
    'food near me',
  ];

  return generateMetadata({
    title,
    description,
    image: vendor.image,
    url: `/vendor/${vendor.name.toLowerCase().replace(/\s+/g, '-')}`,
    keywords,
  });
}

/**
 * Generate metadata for location-based pages
 */
export function generateLocationMetadata(location: {
  city: string;
  state?: string;
  vendorCount?: number;
}): Metadata {
  const title = `Best Street Food in ${location.city} | Verified Vendors on Streefi`;
  const description = `Discover ${location.vendorCount || 'the best'} verified street food vendors in ${location.city}${location.state ? ', ' + location.state : ''}. Authentic local food, direct ordering.`;

  const keywords = [
    `street food ${location.city}`,
    `best street food in ${location.city}`,
    `local food ${location.city}`,
    `food vendors ${location.city}`,
    'street food near me',
    location.city,
  ];

  return generateMetadata({
    title,
    description,
    url: `/location/${location.city.toLowerCase()}`,
    keywords,
  });
}

/**
 * Generate metadata for cuisine-based pages
 */
export function generateCuisineMetadata(cuisine: {
  name: string;
  description?: string;
  vendorCount?: number;
}): Metadata {
  const title = `Best ${cuisine.name} Street Food | Find Vendors on Streefi`;
  const description = cuisine.description 
    || `Find the best ${cuisine.name} street food vendors near you. ${cuisine.vendorCount || 'Many'} verified vendors serving authentic ${cuisine.name}.`;

  const keywords = [
    cuisine.name,
    `${cuisine.name} near me`,
    `best ${cuisine.name}`,
    'street food',
    `street food ${cuisine.name}`,
  ];

  return generateMetadata({
    title,
    description,
    url: `/cuisine/${cuisine.name.toLowerCase()}`,
    keywords,
  });
}

/**
 * Extract keywords from text
 */
export function extractKeywords(text: string, count: number = 10): string[] {
  // Simple keyword extraction (you can enhance with NLP libraries)
  const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
  const frequency: Record<string, number> = {};

  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, count)
    .map(([word]) => word);
}

/**
 * Generate robots meta tag
 */
export function getRobotsConfig(options: {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  maxSnippet?: number;
  maxImagePreview?: 'none' | 'standard' | 'large';
  maxVideoPreview?: number;
}) {
  const {
    index = true,
    follow = true,
    noarchive = false,
    nosnippet = false,
    maxSnippet,
    maxImagePreview = 'large',
    maxVideoPreview,
  } = options;

  return {
    index,
    follow,
    ...(noarchive && { noarchive: true }),
    ...(nosnippet && { nosnippet: true }),
    googleBot: {
      index,
      follow,
      ...(maxSnippet && { 'max-snippet': maxSnippet }),
      'max-image-preview': maxImagePreview,
      ...(maxVideoPreview && { 'max-video-preview': maxVideoPreview }),
    },
  };
}

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(path: string, removeQueryParams: boolean = true): string {
  const url = path.startsWith('http') ? path : `${SITE_URL}${path}`;
  
  if (removeQueryParams) {
    return url.split('?')[0];
  }
  
  return url;
}

/**
 * Generate alternate language links
 */
export function getAlternateLanguages(path: string) {
  return {
    'en': `${SITE_URL}${path}`,
    'en-IN': `${SITE_URL}${path}`,
    'hi': `${SITE_URL}/hi${path}`,
    'gu': `${SITE_URL}/gu${path}`,
  };
}

/**
 * Social media share URLs
 */
export const socialShare = {
  twitter: (text: string, url: string) => 
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  
  facebook: (url: string) => 
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  
  whatsapp: (text: string, url: string) => 
    `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
  
  linkedin: (url: string, title: string) => 
    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  
  telegram: (text: string, url: string) => 
    `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
};

/**
 * Structured data helpers
 */
export const structuredData = {
  generateBreadcrumbItems: (path: string) => {
    const segments = path.split('/').filter(Boolean);
    return segments.map((segment, index) => ({
      name: segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      url: `${SITE_URL}/${segments.slice(0, index + 1).join('/')}`,
    }));
  },

  generateVendorSchema: (vendor: any) => ({
    name: vendor.name,
    description: vendor.description,
    image: vendor.image,
    address: {
      street: vendor.address,
      locality: vendor.city || 'Gandhinagar',
      region: vendor.state || 'Gujarat',
      postalCode: vendor.pincode,
    },
    geo: vendor.coordinates && {
      latitude: vendor.coordinates.lat,
      longitude: vendor.coordinates.lng,
    },
    phone: vendor.phone,
    priceRange: vendor.priceRange || '₹',
    cuisine: vendor.cuisineTypes || [],
    rating: vendor.rating && {
      value: vendor.rating,
      count: vendor.reviewCount || 0,
    },
    openingHours: vendor.openingHours || [],
  }),
};

/**
 * Image optimization for SEO
 */
export function getOptimizedImageUrl(
  src: string,
  options: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'avif' | 'jpeg';
  } = {}
): string {
  // If using Next.js Image Optimization API or CDN
  const { width, height, quality = 80, format = 'webp' } = options;
  
  if (src.startsWith('http')) {
    return src;
  }

  const params = new URLSearchParams();
  if (width) params.set('w', width.toString());
  if (height) params.set('h', height.toString());
  params.set('q', quality.toString());
  params.set('f', format);

  return `${SITE_URL}/_next/image?url=${encodeURIComponent(src)}&${params.toString()}`;
}

export { SITE_URL, SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION };
