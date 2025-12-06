'use client';
import Image from 'next/image';
import Link from 'next/link';
import ParticleBackground from '@/components/common/ParticleBackground';

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

export default function MobileFooter() {
  return (
    <footer className="md:hidden relative py-8 px-6 bg-slate-950 text-gray-300 border-t border-slate-800 overflow-hidden">
      {/* Particle Background */}
      <div className="absolute inset-0 opacity-30">
        <ParticleBackground 
          particleColor="#06c167"
          particleCount={500}
          speed={0.3}
        />
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Brand Section */}
        <div className="mb-8">
          <button 
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center justify-center space-x-3 mb-4 mx-auto cursor-pointer"
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
          <p className="text-gray-400 text-center text-sm mb-6">
            Discover the best street food near you and support local vendors with Streefi.
          </p>
          
          {/* Social Links */}
          <div className="flex justify-center space-x-4">
            <a 
              href="https://www.instagram.com/streefifoods?igsh=cjdyMHp6eTNxdGk5" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-slate-700 transition-all duration-200"
              aria-label="Instagram"
            >
              <img src="/assets/instagram.svg" alt="Instagram" className="w-5 h-5" />
            </a>
            <a 
              href="https://www.linkedin.com/company/streefi/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-emerald-500/20 hover:border-emerald-500/40 border border-slate-700 transition-all duration-200"
              aria-label="LinkedIn"
            >
              <img src="/assets/linkedin.svg" alt="LinkedIn" className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          {/* Discover Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Discover</h3>
            <ul className="space-y-2">

              <li>
                <button 
                  onClick={() => window.location.href = '/vendor'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  For Vendors
                </button>
              </li>
            </ul>
          </div>
{typeof window !== 'undefined' && <ParticleBackground />}
          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Support</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => window.location.href = '/support/#help'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  Help Center
                </button>
              </li>
              <li>
                <button 
                  onClick={() => window.location.href = '/support/#report'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  Report Issue
                </button>
              </li>
              <li>
                <button 
                  onClick={handleContactClick}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  Contact Us
                </button>
              </li>
              <li>
                <button 
                  onClick={() => window.location.href = '/support/#FAQs'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  FAQs
                </button>
              </li>
            </ul>
          </div>

          {/* Policies Links */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Policies</h3>
            <ul className="space-y-2">
              <li>
                <button 
                  onClick={() => window.location.href = '/policies'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  Privacy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => window.location.href = '/policies'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  Terms
                </button>
              </li>
              <li>
                <button 
                  onClick={() => window.location.href = '/policies'}
                  className="text-gray-400 hover:text-emerald-400 transition-colors text-xs block text-left w-full"
                >
                  Refunds
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* App Download Section */}
        <div className="border-t border-slate-800 pt-6 mb-6">
          <p className="text-white font-semibold text-center mb-4 text-sm">Get the Streefi App</p>
          
          <div className="flex flex-col gap-3">
            {/* Google Play Button */}
            <a 
              href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-3 rounded-xl transition-all duration-200"
            >
              <img src="/assets/playstore.svg" alt="Google Play" className="w-6 h-6" />
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
              className="flex items-center justify-center space-x-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white px-4 py-3 rounded-xl transition-all duration-200"
            >
              <img src="/assets/appstore.svg" alt="App Store" className="w-6 h-6" />
              <div className="text-left">
                <p className="text-xs text-gray-300">Download on the</p>
                <p className="text-sm font-semibold">App Store</p>
              </div>
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-slate-800 pt-6 text-center">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Streefi. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
