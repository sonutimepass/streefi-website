'use client';
import { MapPin, Clock, Percent, Users, Sparkles, Star, TrendingUp, Zap, Heart, BadgeCheck } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

export default function MobileView() {
  const [activePeople, setActivePeople] = useState(0);
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const carouselRef = useRef(null);

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

  // Auto-slide functionality (5-7 seconds random interval)
  useEffect(() => {
    const getRandomInterval = () => Math.floor(Math.random() * 2000) + 3000; // 5000-7000ms
    
    let autoSlide: NodeJS.Timeout;
    
    const startAutoSlide = () => {
      autoSlide = setTimeout(() => {
        if (!isDragging) {
          setActiveSlide(prev => (prev < 5 ? prev + 1 : 0)); // 6 benefits (0-5)
        }
        startAutoSlide(); // Schedule next slide with new random interval
      }, getRandomInterval());
    };
    
    startAutoSlide();

    return () => clearTimeout(autoSlide);
  }, [isDragging]);

  // Benefits for carousel
  const benefits = [
    {
      icon: <MapPin className="w-6 h-6 text-[#ff6b35]" />,
      title: "🗺️ Find Secret Spots",
      description: "That cart everyone talks about but no one can find on Google? We have it.",
      stat: "120+ vendors added this month",
      statIcon: <TrendingUp className="w-3 h-3" />,
      color: "orange"
    },
    {
      icon: <Percent className="w-6 h-6 text-[#06c167]" />,
      title: "💰 Crazy Discounts",
      description: "Up to 50% OFF at top vendors. Exclusive deals you won't find anywhere else.",
      stat: "Avg. user saves ₹500/month",
      statIcon: <Sparkles className="w-3 h-3" />,
      color: "green",
      badge: "🔥 HOT"
    },
    {
      icon: <Clock className="w-6 h-6 text-[#06c167]" />,
      title: "⚡ Open Right Now?",
      description: "Real-time status. No more walking 2km to find a closed stall.",
      stat: "Live updates from 300+ vendors",
      statIcon: <BadgeCheck className="w-3 h-3" />,
      color: "green"
    },
    {
      icon: <Users className="w-6 h-6 text-[#06c167]" />,
      title: "👥 Real People, Real Reviews",
      description: "No fake reviews. No paid influencers. Just hungry people like you sharing the truth.",
      stat: "500+ verified reviews",
      statIcon: <Heart className="w-3 h-3" />,
      color: "green"
    },
    {
      icon: <BadgeCheck className="w-6 h-6 text-[#06c167]" />,
      title: "✅ No Tourist Pricing",
      description: "See real prices before you go. No 'special price for you, sir' surprises.",
      stat: "Prices verified by community",
      statIcon: <Star className="w-3 h-3" />,
      color: "green"
    },
    {
      icon: <Sparkles className="w-6 h-6 text-[#06c167]" />,
      title: "🍽️ Dine-In Deals",
      description: "Flash your app, get instant discounts at partner restaurants, stalls, foodtrucks & cafes.",
      stat: "50+ partners onboarded",
      statIcon: <TrendingUp className="w-3 h-3" />,
      color: "green",
      badge: "✨ NEW"
    }
  ];

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    
    // Calculate drag offset for visual feedback
    const diff = currentTouch - touchStart;
    setDragOffset(diff);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && activeSlide < benefits.length - 1) {
      setActiveSlide(prev => prev + 1);
    }

    if (isRightSwipe && activeSlide > 0) {
      setActiveSlide(prev => prev - 1);
    }

    setIsDragging(false);
    setDragOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const goToSlide = (index: number) => {
    setActiveSlide(index);
  };

  return (
    <section id="why-streefi-mobile" className="relative py-5 px-4 overflow-hidden" style={{ background: '#f0fdf4' }}>
      <div className="max-w-6xl mx-auto relative z-10 pt-2">

        {/* Pain Point Header - Mobile */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-1.5 rounded-full mb-4 border border-orange-200">
            <Zap className="w-3 h-3 text-[#d95429]" />
            <span className="text-[#d95429] font-medium text-xs tracking-wide">STOP BORING FOOD</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-4 leading-tight">
            Your Friends Eat Better.
            <span className="text-[#06c167] block">
              Want to Know Why?
            </span>
          </h2>

          <p className="text-gray-700 text-base max-w-md mx-auto mb-3 leading-relaxed">
            They know the <span className="text-[#ff6b35] font-bold">₹100 momos</span> that taste better than ₹1000 restaurant ones.
          </p>

          <p className="text-gray-600 text-sm max-w-xs mx-auto leading-relaxed">
            While you're googling "food near me",
            <span className="text-[#06c167] font-semibold"> 500+ foodies</span> are eating at hidden gems.
          </p>
        </div>

        {/* Swipable Benefits Carousel for Mobile */}
        <div className="mb-10">
          <div className="relative">
            {/* Swipe hint indicator */}
            <div className="text-center mb-3">
              <p className="text-gray-400 text-xs flex items-center justify-center gap-2">
                <span className="animate-bounce">👈</span>
                Swipe to explore benefits
                <span className="animate-bounce">👉</span>
              </p>
            </div>

            <div 
              ref={carouselRef}
              className="relative overflow-hidden rounded-2xl touch-pan-y"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
            >
              <div 
                className="flex transition-all duration-300 ease-out"
                style={{ 
                  transform: `translateX(calc(-${activeSlide * 100}% + ${isDragging ? dragOffset : 0}px))`,
                  transition: isDragging ? 'none' : 'transform 300ms ease-out'
                }}
              >
                {benefits.map((benefit, index) => (
                  <div 
                    key={index} 
                    className="w-full flex-shrink-0 px-1"
                  >
                    <div className="relative bg-white p-6 rounded-2xl border-2 border-gray-200 shadow-md h-full">
                      {/* Badge if exists */}
                      {benefit.badge && (
                        <div className={`absolute -top-2 -right-2 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg ${
                          benefit.badge.includes('HOT') 
                            ? 'bg-gradient-to-r from-red-500 to-[#ff6b35] animate-pulse' 
                            : 'bg-gradient-to-r from-[#06c167] to-green-500'
                        }`}>
                          {benefit.badge}
                        </div>
                      )}

                      <div className={`w-12 h-12 ${
                        benefit.color === 'orange' ? 'bg-orange-100 border-orange-200' : 'bg-green-100 border-green-200'
                      } rounded-2xl flex items-center justify-center mb-4 border`}>
                        {benefit.icon}
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 mb-3">
                        {benefit.title}
                      </h3>
                      <p className="text-gray-700 text-sm leading-relaxed mb-4">
                        {benefit.description}
                      </p>
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                        benefit.color === 'orange' 
                          ? 'bg-green-50 text-[#06c167] border border-green-200' 
                          : 'bg-orange-50 text-[#ff6b35] border border-orange-200'
                      }`}>
                        {benefit.statIcon}
                        {benefit.stat}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Carousel Dots */}
            <div className="flex justify-center gap-2 mt-5">
              {benefits.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    activeSlide === index 
                      ? 'bg-[#06c167] w-8 h-2' 
                      : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            {/* Progress indicator */}
            <div className="flex justify-center items-center gap-2 mt-3">
              <span className="text-gray-500 text-xs font-medium">
                {activeSlide + 1} / {benefits.length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}