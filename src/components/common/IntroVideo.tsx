'use client';
import { useRef, useEffect, useState } from 'react';

export default function IntroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleVideoEnd = () => {
    localStorage.setItem('seenIntro', 'true');
    setIsFadingOut(true);
    // Wait for fade animation to complete before removing from DOM
    setTimeout(() => {
      setShouldRender(false);
    }, 1000); // Match fade duration
  };

  const handleSkip = () => {
    localStorage.setItem('seenIntro', 'true');
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsFadingOut(true);
    setTimeout(() => {
      setShouldRender(false);
    }, 1000);
  };

  useEffect(() => {
    // Check if user has already seen the intro
    const hasSeenIntro = localStorage.getItem('seenIntro');
    if (hasSeenIntro) {
      setShouldRender(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Ensure video plays
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log('Video autoplay prevented:', error);
      });
    }

    return () => {
      if (video) {
        video.pause();
      }
    };
  }, []);

  // Don't render component after fade completes
  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-black transition-opacity duration-1000 ease-in-out ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      } ${isFadingOut ? 'pointer-events-none' : ''}`}
      aria-hidden={isFadingOut}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className={`w-full h-full object-cover transition-transform duration-[8000ms] ease-out ${
          isFadingOut ? 'scale-105' : 'scale-100'
        }`}
        muted
        playsInline
        preload="auto"
        onEnded={handleVideoEnd}
        onLoadedData={() => setIsLoaded(true)}
        aria-label="Streefi intro video"
      >
        <source src="/assets/Video Project.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Skip Intro Button */}
      <button
        onClick={handleSkip}
        className={`absolute bottom-8 right-8 text-white/70 hover:text-white text-sm font-medium tracking-wide transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50 px-4 py-2 rounded-full backdrop-blur-sm bg-black/20 ${
          isFadingOut ? 'opacity-0' : 'opacity-100'
        }`}
        aria-label="Skip intro video"
      >
        Skip Intro
      </button>

      {/* Loading Indicator - Only shows while video is loading */}
      <div
        className={`absolute inset-0 flex items-center justify-center bg-black transition-opacity duration-500 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    </div>
  );
}
