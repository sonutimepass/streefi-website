'use client';
import { MapPin, Clock, Percent, Users, Sparkles, BadgeCheck, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import Image from 'next/image';

export default function DesktopView() {
  const [activePeople, setActivePeople] = useState(0);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const generateRandomCount = () => {
      const hour = new Date().getHours();
      const seed = hour * 7;
      const baseRange = 20 + (seed % 40);
      const randomOffset = Math.floor(Math.random() * 10);
      return baseRange + randomOffset;
    };

    setActivePeople(generateRandomCount());

    const interval = setInterval(() => {
      setActivePeople(generateRandomCount());
    }, 3600000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="why-streefi-desktop" className="relative py-14 px-4 sm:px-6 lg:px-8 bg-[#f0fdf4] overflow-hidden">

      {/* Top Decorative Circle */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none" style={{ height: '150px' }}>
        <svg className="absolute w-full h-full" viewBox="0 0 1440 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <circle cx="720" cy="-550" r="700" fill="#f0fdf4" />
        </svg>
      </div>

      {/* Animated Background Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-teal-500 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full mb-4 border border-emerald-200 shadow-sm">
            <Zap className="w-5 h-5 text-emerald-600" />
            <span className="text-emerald-800 font-bold text-sm tracking-wide">DISCOVER BETTER FOOD</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
            Your Friends Eat Better.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 to-green-600">Want to Know Why?</span>
          </h2>

          <p className="text-gray-600 text-lg md:text-xl max-w-3xl mx-auto mb-3 leading-relaxed">
            They know the <span className="font-semibold text-gray-800">₹100 momos</span> that taste better than the ₹1000 restaurant ones.
          </p>

          <p className="text-gray-500 text-base max-w-2xl mx-auto leading-relaxed">
            While you're getting the same boring "food near me" results,
            <span className="text-[#06c167] font-semibold"> 500+ foodies</span> are finding hidden gems with exclusive discounts.
          </p>
        </div>

        {/* Features Section */}
        <div className="max-w-7xl mx-auto px-2 py-8">
          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-5 auto-rows-[190px]">
            
            {/* Featured Card: Secret Spots */}
            <div className="md:col-span-3 lg:col-span-5 row-span-2 group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-black p-6 text-white shadow-lg hover:shadow-emerald-500/20 transition-all duration-300">
              <div className="relative z-10 flex flex-col h-full">
                <div className="bg-emerald-500 w-12 h-12 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 group-hover:rotate-6 transition-transform shadow-lg">
                  <MapPin className="text-white w-6 h-6" />
                </div>
                <h3 id="secret-spots-heading" className="text-xl font-bold mb-2">Find Secret Spots</h3>
                <p className="text-gray-300 text-base leading-relaxed mb-4">
                  That cart everyone talks about but no one can find? We have it mapped.
                </p>
                <div className="mt-auto pt-4 border-t border-gray-700/50 flex justify-between items-center">
                  <span className="text-emerald-400 font-semibold text-xs uppercase tracking-wider">+120 vendors this month</span>
                </div>
              </div>
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-500"></div>
            </div>

            {/* Promotion Card: Discounts */}
            <div className="md:col-span-3 lg:col-span-7 row-span-2 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200/50 p-6 relative overflow-hidden group shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col">
              <div className="absolute top-5 right-5">
                <div className="bg-emerald-600 text-white text-xs font-bold px-3 py-1.5 rounded-full -rotate-6 shadow-md animate-pulse">
                  🔥 HOT DEALS
                </div>
              </div>
              
              <div className="flex-grow">
                <div className="bg-white w-12 h-12 rounded-lg flex items-center justify-center mb-4 shadow-sm">
                  <Percent className="text-emerald-600 w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Save upto ₹1000 every month</h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-sm">
                  Up to 50% OFF at top vendors. Exclusive deals you won't find on anywhere.
                </p>
              </div>

              <div className="flex items-end justify-between mt-4">
                <button 
                  onClick={() => setShowPopup(true)}
                  className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-all hover:scale-105 shadow-md"
                >
                  Get Deals
                </button>
                <div className="text-right">
                  <p className="text-emerald-600 font-black text-3xl">50% OFF</p>
                  <p className="text-gray-500 text-xs uppercase font-bold tracking-wide">Max Savings</p>
                </div>
              </div>
            </div>

            {/* Secondary Features */}
            {[
              { 
                title: "Open Now?", 
                icon: <Clock className="w-6 h-6" />,
                desc: "Live stall status lets you know if they're serving.",
                gradient: "from-blue-500 to-sky-500"
              },
              { 
                title: "Real Reviews", 
                icon: <Users className="w-6 h-6" />,
                desc: "Honest feedback from foodies, no fake hype.",
                gradient: "from-purple-500 to-violet-500"
              },
              { 
                title: "Verified Info", 
                icon: <BadgeCheck className="w-6 h-6" />, 
                desc: "Accurate pricing and vetted quality you can trust.",
                gradient: "from-amber-500 to-yellow-500"
              },
              { 
                title: "Dine-In Perks", 
                icon: <Sparkles className="w-6 h-6" />,
                desc: "Get instant discounts at the stall, just for you.",
                gradient: "from-pink-500 to-rose-500"
              },
            ].map((item, i) => (
              <div 
                key={i} 
                className="md:col-span-3 lg:col-span-3 row-span-1 rounded-2xl border border-gray-200/80 bg-white/90 backdrop-blur-sm p-5 hover:shadow-xl hover:border-emerald-200 transition-all duration-300 group cursor-pointer flex flex-col"
              >
                <div className={`p-4 self-start rounded-xl bg-gradient-to-br ${item.gradient} text-white group-hover:scale-110 transition-transform shadow-lg`}>
                  {item.icon}
                </div>
                <div className="mt-auto">
                  <h4 className="font-bold text-gray-900 text-lg leading-tight">{item.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Section */}
          <div className="mt-16 relative rounded-3xl bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-1 shadow-2xl overflow-hidden">
            <div className="bg-slate-50 rounded-[1.4rem] p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1 text-center md:text-center">
                <div className="inline-flex items-center gap-3 bg-white text-emerald-800 px-4 py-2 rounded-full mb-4 border border-emerald-200/80 shadow-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-sm font-semibold">{activePeople + 51} people browsing now</span>
                </div>
                <h3 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">
                  Don't miss the next gem.
                </h3>
                <p className="text-gray-600 text-base">
                  While you read this, <span className="text-emerald-600 font-semibold">{activePeople} foodies</span> just found a secret spot.
                </p>
              </div>
            </div>

      {showPopup && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowPopup(false)}
        >
          <div
            className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-[#06c167] to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📱</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Download Customer App</h3>
              <p className="text-gray-600">View menus, explore vendors, and get exclusive deals!</p>
            </div>

            <div className="space-y-3 mb-6">
              <a
                href="https://play.google.com/store/apps/details?id=com.streefi.customer&pcampaignid=web_share"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-3 bg-black hover:bg-gray-900 text-white px-6 py-4 rounded-xl transition-all duration-200 hover:shadow-lg"
              >
                <Image src="/assets/playstore.svg" alt="Google Play" width={28} height={28} className="w-7 h-7" />
                <div className="text-left">
                  <p className="text-xs text-gray-300">Get it on</p>
                  <p className="text-base font-semibold">Google Play</p>
                </div>
              </a>

              <a
                href="https://apps.apple.com/in/app/streefi/id6747432924"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center space-x-3 bg-black hover:bg-gray-900 text-white px-6 py-4 rounded-xl transition-all duration-200 hover:shadow-lg"
              >
                <Image src="/assets/appstore.svg" alt="App Store" width={28} height={28} className="w-7 h-7" />
                <div className="text-left">
                  <p className="text-xs text-gray-300">Download on the</p>
                  <p className="text-base font-semibold">App Store</p>
                </div>
              </a>
            </div>

            <button
              onClick={() => setShowPopup(false)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}
          </div>
        </div>
      </div>
    </section>
  );
}