'use client';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function MobileView() {
  const [isVisible, setIsVisible] = useState(false);
  const [counts, setCounts] = useState({ vendors: 0, Stories: 0, explorers: 0, rating: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [translateX, setTranslateX] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<HTMLDivElement[]>([]);

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || !carouselRef.current) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleTouchEnd = () => {
    if (!isDragging || !carouselRef.current) return;
    
    setIsDragging(false);
    
    // Determine swipe direction
    const swipeThreshold = 50;
    if (translateX < -swipeThreshold) {
      // Swipe left
      if (currentIndex < testimonials.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Loop back to start
        setCurrentIndex(0);
      }
    } else if (translateX > swipeThreshold) {
      // Swipe right
      if (currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      } else {
        // Loop to end
        setCurrentIndex(testimonials.length - 1);
      }
    }
    
    setTranslateX(0);
  };

  // Mouse drag handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !carouselRef.current) return;
    
    const currentX = e.clientX;
    const diff = currentX - startX;
    setTranslateX(diff);
  };

  const handleMouseUp = () => {
    handleTouchEnd(); // Reuse same logic
  };

  // Auto-rotate carousel
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => prev === testimonials.length - 1 ? 0 : prev + 1);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isVisible]);

  // Original intersection observer and counter logic
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

  // All testimonials
  const testimonials = [
    {
      name: "Kinjal Patel",
      location: "Gandhinagar",
      text: "Amazing food and staff!! Loved loved it very much!! Service is outstanding!! Thank you streefi for this wonderful food and behaviour!! ♥️👌🏻👌🏻",
      avatar: "https://ui-avatars.com/api/?name=Kinjal+Patel&background=FF6B6B&color=fff&size=100",
      rating: 5,
      date: "September 18, 2025"
    },
    {
      name: "Manish Ninama",
      location: "Ahmedabad",
      text: "good service",
      avatar: "https://ui-avatars.com/api/?name=Manish+Ninama&background=4ECDC4&color=fff&size=100",
      rating: 5,
      date: "November 27, 2025"
    },
    {
      name: "Mann Patel",
      location: "Gandhinagar",
      text: "must try app for local food experience with convince at home. loved it!!",
      avatar: "https://ui-avatars.com/api/?name=Mann+Patel&background=95E1D3&color=fff&size=100",
      rating: 5,
      date: "September 19, 2025"
    },
    {
      name: "Bhavana Patel",
      location: "Ahmedabad",
      text: "great use of this app",
      avatar: "https://ui-avatars.com/api/?name=Bhavana+Patel&background=F38181&color=fff&size=100",
      rating: 5,
      date: "September 20, 2025"
    },
    {
      name: "Indrajeet Patel",
      location: "Gandhinagar",
      text: "One stop solution for your Street Cravings.",
      avatar: "https://ui-avatars.com/api/?name=Indrajeet+Patel&background=AA96DA&color=fff&size=100",
      rating: 5,
      date: "September 18, 2025"
    },
    {
      name: "Devam Prajapati",
      location: "Ahmedabad",
      text: "best app👍🏻👍🏻",
      avatar: "https://ui-avatars.com/api/?name=Devam+Prajapati&background=FCBAD3&color=fff&size=100",
      rating: 5,
      date: "September 18, 2025"
    },
    {
      name: "Patel Jay",
      location: "Gandhinagar",
      text: "Nice App",
      avatar: "https://ui-avatars.com/api/?name=Patel+Jay&background=FFFFD2&color=333&size=100",
      rating: 5,
      date: "September 28, 2025"
    },
    {
      name: "Hardev Vinzuda",
      location: "Ahmedabad",
      text: "Nice App",
      avatar: "https://ui-avatars.com/api/?name=Hardev+Vinzuda&background=A8D8EA&color=fff&size=100",
      rating: 5,
      date: "September 21, 2025"
    },
  ];

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
  const TestimonialCard = ({ testimonial, index }: { testimonial: typeof testimonials[0], index: number }) => (
    <div
      ref={el => { cardRefs.current[index] = el!; }}
      className="flex-shrink-0 w-[calc(100vw-3rem)] mx-2 bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-[#06c167] transition-all duration-300 shadow-lg"
      style={{
        transform: `scale(${index === currentIndex ? 1 : 0.95})`,
        opacity: index === currentIndex ? 1 : 0.7,
        transition: 'transform 0.3s ease, opacity 0.3s ease'
      }}
    >
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
        />
        <div>
          <p className="text-gray-900 font-bold text-base">{testimonial.name}</p>
          <p className="text-gray-600 text-sm">{testimonial.location}</p>
        </div>
      </div>

      {/* Review Text */}
      <p className="text-gray-700 text-sm leading-relaxed mb-4">
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
        <span className="text-gray-400 text-sm ml-auto">{testimonial.date}</span>
      </div>
    </div>
  );

  return (
    <section id="reviews" className="relative py-10 bg-white overflow-hidden">
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
          {/* Navigation Buttons */}
          <button
            onClick={() => setCurrentIndex(prev => prev === 0 ? testimonials.length - 1 : prev - 1)}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          
          <button
            onClick={() => setCurrentIndex(prev => prev === testimonials.length - 1 ? 0 : prev + 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 bg-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          {/* Carousel */}
          <div
            ref={carouselRef}
            className="overflow-hidden py-4"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{
                transform: `translateX(calc(-${currentIndex * (100 / testimonials.length)}% + ${translateX}px))`,
                width: `${testimonials.length * 100}%`
              }}
            >
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className="flex justify-center px-2"
                  style={{ width: `${100 / testimonials.length}%` }}
                >
                  <TestimonialCard testimonial={testimonial} index={index} />
                </div>
              ))}
            </div>
          </div>

          {/* Progress Indicators */}
          <div className="flex justify-center items-center gap-4 mt-6">
            <div className="flex items-center gap-1.5">
              {testimonials.slice(0, 6).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex 
                      ? 'bg-[#06c167] w-6' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Swipe Instruction */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#06c167] rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-[#06c167] rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-[#06c167] rounded-full animate-pulse delay-300"></div>
            </div>
            <span className="text-xs text-gray-500">Swipe or drag to navigate</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-[#06c167] rounded-full animate-pulse delay-300"></div>
              <div className="w-2 h-2 bg-[#06c167] rounded-full animate-pulse delay-150"></div>
              <div className="w-2 h-2 bg-[#06c167] rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* View More Button */}
        <div className="text-center">
          <button className="bg-[#06c167] text-white font-semibold py-3 px-6 rounded-full hover:bg-[#05a857] transition-colors text-sm shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-transform">
            View All Reviews
          </button>
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
        
        /* Custom scrollbar for carousel */
        ::-webkit-scrollbar {
          height: 4px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #06c167;
          border-radius: 10px;
        }
        
        /* Pulse animation for swipe indicator */
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