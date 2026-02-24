# 🔧 SEO Components & Utils Quick Reference

## 📦 Available Components

All SEO components are located in `/src/components/seo/`

### Import Schemas
```typescript
import {
  OrganizationSchema,
  WebsiteSchema,
  MobileAppSchema,
  BreadcrumbSchema,
  LocalBusinessSchema,
  OfferSchema,
  FAQSchema,
  ItemListSchema
} from '@/components/seo/schemas';

// Or from JsonLd
import { 
  OrganizationSchema,
  FAQSchema 
} from '@/components/seo/JsonLd';
```

---

## 🎯 Usage Examples

### 1. FAQ Schema
```tsx
<FAQSchema 
  id="page-faq"
  faqs={[
    {
      question: "What is Streefi?",
      answer: "Streefi is a platform..."
    },
    {
      question: "How does it work?",
      answer: "Open the app..."
    }
  ]}
/>
```

**Result:** Rich snippets in Google search results with expandable Q&A

---

### 2. Breadcrumb Schema
```tsx
<BreadcrumbSchema
  items={[
    { name: 'Vendors', url: 'https://streefi.in/vendor' },
    { name: 'Momos King', url: 'https://streefi.in/vendor/123' }
  ]}
/>
```

**Result:** Breadcrumb trail in search results

---

### 3. Local Business Schema (For Vendors)
```tsx
<LocalBusinessSchema
  name="Momos King"
  description="Best momos in Gandhinagar"
  image="https://streefi.in/images/momos-king.jpg"
  address={{
    street: "Sector 21",
    locality: "Gandhinagar",
    region: "Gujarat",
    postalCode: "382021"
  }}
  geo={{
    latitude: 23.2156,
    longitude: 72.6369
  }}
  phone="+91-9999999999"
  priceRange="₹"
  cuisine={["Momos", "Chinese"]}
  rating={{
    value: 4.5,
    count: 150
  }}
  openingHours={[
    "Mo-Su 10:00-22:00"
  ]}
/>
```

**Result:** Rich business listing in search + Google Maps integration

---

### 4. Offer Schema
```tsx
<OfferSchema
  name="50% Off on All Momos"
  description="Special weekend offer on all momo items"
  validFrom="2026-02-24T00:00:00+05:30"
  validThrough="2026-02-28T23:59:59+05:30"
  url="https://streefi.in/vendor/123"
  priceSpecification={{
    price: 50,
    priceCurrency: "INR",
    originalPrice: 100
  }}
  seller={{
    name: "Momos King",
    type: "LocalBusiness"
  }}
/>
```

**Result:** Offer appears in search results with dates and pricing

---

### 5. Item List Schema (For Vendor Listings)
```tsx
<ItemListSchema
  totalItems={50}
  items={vendors.map(vendor => ({
    name: vendor.name,
    url: `https://streefi.in/vendor/${vendor._id}`,
    description: vendor.description,
    image: vendor.image
  }))}
/>
```

**Result:** Carousel appearance in search results

---

## 🛠️ SEO Utility Functions

All utilities are in `/src/lib/seo.ts`

### Generate Page Metadata
```typescript
import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
  title: "Best Street Food in Gandhinagar",
  description: "Discover authentic street food vendors...",
  image: "/images/gandhinagar.jpg",
  url: "/location/gandhinagar",
  keywords: ["street food", "Gandhinagar", "vendors"],
  canonical: "https://streefi.in/location/gandhinagar"
});
```

---

### Generate Vendor Metadata
```typescript
import { generateVendorMetadata } from '@/lib/seo';

export async function generateMetadata({ params }) {
  const vendor = await getVendor(params.id);
  
  return generateVendorMetadata({
    name: vendor.name,
    description: vendor.description,
    image: vendor.image,
    location: vendor.location,
    cuisine: vendor.cuisineTypes,
    rating: vendor.rating
  });
}
```

---

### Generate Location Metadata
```typescript
import { generateLocationMetadata } from '@/lib/seo';

export const metadata = generateLocationMetadata({
  city: "Gandhinagar",
  state: "Gujarat",
  vendorCount: 50
});
```

---

### Generate Cuisine Metadata
```typescript
import { generateCuisineMetadata } from '@/lib/seo';

export const metadata = generateCuisineMetadata({
  name: "Momos",
  description: "Find the best momos vendors...",
  vendorCount: 15
});
```

---

### Social Sharing
```typescript
import { socialShare } from '@/lib/seo';

// WhatsApp
<a href={socialShare.whatsapp(
  "Check out this vendor!",
  "https://streefi.in/vendor/123"
)}>
  Share on WhatsApp
</a>

// Twitter
<a href={socialShare.twitter(
  "Amazing momos at Momos King!",
  "https://streefi.in/vendor/123"
)}>
  Tweet
</a>

// Facebook
<a href={socialShare.facebook(
  "https://streefi.in/vendor/123"
)}>
  Share on Facebook
</a>
```

---

### Generate Breadcrumb Items
```typescript
import { structuredData } from '@/lib/seo';

const breadcrumbItems = structuredData.generateBreadcrumbItems(
  "/vendor/momos/123"
);

// Returns:
// [
//   { name: "Vendor", url: "https://streefi.in/vendor" },
//   { name: "Momos", url: "https://streefi.in/vendor/momos" },
//   { name: "123", url: "https://streefi.in/vendor/momos/123" }
// ]
```

---

### Canonical URLs
```typescript
import { getCanonicalUrl } from '@/lib/seo';

const canonical = getCanonicalUrl('/vendor/123');
// Returns: "https://streefi.in/vendor/123"

// With query params removed
const clean = getCanonicalUrl('/vendor/123?ref=twitter', true);
// Returns: "https://streefi.in/vendor/123"
```

---

### Robots Configuration
```typescript
import { getRobotsConfig } from '@/lib/seo';

export const metadata = {
  robots: getRobotsConfig({
    index: true,
    follow: true,
    maxImagePreview: 'large',
    maxSnippet: 160
  })
};
```

---

## 📊 Analytics Tracking

All analytics functions are in `/src/lib/analytics.tsx`

### Import Analytics
```typescript
import { analytics } from '@/lib/analytics';
```

### Track Events
```typescript
'use client';
import { analytics } from '@/lib/analytics';

// Track vendor view
analytics.viewVendor(vendor._id, vendor.name);

// Track search
analytics.searchVendors(searchTerm, resultsCount);

// Track app download
analytics.downloadApp('android', 'vendor-page');

// Track offer view
analytics.viewOffer(offer.id, offer.name);

// Track form submission
analytics.submitContactForm('support');

// Track social clicks
analytics.socialClick('whatsapp', 'footer');

// Track vendor signup
analytics.vendorSignupStart();
analytics.vendorSignupComplete(vendorId);
```

### Add Analytics to Layout
```tsx
import { Analytics } from '@/lib/analytics';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Note:** Analytics is already configured in root layout with existing IDs

---

## 🎨 Complete Page Example

```tsx
// app/vendor/[id]/page.tsx
import { generateVendorMetadata } from '@/lib/seo';
import { 
  LocalBusinessSchema, 
  BreadcrumbSchema, 
  FAQSchema 
} from '@/components/seo/schemas';

// Generate Metadata
export async function generateMetadata({ params }) {
  const vendor = await getVendor(params.id);
  return generateVendorMetadata({
    name: vendor.name,
    description: vendor.description,
    image: vendor.image,
    location: vendor.location,
    cuisine: vendor.cuisineTypes,
    rating: vendor.rating
  });
}

// Page Component
export default function VendorPage({ vendor }) {
  return (
    <main>
      {/* Your page content */}
      
      {/* Schemas */}
      <LocalBusinessSchema
        name={vendor.name}
        description={vendor.description}
        image={vendor.image}
        address={{
          locality: vendor.city,
          region: "Gujarat"
        }}
        rating={{
          value: vendor.rating,
          count: vendor.reviewCount
        }}
      />
      
      <BreadcrumbSchema
        items={[
          { name: "Vendors", url: "https://streefi.in/vendor" },
          { name: vendor.name, url: `https://streefi.in/vendor/${vendor._id}` }
        ]}
      />
      
      <FAQSchema
        id={`vendor-${vendor._id}`}
        faqs={vendorFAQs}
      />
    </main>
  );
}
```

---

## 📝 Best Practices

### 1. Use Schemas on Every Page
- Home page → Organization + Website + FAQ
- Vendor page → LocalBusiness + Breadcrumb + FAQ
- Support page → FAQ + Breadcrumb
- Listing page → ItemList + Breadcrumb

### 2. Track All Important Actions
```typescript
// Button clicks
<button onClick={() => analytics.downloadApp('android', 'hero-section')}>
  Download App
</button>

// Vendor views (in useEffect)
useEffect(() => {
  analytics.viewVendor(vendor._id, vendor.name);
}, [vendor]);

// Search (in search component)
const handleSearch = (term) => {
  const results = searchVendors(term);
  analytics.searchVendors(term, results.length);
};
```

### 3. Always Include Breadcrumbs
```tsx
// Visual breadcrumb
<Breadcrumb items={[...]} />

// Schema breadcrumb
<BreadcrumbSchema items={[...]} />
```

### 4. Optimize Images
```typescript
import { getOptimizedImageUrl } from '@/lib/seo';

const optimizedUrl = getOptimizedImageUrl(
  vendor.image,
  { width: 1200, height: 630, quality: 85, format: 'webp' }
);
```

---

## 🚀 Quick Setup Checklist

For any new page:

1. [ ] Add metadata export (in layout or server component)
2. [ ] Include relevant schema components
3. [ ] Add breadcrumbs (visual + schema)
4. [ ] Add tracking events
5. [ ] Optimize images with alt texts
6. [ ] Include canonical URL
7. [ ] Add internal links to related pages
8. [ ] Test with Google Rich Results Test
9. [ ] Submit to Search Console

---

## 🔗 Testing Tools

### Test Your Implementation:
1. **Rich Results Test:** https://search.google.com/test/rich-results
2. **Schema Validator:** https://validator.schema.org/
3. **PageSpeed Insights:** https://pagespeed.web.dev/
4. **Mobile-Friendly Test:** https://search.google.com/test/mobile-friendly

---

## 📚 Environment Variables

Make sure these are set:

```env
NEXT_PUBLIC_SITE_URL=https://streefi.in
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-23ZXPRW9QQ
NEXT_PUBLIC_GTM_ID=GTM-5ZFVTDQV
```

---

## 💡 Pro Tips

1. **Always use server components for metadata** - Client components can't export metadata
2. **Test schemas before deploying** - Use Rich Results Test
3. **Monitor Search Console weekly** - Watch for indexing issues
4. **Keep schemas up to date** - Update vendor info regularly
5. **Don't over-optimize** - Keep content natural and user-focused
6. **Mobile-first** - Most traffic is mobile7. **Local focus** - Emphasize location and local search
8. **Track everything** - Data drives decisions

---

**Need help?** Check the main SEO guide: `SEO-IMPLEMENTATION-GUIDE.md`
