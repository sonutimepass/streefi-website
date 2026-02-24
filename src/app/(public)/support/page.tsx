import dynamic from 'next/dynamic';
import { Header, MobileHeader, Footer, MobileFooter } from '@/core/layouts';
import { SupportHeroSection } from '@/modules/support';
import { Breadcrumb } from '@/modules/policies';
import { FAQSchema } from '@/components/seo/schemas';

// Lazy load below-the-fold components
const SupportQuickHelpCards = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportQuickHelpCards })), {
  loading: () => <div className="min-h-[300px]" />
});
const SupportContactSection = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportContactSection })));
const SupportFAQSection = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportFAQSection })));
const SupportContactForm = dynamic(() => import('@/modules/support').then(mod => ({ default: mod.SupportContactForm })));


export default function Support() {
  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="hidden md:block">
        <Header />
      </div>
      <div className="md:hidden">
        <MobileHeader />
      </div>
      <section className="bg-green-600">
        <div className="pt-24 px-7 max-w-7xl mx-auto">
          <Breadcrumb
            items={[{ label: 'Support', href: '/policies/support' }]}
            className="text-white relative z-10"
          />
        </div>
        <SupportHeroSection />
      </section>
      <SupportQuickHelpCards />

      <section className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <SupportContactSection />
            <SupportFAQSection />
          </div>
          <SupportContactForm />
        </div>
      </section>

      <div className="hidden md:block">
        <Footer />
      </div>
      <div className="md:hidden">
        <MobileFooter />
      </div>

      <FAQSchema 
        id="support-faq"
        faqs={[
          {
            question: "How do I find nearby street food vendors?",
            answer: "Enable location permissions. The app reads your GPS once, fetches vendors within range, and shows them on the home screen. If nothing loads, your GPS accuracy is low or permissions are disabled."
          },
          {
            question: "How does the dine-in module work?",
            answer: "If a vendor supports dine-in, you'll see them Offers Section."
          },
          {
            question: "Can I explore different cuisines?",
            answer: "Yes. Use the Explore tab, which indexes vendors by cuisine and dish tags. Filters update results instantly—no reloads."
          },
          {
            question: "How do I update my profile information?",
            answer: "Go to Settings → Edit Profile. You can change your name, and other basic details. Updates sync to the server instantly."
          },
          {
            question: "Is my data secure?",
            answer: "All API requests use HTTPS. Sensitive data is encrypted at rest. Only essential permissions are requested. Nothing is shared with vendors except your bill details."
          },
          {
            question: "Why can't I see some vendors?",
            answer: "Either the vendor is offline, out of your radius, or temporarily disabled by the admin panel. The app hides inactive vendors automatically."
          },
          {
            question: "How are vendor ratings calculated?",
            answer: "Ratings are an average of verified customer reviews. Spam detection removes duplicate or suspicious ratings before aggregation."
          },
          {
            question: "How do I report an issue with a vendor?",
            answer: "Open the profile → Report. The complaint is logged in the admin panel for review."
          }
        ]}
      />
    </main>
  );
}