'use client';
import { MapPin, Clock, Percent, Users, Sparkles, ChevronRight, Star, TrendingUp, Zap, Heart, BadgeCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function VendorSuccessSection() {
  const [activePeople, setActivePeople] = useState(0);

  useEffect(() => {
    // Generate a random number between 20-60 based on current hour
    const generateRandomCount = () => {
      const hour = new Date().getHours();
      const seed = hour * 7; // Use hour as seed for consistency within the hour
      const baseRange = 20 + (seed % 40); // Range between 20-60
      const randomOffset = Math.floor(Math.random() * 10); // Add small random variation
      return baseRange + randomOffset;
    };

    setActivePeople(generateRandomCount());

    // Update every hour
    const interval = setInterval(() => {
      setActivePeople(generateRandomCount());
    }, 3600000); // 1 hour in milliseconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="why-streefi" className="relative py-20 px-6 bg-white overflow-hidden pb-0">
      
      {/* Top Decorative Circle */}
      <div className="absolute top-0 left-0 w-full overflow-hidden leading-none" style={{ height: '150px' }}>
        <svg className="absolute w-full h-full" viewBox="0 0 1440 150" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <circle cx="720" cy="-550" r="700" fill="#f0fdf4" />
        </svg>
      </div>
      
      {/* Animated Background Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-yellow-500 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Pain Point Header - Hit Emotions Hard */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-100 px-5 py-2 rounded-full mb-6 border border-orange-200">
            <Zap className="w-4 h-4 text-[#ff6b35]" />
            <span className="text-[#ff6b35] font-medium text-sm tracking-wide">STOP EATING BORING FOOD</span>
          </div>
          
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Your Friends Eat Better.<br />
            <span className="text-[#06c167]">
              Want to Know Why?
            </span>
          </h2>
          
          <p className="text-gray-700 text-xl md:text-2xl max-w-3xl mx-auto mb-4 leading-relaxed">
            They know the <span className="text-[#ff6b35] font-bold">₹30 momos</span> that taste better than ₹200 restaurant ones.
          </p>

          <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
            While you're googling "food near me" and getting the same boring results, 
            <span className="text-[#06c167] font-semibold"> 50,000+ foodies</span> are eating at hidden gems with exclusive discounts.
          </p>
        </div>

        

        {/* Core Benefits - Simple & Emotional */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          
          {/* Benefit 1: Discovery - FOMO */}
          <div className="group relative bg-white backdrop-blur-md p-8 rounded-3xl border-2 border-gray-200 hover:border-[#ff6b35] transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-lg">
            
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mb-5 border border-orange-200 group-hover:scale-110 transition-transform">
              <MapPin className="w-7 h-7 text-[#ff6b35]" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              🗺️ Find Secret Spots
            </h3>
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              That cart everyone talks about but no one can find on Google? 
              <span className="text-[#ff6b35] font-semibold"> We have it.</span>
            </p>
            <p className="text-[#06c167] text-sm font-medium flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              1,200+ vendors added this month
            </p>
          </div>

          {/* Benefit 2: Discounts - Greed/Savings */}
          <div className="group relative bg-white backdrop-blur-md p-8 rounded-3xl border-2 border-gray-200 hover:border-[#06c167] transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-lg">
            
            {/* Hot Badge */}
            <div className="absolute -top-2 -left-2 bg-gradient-to-r from-red-500 to-[#ff6b35] text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">
              🔥 HOT
            </div>
            
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5 border border-green-200 group-hover:scale-110 transition-transform">
              <Percent className="w-7 h-7 text-[#06c167]" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              💰 Crazy Discounts
            </h3>
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              <span className="text-[#06c167] font-bold">Up to 50% OFF</span> at top vendors. 
              Exclusive deals you won't find anywhere else.
            </p>
            <p className="text-[#ff6b35] text-sm font-medium flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              Avg. user saves ₹500/month
            </p>
          </div>

          {/* Benefit 3: Real-Time - Convenience */}
          <div className="group relative bg-white backdrop-blur-md p-8 rounded-3xl border-2 border-gray-200 hover:border-[#06c167] transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-lg">
            
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5 border border-green-200 group-hover:scale-110 transition-transform">
              <Clock className="w-7 h-7 text-[#06c167]" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ⚡ Open Right Now?
            </h3>
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              Real-time status. No more walking 2km to find a 
              <span className="text-red-500 font-semibold"> closed stall.</span>
            </p>
            <p className="text-[#06c167] text-sm font-medium flex items-center gap-1">
              <BadgeCheck className="w-4 h-4" />
              Live updates every 15 mins
            </p>
          </div>

          {/* Benefit 4: Reviews - Trust */}
          <div className="group relative bg-white backdrop-blur-md p-8 rounded-3xl border-2 border-gray-200 hover:border-[#06c167] transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-lg">
            
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5 border border-green-200 group-hover:scale-110 transition-transform">
              <Users className="w-7 h-7 text-[#06c167]" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              👥 Real People, Real Reviews
            </h3>
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              No fake reviews. No paid influencers. Just 
              <span className="text-[#06c167] font-semibold"> hungry people like you</span> sharing the truth.
            </p>
            <p className="text-[#06c167] text-sm font-medium flex items-center gap-1">
              <Heart className="w-4 h-4" />
              50K+ verified reviews
            </p>
          </div>

          {/* Benefit 5: Prices - No Scam */}
          <div className="group relative bg-white backdrop-blur-md p-8 rounded-3xl border-2 border-gray-200 hover:border-[#06c167] transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-lg">
            
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5 border border-green-200 group-hover:scale-110 transition-transform">
              <BadgeCheck className="w-7 h-7 text-[#06c167]" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              ✅ No Tourist Pricing
            </h3>
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              See <span className="text-[#06c167] font-semibold">real prices</span> before you go. 
              No "special price for you, sir" surprises.
            </p>
            <p className="text-[#06c167] text-sm font-medium flex items-center gap-1">
              <Star className="w-4 h-4" />
              Prices verified by community
            </p>
          </div>

          {/* Benefit 6: Dine-In Offers */}
          <div className="group relative bg-white backdrop-blur-md p-8 rounded-3xl border-2 border-gray-200 hover:border-[#06c167] transition-all duration-500 hover:scale-[1.02] shadow-md hover:shadow-lg">
            
            {/* New Badge */}
            <div className="absolute -top-2 -left-2 bg-gradient-to-r from-[#06c167] to-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              ✨ NEW
            </div>
            
            <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-5 border border-green-200 group-hover:scale-110 transition-transform">
              <Sparkles className="w-7 h-7 text-[#06c167]" />
            </div>
            
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              🍽️ Dine-In Deals
            </h3>
            <p className="text-gray-700 text-base leading-relaxed mb-3">
              Flash your app, get <span className="text-[#06c167] font-semibold">instant discounts</span> at 
              partner restaurants & cafes.
            </p>
            <p className="text-[#06c167] text-sm font-medium flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              500+ partner restaurants
            </p>
          </div>
        </div>

        {/* FOMO Section - Urgency */}
        <div className="relative bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl p-8 md:p-12 mb-16 border-2 border-orange-200 overflow-hidden shadow-md">
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                🤔 Still thinking?
              </h3>
              <p className="text-gray-700 text-lg">
                While you decide, <span className="text-[#ff6b35] font-bold">{activePeople} people</span> just discovered 
                their new favorite food spot.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center gap-2 bg-green-100 px-4 py-2 rounded-full border-2 border-green-200">
                <div className="w-2 h-2 rounded-full bg-[#06c167] animate-pulse"></div>
                <span className="text-[#06c167] font-semibold text-sm">{activePeople + 51} people browsing now</span>
              </div>
              <p className="text-gray-600 text-xs">Don't miss out on hidden gems</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}