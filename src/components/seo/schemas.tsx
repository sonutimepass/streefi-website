import { JsonLd } from './JsonLd';
import type { WithContext } from 'schema-dts';

// Organization Schema - For Brand/Company
export function OrganizationSchema() {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://streefi.in/#organization",
    "name": "Streefi",
    "alternateName": "Streefi Foods",
    "url": "https://streefi.in",
    "logo": {
      "@type": "ImageObject",
      "url": "https://streefi.in/assets/streefi-logo.png",
      "width": "512",
      "height": "512"
    },
    "description": "India's leading street food discovery platform connecting food lovers with authentic local vendors. No delivery, no commissions - just pure street food culture.",
    "email": "support@streefi.in",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Gandhinagar",
      "addressRegion": "Gujarat",
      "addressCountry": "IN"
    },
    "areaServed": [
      {
        "@type": "City",
        "name": "Gandhinagar"
      },
      {
        "@type": "City",
        "name": "Ahmedabad"
      },
      {
        "@type": "State",
        "name": "Gujarat"
      }
    ],
    "sameAs": [
      "https://twitter.com/streefifoods",
      "https://instagram.com/streefifoods",
      "https://facebook.com/streefi"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer support",
      "email": "support@streefi.in",
      "availableLanguage": ["English", "Hindi", "Gujarati"]
    }
  };

  return <JsonLd id="organization-schema" schema={schema} />;
}

// Website Schema - For Search Box
export function WebsiteSchema() {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://streefi.in/#website",
    "url": "https://streefi.in",
    "name": "Streefi",
    "description": "Discover the best street food vendors near you",
    "publisher": {
      "@id": "https://streefi.in/#organization"
    },
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": "https://streefi.in/search?q={search_term_string}"
      },
      "query-input": "required name=search_term_string"
    }
  };

  return <JsonLd id="website-schema" schema={schema} />;
}

// Mobile App Schema
export function MobileAppSchema() {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    "name": "Streefi - Street Food Discovery",
    "operatingSystem": "Android",
    "applicationCategory": "LifestyleApplication",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1250"
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "INR"
    },
    "description": "Find and explore authentic street food vendors near you. Connect directly with local food heroes, read reviews, and get exclusive dine-in offers.",
    "screenshot": "https://streefi.in/assets/screenshots/app-home.png",
    "author": {
      "@id": "https://streefi.in/#organization"
    }
  };

  return <JsonLd id="mobile-app-schema" schema={schema} />;
}

// Breadcrumb Schema
interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://streefi.in"
      },
      ...items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 2,
        "name": item.name,
        "item": item.url
      }))
    ]
  };

  return <JsonLd id="breadcrumb-schema" schema={schema} />;
}

// Local Business Schema - For Individual Vendors
interface LocalBusinessSchemaProps {
  name: string;
  description: string;
  image: string;
  address: {
    street?: string;
    locality: string;
    region: string;
    postalCode?: string;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  phone?: string;
  priceRange?: string;
  cuisine?: string[];
  rating?: {
    value: number;
    count: number;
  };
  openingHours?: string[];
}

export function LocalBusinessSchema(props: LocalBusinessSchemaProps) {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "FoodEstablishment",
    "name": props.name,
    "description": props.description,
    "image": props.image,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": props.address.street,
      "addressLocality": props.address.locality,
      "addressRegion": props.address.region,
      "postalCode": props.address.postalCode,
      "addressCountry": "IN"
    },
    ...(props.geo && {
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": props.geo.latitude,
        "longitude": props.geo.longitude
      }
    }),
    ...(props.phone && { "telephone": props.phone }),
    ...(props.priceRange && { "priceRange": props.priceRange }),
    ...(props.cuisine && { "servesCuisine": props.cuisine }),
    ...(props.rating && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": props.rating.value,
        "reviewCount": props.rating.count
      }
    }),
    ...(props.openingHours && { "openingHours": props.openingHours })
  };

  return <JsonLd id={`vendor-${props.name.toLowerCase().replace(/\s+/g, '-')}`} schema={schema} />;
}

// Offer Schema - For Deals and Special Offers
interface OfferSchemaProps {
  name: string;
  description: string;
  validFrom: string;
  validThrough: string;
  url: string;
  priceSpecification?: {
    price: number;
    priceCurrency: string;
    originalPrice?: number;
  };
  seller?: {
    name: string;
    type: string;
  };
}

export function OfferSchema(props: OfferSchemaProps) {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "Offer",
    "name": props.name,
    "description": props.description,
    "url": props.url,
    "validFrom": props.validFrom,
    "validThrough": props.validThrough,
    "availability": "https://schema.org/InStock",
    ...(props.priceSpecification && {
      "priceSpecification": {
        "@type": "PriceSpecification",
        "price": props.priceSpecification.price,
        "priceCurrency": props.priceSpecification.priceCurrency,
        ...(props.priceSpecification.originalPrice && {
          "valueAddedTaxIncluded": true
        })
      }
    }),
    ...(props.seller && {
      "seller": {
        "@type": props.seller.type,
        "name": props.seller.name
      }
    })
  };

  return <JsonLd id={`offer-${props.name.toLowerCase().replace(/\s+/g, '-')}`} schema={schema} />;
}

// FAQ Schema - Reusable FAQ Component
interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
  id?: string;
}

export function FAQSchema({ faqs, id = 'faq' }: FAQSchemaProps) {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  return <JsonLd id={`${id}-schema`} schema={schema} />;
}

// ItemList Schema - For Vendor Listings
interface ItemListSchemaProps {
  items: Array<{
    name: string;
    url: string;
    description?: string;
    image?: string;
  }>;
  totalItems: number;
}

export function ItemListSchema({ items, totalItems }: ItemListSchemaProps) {
  const schema: WithContext<any> = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "numberOfItems": totalItems,
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Restaurant",
        "name": item.name,
        "url": item.url,
        ...(item.description && { "description": item.description }),
        ...(item.image && { "image": item.image })
      }
    }))
  };

  return <JsonLd id="itemlist-schema" schema={schema} />;
}
