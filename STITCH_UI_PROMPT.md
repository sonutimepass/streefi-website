# Stitch UI Generation Prompt - Streefi Landing Page

## Project Overview
**Project Name:** Streefi - Street Food Discovery Platform
**Industry:** Food Tech / Local Business Discovery
**Target Users:** Urban food lovers aged 18-45 looking for authentic street food vendors
**Geographic Focus:** India (Gandhinagar, Ahmedabad, expanding nationally)
**Core Mission:** Connect food lovers with local street food vendors - no delivery, no agents

---

## Current Tech Stack
- **Framework:** Next.js 16.1.1 with TypeScript
- **Styling:** Tailwind CSS 4 with PostCSS
- **UI Library:** Lucide React for icons
- **Animations:** Framer Motion 12.23.26
- **3D Graphics:** Three.js + React Three Fiber
- **Font:** Ubuntu font family

---

## Landing Page Structure & Sections

### 1. **Header/Navigation**
- Desktop Navigation (hidden on mobile)
- Mobile Header (hidden on desktop)
- Should include: Logo, Navigation links, CTA buttons (Download App, Explore Vendors)

### 2. **Hero Section**
- Main banner introducing Streefi
- Key messaging: "Find Authentic Street Food Vendors Near You"
- Visual: Should showcase vibrant, authentic street food imagery
- CTA: "Download App" / "Explore Now" buttons

### 3. **Vendor Success Section**
- Highlights success stories from street food vendors
- Shows how vendors benefit from Streefi platform
- Layout: Cards or testimonial-style

### 4. **Phone Mockup Section**
- Displays the app interface
- Showcases key features: Map-based vendor discovery, vendor profiles, reviews

### 5. **Trust Section**
- Builds credibility and trust
- Verified vendors emphasis
- User testimonials
- Stats/metrics showing platform growth

### 6. **Features Section**
- Highlights key product features:
  - **Zero Commission:** No middlemen, vendors keep 100% earnings
  - **Direct Connection:** Dine-in or takeaway directly from vendors
  - **Verified Vendors:** Quality-assured local food entrepreneurs
  - **Easy Discovery:** Map-based and filter-based search
  - **Support Local:** Direct support to local food heroes

### 7. **Footer**
- Links to policies, support, social media
- Contact information
- Desktop and mobile versions

---

## Design Requirements & Brand Guidelines

### Color Palette
- **Primary Green:** #06C167 (Streefi brand color)
- **Background:** #fffdf9 (Off-white/cream)
- **Text:** Dark gray/black for readability

### Key Design Principles
1. **Authenticity:** Celebrate real street food culture
2. **Simplicity:** Clean, uncluttered design
3. **Local Focus:** Highlight grassroots, vendor-centric messaging
4. **Modern:** Contemporary design with cultural elements
5. **Accessible:** Responsive design that works on all devices (mobile-first approach)

### Design Elements to Include
- Street food imagery (authentic, high-quality photos)
- Vendor testimonials and success stories
- Map-based interaction visualization
- Icons for key features (Lucide React icons)
- Smooth animations and transitions (Framer Motion)
- Optional: Subtle 3D elements or particle effects (Three.js)

---

## Current Features to Redesign

### Must-Have Sections
1. ✅ Header with responsive navigation
2. ✅ Hero Section with strong CTA
3. ✅ Vendor Success Stories
4. ✅ Phone App Mockup
5. ✅ Trust/Credibility Section
6. ✅ Features Overview (6+ key features)
7. ✅ Footer with links

### Visual Elements
- High-quality street food photography
- Vendor profile cards
- Animated statistics/counters
- Map visualization or location-based graphics
- Mobile app mockup
- Reviews/testimonials cards

---

## Content Requirements

### Key Messaging
- **Main Tagline:** "Find Authentic Street Food Vendors Near You - No Delivery, No Agents"
- **USP:** Direct connection between customers and vendors, zero commission platform
- **Target CTA:** Download mobile app from App Store / Play Store

### Copy Points to Emphasize
- Support local food entrepreneurs
- Discover authentic, affordable street food
- Verified vendors with reviews
- Direct, commission-free business model
- Available in Gandhinagar & Ahmedabad (expanding)
- Free platform for both customers and vendors

---

## Technical Considerations for Stitch

### Framework Compatibility
- Output should work with Next.js 16.1.1
- Use Tailwind CSS 4 for styling
- Support TypeScript components
- Responsive design (mobile-first)
- Must handle both desktop and mobile layouts separately (currently using `hidden md:block` / `md:hidden` pattern)

### Performance Requirements
- Lazy-loaded components for sections below the fold
- Optimized image handling
- Fast load times (critical for landing page)
- SEO-friendly structure (schema markup ready)

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## Visual Inspiration & Tone

### Desired Vibe
- **Energetic & Welcoming:** Street food is vibrant and fun
- **Trustworthy:** Vendor-verified, transparent business model
- **Local Pride:** Celebrate Indian street food culture
- **Modern Tech:** Contemporary design with cultural authenticity

### Design Style
- Clean, modern with cultural elements
- Use of green accent color (#06C167) strategically
- High-quality food photography
- Authentic vendor imagery
- Illustrations of local food items or vendors
- Smooth, subtle animations

---

## Additional Assets to Consider
- Street food photography (samosas, chaat, vada pav, momos, dosa, etc.)
- Vendor portraits/success stories
- City maps or location icons
- Mobile app screenshots
- Testimonial videos or quotes
- Statistics/metrics graphics

---

## Success Metrics for New UI
1. Increased app downloads from landing page
2. Higher mobile conversion rates
3. Better engagement with vendor stories
4. Improved mobile usability scores
5. Clear information hierarchy for features

---

## Constraints & Special Notes
- Must maintain current navigation structure (separate mobile/desktop layouts)
- Must support Sentry error tracking integration
- Must be compatible with Google Tag Manager & Microsoft Clarity analytics
- Particle background effects optional (can enhance hero section)
- Should support dark mode consideration for future iterations

---

## Final Notes
This is a B2C platform with a unique double-sided market (customers & vendors). The UI should emphasize:
- **For Customers:** Easy discovery and access to authentic food
- **For Vendors:** Fair, transparent business model with no commissions
- **For Both:** Community and local support focus

Create a modern, vibrant, and trustworthy landing page that celebrates local street food culture while maintaining contemporary design standards.
