'use client';

import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { Breadcrumb } from '@/modules/policies';
import { LocalBusinessSchema, BreadcrumbSchema, FAQSchema, OfferSchema } from '@/components/seo/schemas';
import type { Vendor } from '@/types';

interface VendorDetailClientProps {
  vendor: Vendor;
}

export default function VendorDetailClient({ vendor }: VendorDetailClientProps) {
  // Sample vendor FAQ - this would come from your database
  const vendorFAQs = [
    {
      question: `What are the operating hours of ${vendor.name}?`,
      answer: `${vendor.name} is typically open during regular business hours. Please contact them directly or check the app for real-time availability.`
    },
    {
      question: `What is ${vendor.name} known for?`,
      answer: vendor.specialty || `${vendor.name} is known for their authentic street food and quality ingredients.`
    },
    {
      question: `How do I order from ${vendor.name}?`,
      answer: `You can visit ${vendor.name} directly for dine-in or takeaway. Use the Streefi app to see their menu, location, and current offers.`
    },
    {
      question: `Does ${vendor.name} offer home delivery?`,
      answer: `${vendor.name} focuses on dine-in experiences. No delivery services are available as Streefi connects you directly with vendors.`
    }
  ];

  return (
    <main className="min-h-screen bg-white">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>

      <div className="pt-24 px-6 max-w-7xl mx-auto">
        <Breadcrumb
          items={[
            { label: 'Vendors', href: '/vendor' },
            { label: vendor.name, href: `/vendor/${vendor._id}` }
          ]}
          className="text-gray-600 mb-8"
        />
      </div>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          {/* Vendor Image */}
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
            <img
              src={vendor.image}
              alt={vendor.name}
              className="w-full h-full object-cover"
            />
            {/* Rating Badge */}
            <div className="absolute top-4 right-4 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <span className="text-yellow-500 text-xl">⭐</span>
              <span className="font-bold text-gray-800">{vendor.rating}</span>
              <span className="text-gray-500 text-sm">({vendor.reviews} reviews)</span>
            </div>
          </div>

          {/* Vendor Info */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              {vendor.name}
            </h1>
            
            <div className="flex items-center gap-4 mb-6">
              <span className="bg-green-100 text-green-700 px-4 py-2 rounded-full font-medium">
                {vendor.specialty}
              </span>
              <span className="text-gray-600 flex items-center gap-2">
                📍 {vendor.location}
              </span>
            </div>

            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              {vendor.description}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl">
                <div className="text-3xl font-bold text-green-700 mb-2">
                  {vendor.experience}+ years
                </div>
                <div className="text-gray-600">Experience</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl">
                <div className="text-3xl font-bold text-blue-700 mb-2">
                  {vendor.revenueGrowth}%
                </div>
                <div className="text-gray-600">Revenue Growth</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="bg-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg">
                Visit on Streefi App
              </button>
              <button className="border-2 border-green-600 text-green-600 px-8 py-4 rounded-xl font-semibold hover:bg-green-50 transition-colors">
                Get Directions
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="max-w-7xl mx-auto px-6 py-16 bg-gray-50 rounded-2xl my-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {vendorFAQs.map((faq, index) => (
            <details
              key={index}
              className="group border border-gray-200 rounded-lg hover:border-green-300 transition-colors bg-white"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none p-4 hover:bg-green-50 rounded-lg">
                <span className="font-semibold text-gray-700">{faq.question}</span>
                <span className="text-green-600 group-open:rotate-180 transition-transform">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </span>
              </summary>
              <div className="mt-2 p-4 text-gray-600 border-t border-gray-200">
                {faq.answer}
              </div>
            </details>
          ))}
        </div>
      </section>

      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>

      {/* Structured Data */}
      <LocalBusinessSchema
        name={vendor.name}
        description={vendor.description}
        image={vendor.image}
        address={{
          locality: vendor.location,
          region: 'Gujarat'
        }}
        rating={{
          value: vendor.rating,
          count: vendor.reviews
        }}
        priceRange="₹₹"
      />

      <BreadcrumbSchema
        items={[
          { name: 'Vendors', url: 'https://streefi.in/vendor' },
          { name: vendor.name, url: `https://streefi.in/vendor/${vendor._id}` }
        ]}
      />

      <FAQSchema
        id={`vendor-${vendor._id}-faq`}
        faqs={vendorFAQs}
      />
    </main>
  );
}
