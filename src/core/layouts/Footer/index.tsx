'use client';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// const ParticleBackground = dynamic(
//   () => import('@/components/common/ParticleBackground'),
//   { ssr: false }
// );

function handleContactClick() {
  const phoneNumber = "917777933650";
  const email = "support@streefi.in";
  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  if (isMobile) {
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  } else {
    window.location.href = `mailto:${email}`;
  }
}

export default function Footer() {
  return (
    <footer className="relative py-8 px-6 bg-slate-950 text-gray-300 border-t border-slate-800 overflow-hidden">


      <div className="max-w-7xl mx-auto relative z-10">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">

          {/* Brand Column */}
          <div className="lg:col-span-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center space-x-3 mb-4 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/assets/streefi-logo.png"
                alt="Streefi Logo"
                width={40}
                height={40}
                className="w-10 h-10"
              />
              <span className="text-2xl font-bold text-white">Streefi</span>
            </button>
            <p className="text-gray-400 mb-6 max-w-md">
              Discover the best street food near you and support local vendors with Streefi.
              Experience authentic flavors, verified quality, and seamless ordering.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a
                href="https://www.instagram.com/streefifoods?igsh=cjdyMHp6eTNxdGk5"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-slate-700 transition-all duration-200"
                aria-label="Instagram"
              >
                <Image src="/assets/instagram.svg" alt="Instagram" width={20} height={20} className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/company/streefi/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-slate-700 transition-all duration-200"
                aria-label="LinkedIn"
              >
                <Image src="/assets/linkedin.svg" alt="LinkedIn" width={20} height={20} className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Discover Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Discover</h3>
            <ul className="space-y-3">


              <li>
                <button
                  onClick={() => window.location.href = '/vendor'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  For Vendors
                </button>
              </li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Support</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => window.location.href = '/support/#help'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.location.href = '/support/#report'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  Report an Issue
                </button>
              </li>
              <li>
                <button
                  onClick={handleContactClick}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.location.href = '/support/#FAQs'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Policies Links */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Policies</h3>
            <ul className="space-y-3">
              <li>
                <button
                  onClick={() => window.location.href = '/policies/#privacy'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.location.href = '/policies/#terms'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => window.location.href = '/policies/#refund'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors duration-200 block text-left"
                >
                  Refund & Cancellation
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* App Download Section */}
        <div className="border-t border-slate-800 pt-8 mb-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="text-center lg:text-left">
              <p className="text-white font-semibold mb-2">Get the Streefi App</p>
              <p className="text-gray-400 text-sm">Download now for the best street food experience</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Google Play Button */}
              <a
                href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <Image src="/assets/playstore.svg" alt="Google Play" width={24} height={24} className="w-6 h-6" />
                <div className="text-left">
                  <p className="text-xs text-gray-300">Get It On</p>
                  <p className="text-sm font-semibold">Google Play</p>
                </div>
              </a>

              {/* App Store Button */}
              <a
                href="https://apps.apple.com/in/app/streefi/id6747432924"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-6 py-3 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg"
              >
                <Image src="/assets/appstore.svg" alt="App Store" width={24} height={24} className="w-6 h-6" />
                <div className="text-left">
                  <p className="text-xs text-gray-300">Download on the</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="border-t border-slate-800 pt-8 text-center">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} Streefi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
