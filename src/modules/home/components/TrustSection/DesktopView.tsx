'use client';
import { Star } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export default function DesktopView() {
  const [isVisible, setIsVisible] = useState(false);
  const [counts, setCounts] = useState({ vendors: 0, Stories: 0, explorers: 0, rating: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
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

// Row 1 testimonials - scrolls left
  const testimonialsRow1 = [
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
      text: "must try app for local food experience. loved it!!",
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
  ];

  // Row 2 testimonials - scrolls right
  const testimonialsRow2 = [
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
    {
      name: "Krish Patel",
      location: "Gandhinagar",
      text: "Excellent service and great food recommendations! The app makes finding street food so easy.",
      avatar: "https://ui-avatars.com/api/?name=Krish+Patel&background=FFB6B9&color=fff&size=100",
      rating: 5,
      date: "October 5, 2025"
    },
    {
      name: "Jash Patel",
      location: "Ahmedabad",
      text: "Love the variety of dining options. The discount offers are fantastic!",
      avatar: "https://ui-avatars.com/api/?name=Jash+Patel&background=BAE1FF&color=fff&size=100",
      rating: 5,
      date: "October 12, 2025"
    },
    {
      name: "Ravi Sharma",
      location: "Gandhinagar",
      text: "Best app for discovering local food gems. The discounts are amazing too!",
      avatar: "https://ui-avatars.com/api/?name=Ravi+Sharma&background=C7CEEA&color=fff&size=100",
      rating: 5,
      date: "October 18, 2025"
    },
    {
      name: "Neha Shah",
      location: "Ahmedabad",
      text: "User-friendly interface and authentic reviews. Makes exploring street food much easier!",
      avatar: "https://ui-avatars.com/api/?name=Neha+Shah&background=FFDAC1&color=fff&size=100",
      rating: 5,
      date: "October 25, 2025"
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
  const TestimonialCard = ({ testimonial }: { testimonial: typeof testimonialsRow1[0] }) => (
    <div className="flex-shrink-0 w-[320px] bg-white backdrop-blur-sm rounded-xl p-5 border-2 border-gray-200 hover:border-[#06c167] transition-all duration-300 hover:shadow-lg group shadow-md">
      {/* Quote Icons */}
      <div className="flex justify-between items-start mb-3">
        <QuoteIcon className="text-[#06c167] w-6 h-6" />
        <QuoteIcon className="text-[#06c167] w-6 h-6 rotate-180" />
      </div>

      {/* User Info */}
      <div className="flex items-center gap-2 mb-3">
        <img
          src={testimonial.avatar}
          alt={testimonial.name}
          className="w-10 h-10 rounded-full object-cover border-2 border-[#06c167] group-hover:border-[#05a857] transition-colors"
        />
        <div>
          <p className="text-gray-900 font-semibold text-sm">{testimonial.name}</p>
          <p className="text-gray-600 text-xs">{testimonial.location}</p>
        </div>
      </div>

      {/* Review Text */}
      <p className="text-gray-700 text-sm leading-relaxed">
        {testimonial.text}
      </p>

      {/* Rating */}
      <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-200">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < testimonial.rating
              ? 'text-[#ff6b35] fill-[#ff6b35]'
              : 'text-gray-300'
              }`}
          />
        ))}
        <span className="text-gray-500 text-xs ml-2">Verified User</span>
      </div>
    </div>
  );

  return (
    <section id="reviews" className="relative py-20 bg-[#f0fdf4] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-green-500 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 px-6">
        {/* Stats Section */}
        <div ref={sectionRef} className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-8 mb-20 border-2 border-green-200 shadow-md">
          <div className="grid grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{counts.vendors}+</div>
              <div className="text-gray-700 text-lg">Active Vendors</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{counts.Stories}+</div>
              <div className="text-gray-700 text-lg">Stories Listed</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{counts.explorers}K+</div>
              <div className="text-gray-700 text-lg">Food Explorers</div>
            </div>
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 mb-2">{counts.rating}★</div>
              <div className="text-gray-700 text-lg">Average Rating</div>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials Section - Full Width */}
      <div className="relative px-10 lg:px-16">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-1 bg-green-100 px-4 py-2 rounded-full mb-4 border-2 border-green-200">
            <span className="text-[#06c167] text-sm font-medium">💬 REAL REVIEWS</span>
          </div>
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            What Our <span className="text-[#06c167]">Foodies</span> Say
          </h2>
          <p className="text-gray-600 text-xl max-w-2xl mx-auto">
            See how Streefi has transformed food experiences through their own words
          </p>
        </div>

        {/* Infinite Scroll Container */}
        <div className="space-y-8">

          {/* Row 1 - Scrolls Left */}
          <div className="relative overflow-hidden">
            {/* Gradient Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div className="flex gap-8 animate-scroll-left">
              {/* First set */}
              {testimonialsRow1.map((testimonial, index) => (
                <TestimonialCard key={`row1-a-${index}`} testimonial={testimonial} />
              ))}
              {/* Duplicate for seamless loop */}
              {testimonialsRow1.map((testimonial, index) => (
                <TestimonialCard key={`row1-b-${index}`} testimonial={testimonial} />
              ))}
            </div>
          </div>

          {/* Row 2 - Scrolls Right */}
          <div className="relative overflow-hidden">
            {/* Gradient Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>

            <div className="flex gap-8 animate-scroll-right">
              {/* First set */}
              {testimonialsRow2.map((testimonial, index) => (
                <TestimonialCard key={`row2-a-${index}`} testimonial={testimonial} />
              ))}
              {/* Duplicate for seamless loop */}
              {testimonialsRow2.map((testimonial, index) => (
                <TestimonialCard key={`row2-b-${index}`} testimonial={testimonial} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes scroll-left {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        @keyframes scroll-right {
          0% {
            transform: translateX(-50%);
          }
          100% {
            transform: translateX(0);
          }
        }
        
        .animate-scroll-left {
          animation: scroll-left 40s linear infinite;
        }
        
        .animate-scroll-right {
          animation: scroll-right 40s linear infinite;
        }
        
        .animate-scroll-left:hover,
        .animate-scroll-right:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}