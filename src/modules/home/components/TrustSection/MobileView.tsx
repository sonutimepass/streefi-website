'use client';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';

export default function MobileView() {
  const [isVisible, setIsVisible] = useState(false);
  const [counts, setCounts] = useState({ vendors: 0, Stories: 0, explorers: 0, rating: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const autoSlideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // All testimonials
  const testimonials = [
    {
      name: "Kinjal Patel",
      location: "Gandhinagar",
      text: "Amazing food and staff!! Loved loved it very much!! Service is outstanding!! Thank you streefi for this wonderful food and behaviour!! ♥️👌🏻👌🏻",
      avatar: "/assets/testimonials/kinjal-patel.svg",
      rating: 5,
      date: "September 18, 2025"
    },
    {
      name: "Manish Ninama",
      location: "Ahmedabad",
      text: "good service",
      avatar: "/assets/testimonials/manish-ninama.svg",
      rating: 5,
      date: "November 27, 2025"
    },
    {
      name: "Mann Patel",
      location: "Gandhinagar",
      text: "must try app for local food experience with convince at home. loved it!!",
      avatar: "/assets/testimonials/mann-patel.svg",
      rating: 5,
      date: "September 19, 2025"
    },
    {
      name: "Bhavana Patel",
      location: "Ahmedabad",
      text: "great use of this app",
      avatar: "/assets/testimonials/bhavana-patel.svg",
      rating: 5,
      date: "September 20, 2025"
    },
    {
      name: "Indrajeet Patel",
      location: "Gandhinagar",
      text: "One stop solution for your Street Cravings.",
      avatar: "/assets/testimonials/indrajeet-patel.svg",
      rating: 5,
      date: "September 18, 2025"
    },
    {
      name: "Devam Prajapati",
      location: "Ahmedabad",
      text: "best app👍🏻👍🏻",
      avatar: "/assets/testimonials/devam-prajapati.svg",
      rating: 5,
      date: "September 18, 2025"
    },
    {
      name: "Patel Jay",
      location: "Gandhinagar",
      text: "Nice App",
      avatar: "/assets/testimonials/patel-jay.svg",
      rating: 5,
      date: "September 28, 2025"
    },
    {
      name: "Hardev Vinzuda",
      location: "Ahmedabad",
      text: "Nice App",
      avatar: "/assets/testimonials/hardev-vinzuda.svg",
      rating: 5,
      date: "September 21, 2025"
    },
    {
    name: "Hitesh Shah",
    location: "Ahmedabad",
    text: "Paisa vasool app! 🤑 Got a good discount on my favorite maska bun stall just by paying through the app.",
    avatar: "/assets/testimonials/hitesh-shah.svg",
    rating: 5,
    date: "October 05, 2025"
  },
  {
    name: "Dhara Vaghela",
    location: "Gandhinagar",
    text: "Loved the explore feature. Found a new Gola center nearby that I never noticed before. Very helpful!",
    avatar: "/assets/testimonials/dhara-vaghela.svg",
    rating: 5,
    date: "October 12, 2025"
  },
  {
    name: "Smit Gadhvi",
    location: "Ahmedabad",
    text: "Easy to use. Just scan, pay and get discount. No need to carry cash for street food anymore.",
    avatar: "/assets/testimonials/smit-gadhvi.svg",
    rating: 4,
    date: "October 15, 2025"
  },
  {
    name: "Meena Ben Parikh",
    location: "Ahmedabad",
    text: "Very nice app for family outings. We found a great seating place using the map.",
    avatar: "/assets/testimonials/meena-parikh.svg",
    rating: 5,
    date: "October 20, 2025"
  },
  {
    name: "Rahul Chotaliya",
    location: "Gandhinagar",
    text: "best for street food lovers!! discount malyo at the stall.. happy customer! 👍🏻",
    avatar: "/assets/testimonials/rahul-chotaliya.svg",
    rating: 5,
    date: "October 22, 2025"
  },
  {
    name: "Priyanka Zala",
    location: "Ahmedabad",
    text: "The explore feature is so accurate. Found the best momos spot in IIM Road thanks to this.",
    avatar: "/assets/testimonials/priyanka-zala.svg",
    rating: 5,
    date: "October 25, 2025"
  },
  {
    name: "Jignesh Mewada",
    location: "Gandhinagar",
    text: "Good discounts and fast payment. Makes eating out very cheap and easy.",
    avatar: "/assets/testimonials/jignesh-mewada.svg",
    rating: 4,
    date: "October 28, 2025"
  },
  {
    name: "Anjali Brahmbhatt",
    location: "Ahmedabad",
    text: "I love how I can see all the vendors on one map. Payment was smooth and got 15% off!",
    avatar: "/assets/testimonials/anjali-brahmbhatt.svg",
    rating: 5,
    date: "November 02, 2025"
  },
  {
    name: "Parthiv Gohil",
    location: "Ahmedabad",
    text: "Superb experience at the live dhokla stall. App is very user friendly.",
    avatar: "/assets/testimonials/parthiv-gohil.svg",
    rating: 5,
    date: "November 05, 2025"
  },
  {
    name: "Deepal Rathod",
    location: "Gandhinagar",
    text: "Great way to find local food. The discount on dine-in is the cherry on top! 🍒",
    avatar: "/assets/testimonials/deepal-rathod.svg",
    rating: 5,
    date: "November 08, 2025"
  },
  {
    name: "Suresh Bhai Patel",
    location: "Ahmedabad",
    text: "v.good service and easy payment",
    avatar: "/assets/testimonials/suresh-patel.svg",
    rating: 5,
    date: "November 10, 2025"
  },
  {
    name: "Kavita Jadeja",
    location: "Gandhinagar",
    text: "Explore feature helps me find hygienic street food stalls. Payment through app is very convenient.",
    avatar: "/assets/testimonials/kavita-jadeja.svg",
    rating: 5,
    date: "November 12, 2025"
  },
  {
    name: "Tushar Panchal",
    location: "Ahmedabad",
    text: "College students mate best che! Every rupee saved matters and the discounts here are real.",
    avatar: "/assets/testimonials/tushar-panchal.svg",
    rating: 5,
    date: "November 15, 2025"
  },
  {
    name: "Rinkal Solanki",
    location: "Ahmedabad",
    text: "First time tried paying through app at a stall, got instant discount. Amazing concept!",
    avatar: "/assets/testimonials/rinkal-solanki.svg",
    rating: 4,
    date: "November 18, 2025"
  },
  {
    name: "Bhavesh Makwana",
    location: "Gandhinagar",
    text: "Mast app che. Local vendors na badha options ek j jagya par mali jay.",
    avatar: "/assets/testimonials/bhavesh-makwana.svg",
    rating: 5,
    date: "November 20, 2025"
  },
  {
    name: "Niyati Joshi",
    location: "Ahmedabad",
    text: "Saved 50 rupees on my dinner today! Just explore and pay. Highly recommended. ⭐⭐⭐⭐⭐",
    avatar: "/assets/testimonials/niyati-joshi.svg",
    rating: 5,
    date: "November 22, 2025"
  },
  {
    name: "Harshil Vyas",
    location: "Gandhinagar",
    text: "The best part is discovering food joints I never knew existed in my own area.",
    avatar: "/assets/testimonials/harshil-vyas.svg",
    rating: 5,
    date: "November 25, 2025"
  },
  {
    name: "Mansi Thakar",
    location: "Ahmedabad",
    text: "Smooth interface and genuine discounts. Best app for weekend foodies.",
    avatar: "/assets/testimonials/mansi-thakar.svg",
    rating: 5,
    date: "November 28, 2025"
  },
  {
    name: "Viral Gajjar",
    location: "Ahmedabad",
    text: "No more bargaining, the app gives the best price automatically. Loved it!",
    avatar: "/assets/testimonials/viral-gajjar.svg",
    rating: 5,
    date: "December 01, 2025"
  },
  {
    name: "Dhaval Bharwad",
    location: "Gandhinagar",
    text: "Khub saras app che. Food locations and offers are very helpful.",
    avatar: "/assets/testimonials/dhaval-bharwad.svg",
    rating: 5,
    date: "December 03, 2025"
  }
  ];

  // Minimum swipe distance (in px) - same as VendorSuccessSection
  const minSwipeDistance = 50;

  // Touch handlers (SAME LOGIC AS WORKING COMPONENT)
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

    if (isLeftSwipe && currentIndex < testimonials.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (isLeftSwipe && currentIndex === testimonials.length - 1) {
      setCurrentIndex(0); // Loop to start
    }

    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (isRightSwipe && currentIndex === 0) {
      setCurrentIndex(testimonials.length - 1); // Loop to end
    }

    setIsDragging(false);
    setDragOffset(0);
    setTouchStart(0);
    setTouchEnd(0);
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : testimonials.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex(prev => (prev < testimonials.length - 1 ? prev + 1 : 0));
  };

  // Auto-slide functionality (5-7 seconds random interval - SAME AS WORKING COMPONENT)
  useEffect(() => {
    const getRandomInterval = () => Math.floor(Math.random() * 2000) + 5000; // 5000-7000ms
    
    let autoSlide: NodeJS.Timeout;
    
    const startAutoSlide = () => {
      autoSlide = setTimeout(() => {
        if (!isDragging) {
          setCurrentIndex(prev => (prev < testimonials.length - 1 ? prev + 1 : 0));
        }
        startAutoSlide(); // Schedule next slide with new random interval
      }, getRandomInterval());
    };
    
    startAutoSlide();

    return () => clearTimeout(autoSlide);
  }, [isDragging, testimonials.length]);

  // Keep your existing intersection observer and counter animation logic
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;

    const targets = {
      vendors: 500,
      Stories: 50,
      explorers: 1,
      rating: 4.8
    };

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;

      setCounts({
        vendors: Math.floor(targets.vendors * progress),
        Stories: Math.floor(targets.Stories * progress),
        explorers: Math.floor(targets.explorers * progress),
        rating: parseFloat((targets.rating * progress).toFixed(1))
      });

      if (step >= steps) {
        clearInterval(timer);
        setCounts(targets);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isVisible]);

// Quote SVG Component
const QuoteIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M11.192 15.757c0-.88-.23-1.618-.69-2.217-.326-.412-.768-.683-1.327-.812-.55-.128-1.07-.137-1.54-.028-.16-.95.1-1.956.76-3.022.66-1.065 1.515-1.867 2.558-2.403L9.373 5c-.8.396-1.56.898-2.26 1.505-.71.607-1.34 1.305-1.9 2.094s-.98 1.68-1.25 2.69-.346 2.04-.217 3.1c.168 1.4.62 2.52 1.356 3.35.735.84 1.652 1.26 2.748 1.26.965 0 1.766-.29 2.4-.878.628-.576.94-1.365.94-2.368l.002.003zm9.124 0c0-.88-.23-1.618-.69-2.217-.326-.42-.77-.692-1.327-.817-.56-.124-1.074-.13-1.54-.022-.16-.94.09-1.95.75-3.02.66-1.06 1.514-1.86 2.557-2.4L18.49 5c-.8.396-1.555.898-2.26 1.505-.708.607-1.34 1.305-1.894 2.094-.556.79-.97 1.68-1.24 2.69-.273 1-.345 2.04-.217 3.1.168 1.4.62 2.52 1.356 3.35.735.84 1.652 1.26 2.748 1.26.965 0 1.766-.29 2.4-.878.628-.576.94-1.365.94-2.368l-.007.006z" />
  </svg>
);

// Testimonial Card Component
const TestimonialCard = ({ testimonial }: { testimonial: typeof testimonials[0] }) => (
  <div className="bg-white rounded-xl p-5 border-2 border-gray-200 shadow-lg select-none">
    {/* Quote Icons */}
    <div className="flex justify-between items-start mb-4">
      <QuoteIcon className="text-[#06c167] w-6 h-6" />
      <QuoteIcon className="text-[#06c167] w-6 h-6 rotate-180" />
    </div>

    {/* User Info */}
    <div className="flex items-center gap-3 mb-4">
      <img
        src={testimonial.avatar}
        alt={testimonial.name}
        className="w-12 h-12 rounded-full object-cover border-2 border-[#06c167]"
        draggable="false"
      />
      <div>
        <p className="text-gray-900 font-bold text-base">{testimonial.name}</p>
        <p className="text-gray-600 text-sm">{testimonial.location}</p>
      </div>
    </div>

    {/* Review Text */}
    <p className="text-gray-700 text-sm leading-relaxed mb-4 select-none">
      {testimonial.text}
    </p>

    {/* Rating */}
    <div className="flex items-center gap-1 pt-4 border-t border-gray-200">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${i < testimonial.rating
            ? 'text-[#ff6b35] fill-[#ff6b35]'
            : 'text-gray-300'
            }`}
        />
      ))}
      <span className="text-gray-500 text-sm ml-3">Verified</span>
      <span className="text-gray-400 text-sm ml-3">{testimonial.date}</span>
    </div>
  </div>
);

  return (
    <section id="reviews" className="relative py-5 overflow-hidden" style={{ background: '#f0fdf4' }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-40 h-40 bg-emerald-500 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 right-0 w-48 h-48 bg-green-500 rounded-full blur-2xl"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10 px-4">
        {/* Stats Section */}
        <div ref={sectionRef} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 mb-10 border-2 border-green-200 shadow-md">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">{counts.vendors}+</div>
              <div className="text-gray-700 text-sm">Active Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">{counts.Stories}+</div>
              <div className="text-gray-700 text-sm">Stories Listed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">{counts.explorers}K+</div>
              <div className="text-gray-700 text-sm">Food Explorers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">{counts.rating}★</div>
              <div className="text-gray-700 text-sm">Avg Rating</div>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1 bg-green-100 px-3 py-1 rounded-full mb-3 border-2 border-green-200">
            <span className="text-[#06c167] text-xs font-medium">💬 REAL REVIEWS</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            What Our <span className="text-[#06c167]">Foodies</span> Say
          </h2>
          <p className="text-gray-600 text-sm max-w-md mx-auto">
            See how Streefi has transformed food experiences
          </p>
        </div>

        {/* Swipeable Carousel Container */}
        <div className="relative mb-8">
          {/* Left Arrow Button */}
          <button
            onClick={goToPrevious}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 border border-gray-200 transition-all duration-200 active:scale-95"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-[#06c167]" />
          </button>

          {/* Right Arrow Button */}
          <button
            onClick={goToNext}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 border border-gray-200 transition-all duration-200 active:scale-95"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-[#06c167]" />
          </button>

          {/* Carousel */}
          <div className="relative px-10">
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
                  transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
                  transition: isDragging ? 'none' : 'transform 300ms ease-out'
                }}
              >
                {testimonials.map((testimonial, index) => (
                  <div
                    key={index}
                    className="w-full flex-shrink-0 px-2"
                  >
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`transition-all duration-300 rounded-full ${
                    currentIndex === index
                      ? 'bg-[#06c167] w-6 h-2'
                      : 'bg-gray-300 w-2 h-2 hover:bg-gray-400'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for scrollbar hide and animations */}
<style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        /* UNIQUE: Floating Gradient Scrollbar */
        ::-webkit-scrollbar {
          height: 6px; /* Slimmer height */
          width: 6px;
        }
        
        /* Transparent track to make the thumb look like it's floating */
        ::-webkit-scrollbar-track {
          background: transparent; 
          margin: 2px;
        }
        
        /* Gradient Thumb with "Pill" shape */
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(90deg, #06c167, #34d399); /* Green to Teal gradient */
          border-radius: 20px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        /* Hover effect to darken the gradient */
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(90deg, #05a857, #10b981);
        }
        
        /* Pulse animation (Kept from your original code) */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.8);
          }
        }
        
        .animate-pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}