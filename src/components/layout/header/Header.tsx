'use client';
import Link from 'next/link';
import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';

function Header() {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      router.push('/');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <header
      className="hidden md:flex fixed left-1/2 top-[4svh] z-[999] items-center justify-between bg-[#06C167] text-white rounded-full h-[50px] xl:h-[58px] 2xl:h-[62px] w-[90vw] max-w-[620px] xl:max-w-[750px] 2xl:max-w-[850px] px-4 md:px-6 xl:px-8"
      style={{ 
        boxShadow: '0px 34px 34px 0px rgba(0, 0, 0, 0.08)',
        transform: `translate(-50%, ${isVisible ? '0' : '-200%'})`,
        opacity: isVisible ? 1 : 0,
        transition: 'transform 0.5s ease-in-out, opacity 0.5s ease-in-out'
      }}
    >
      <button 
        onClick={() => scrollToSection('why-streefi')} 
        className="hover:text-slate-900 transition-colors duration-200 whitespace-nowrap text-sm md:text-base xl:text-lg font-medium"
      >
        How it works
      </button>

      <button 
        onClick={() => scrollToSection('features')} 
        className="hover:text-slate-900 transition-colors duration-200 text-sm md:text-base xl:text-lg font-medium"
      >
        Features
      </button>

      <button 
        onClick={() => router.push('/')} 
        className="font-bold text-2xl md:text-3xl xl:text-4xl 2xl:text-5xl hover:text-slate-900 transition-colors duration-200 px-2 md:px-4"
      >
        Streefi
      </button>

      <button 
        onClick={() => router.push('/policies/support')} 
        className="hover:text-slate-900 transition-colors duration-200 text-sm md:text-base xl:text-lg font-medium"
      >
        Support
      </button>

      <button 
        onClick={() => router.push('/policies/policy')} 
        className="hover:text-slate-900 transition-colors duration-200 text-sm md:text-base xl:text-lg font-medium"
      >
        Policies
      </button>

      <button 
        onClick={() => router.push('/vendor')} 
        className="hover:text-slate-900 transition-colors duration-200 text-sm md:text-base xl:text-lg font-medium"
      >
        Vendor
      </button>
    </header>
  );
}

export default memo(Header);