'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';

// S3 CDN base URL for videos (local backup available at /assets/videos/)
const S3_BASE_URL = 'https://videos.streefi.in/videos/real-results';

const videos = [
  `${S3_BASE_URL}/videos-1.mp4`,
  `${S3_BASE_URL}/videos-2.mp4`,
  `${S3_BASE_URL}/videos-3.mp4`,
  `${S3_BASE_URL}/videos-4.mp4`,
  `${S3_BASE_URL}/videos-5.mp4`,
  `${S3_BASE_URL}/videos-6.mp4`,
  `${S3_BASE_URL}/videos-7.mp4`,
  `${S3_BASE_URL}/videos-8.mp4`,
  `${S3_BASE_URL}/videos-9.mp4`,
  `${S3_BASE_URL}/videos-10.mp4`,
  `${S3_BASE_URL}/videos-11.mp4`,
  `${S3_BASE_URL}/videos-12.mp4`,
  `${S3_BASE_URL}/videos-13.mp4`,
  `${S3_BASE_URL}/videos-14.mp4`
];

const CARD_WIDTH = 280;
const GAP = 24;
const TOTAL_ITEM_WIDTH = CARD_WIDTH + GAP;
const VIDEO_COUNT = videos.length;
const extendedVideos = [...videos, ...videos, ...videos];
const PRELOAD_RANGE = 3; // Preload 3 videos on each side for optimal performance

// Memoized Video Card Component for performance
const VideoCard = memo(function VideoCard({
  src,
  index,
  isActive,
  isNearby,
  isMuted,
  isPlaying,
  onVideoRef
}: {
  src: string;
  index: number;
  isActive: boolean;
  isNearby: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  onVideoRef: (el: HTMLVideoElement | null, index: number) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fast play/pause using direct ref manipulation
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isMuted;
      if (isPlaying) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    } else {
      video.pause();
      if (video.currentTime > 0) {
        video.currentTime = 0;
      }
      video.muted = true;
    }
  }, [isActive, isMuted, isPlaying]);

  // Ensure the video is muted initially for autoplay compliance
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = true;
    }
  }, []);

  // Register ref with parent
  useEffect(() => {
    onVideoRef(videoRef.current, index);
    return () => onVideoRef(null, index);
  }, [index, onVideoRef]);

  return (
    <div
      className={`relative shrink-0 rounded-2xl overflow-hidden bg-black transition-all duration-500
        ${isActive ? 'scale-100 opacity-100 z-10' : 'scale-90 opacity-50'}
      `}
      style={{ width: CARD_WIDTH, height: 450 }}
    >
      {/* Only render video if nearby for lazy loading */}
      {isNearby ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload="auto"
          poster=""
          crossOrigin="anonymous"
          onError={(e) => {
            // Fallback to local video if S3 fails
            const video = e.currentTarget;
            if (video.src.includes('s3')) {
              const videoNumber = src.match(/videos-(\d+)\.mp4/)?.[0];
              if (videoNumber) {
                video.src = `/assets/videos/${videoNumber}`;
              }
            }
          }}
        />
      ) : (
        <div className="w-full h-full bg-gray-900" />
      )}
    </div>
  );
});

export default function VideoCarousel() {
  const [currentIndex, setCurrentIndex] = useState(VIDEO_COUNT);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isMuted = useRef(true);
  const isPlaying = useRef(false);
  const [, forceUpdate] = useState({});

  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement | null>>(new Map());

  // Video ref callback
  const handleVideoRef = useCallback((el: HTMLVideoElement | null, index: number) => {
    if (el) {
      videoRefs.current.set(index, el);
    } else {
      videoRefs.current.delete(index);
    }
  }, []);

  // Check if video is nearby (should be loaded)
  const isNearby = useCallback((index: number) => {
    const diff = Math.abs(index - currentIndex);
    return diff <= PRELOAD_RANGE || diff >= extendedVideos.length - PRELOAD_RANGE;
  }, [currentIndex]);

  /* =========================
     INFINITE LOOP FIX
     ========================= */
  useEffect(() => {
    if (!isTransitioning) return;

    const timer = setTimeout(() => {
      if (currentIndex >= VIDEO_COUNT * 2) {
        setIsTransitioning(false);
        setCurrentIndex(currentIndex - VIDEO_COUNT);
      } else if (currentIndex < VIDEO_COUNT) {
        setIsTransitioning(false);
        setCurrentIndex(currentIndex + VIDEO_COUNT);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [currentIndex, isTransitioning]);

  useEffect(() => {
    if (!isTransitioning) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => setIsTransitioning(true))
      );
    }
  }, [isTransitioning]);

  /* =========================
     DRAG HANDLERS
     ========================= */
  const handleDragStart = useCallback((clientX: number) => {
    setIsTransitioning(false);
    isDragging.current = true;
    startX.current = clientX;
    currentTranslate.current = -(currentIndex * TOTAL_ITEM_WIDTH);
  }, [currentIndex]);

  const handleDragMove = useCallback((clientX: number) => {
    if (!isDragging.current || !containerRef.current) return;
    const diff = clientX - startX.current;
    containerRef.current.style.transform =
      `translateX(calc(50vw - ${CARD_WIDTH / 2}px + ${currentTranslate.current + diff}px))`;
  }, []);

  const handleDragEnd = useCallback((clientX: number) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setIsTransitioning(true);

    const diff = clientX - startX.current;
    const threshold = CARD_WIDTH / 4;

    if (diff < -threshold) setCurrentIndex(i => i + 1);
    else if (diff > threshold) setCurrentIndex(i => i - 1);
  }, []);

  /* =========================
     NAVIGATION
     ========================= */
  const goToPrev = useCallback(() => {
    setCurrentIndex(i => i - 1);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex(i => i + 1);
  }, []);

  /* =========================
     CONTROLS - Using refs for instant response
     ========================= */
  const togglePlay = useCallback(() => {
    isPlaying.current = !isPlaying.current;
    const video = videoRefs.current.get(currentIndex);
    if (video) {
      if (isPlaying.current) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
    forceUpdate({});
  }, [currentIndex]);

  const toggleMute = useCallback(() => {
    isMuted.current = !isMuted.current;
    const video = videoRefs.current.get(currentIndex);
    if (video) {
      video.muted = isMuted.current;
    }
    forceUpdate({});
  }, [currentIndex]);

  return (
    <section className="relative w-full py-10 bg-[#f0fdf4] overflow-hidden select-none">
      {/* Left Navigation Button */}
      <button
        onClick={goToPrev}
        className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Previous video"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>

      {/* Right Navigation Button */}
      <button
        onClick={goToNext}
        className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white shadow-lg transition-all duration-300 hover:scale-110"
        aria-label="Next video"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>

      <div
        className="relative h-[500px] w-full flex items-center cursor-grab active:cursor-grabbing"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={e => handleDragEnd(e.clientX)}
        onMouseLeave={e => isDragging.current && handleDragEnd(e.clientX)}
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientX)}
      >
        <div
          ref={containerRef}
          className="flex absolute left-0 will-change-transform"
          style={{
            transform: `translateX(calc(50vw - ${CARD_WIDTH / 2}px - ${currentIndex * TOTAL_ITEM_WIDTH}px))`,
            transition: isTransitioning ? 'transform 500ms cubic-bezier(0.2,0.8,0.2,1)' : 'none',
            gap: GAP
          }}
        >
          {extendedVideos.map((src, index) => {
            const isActive = index === currentIndex;
            return (
              <VideoCard
                key={index}
                src={src}
                index={index}
                isActive={isActive}
                isNearby={isNearby(index)}
                isMuted={isMuted.current}
                isPlaying={isPlaying.current}
                onVideoRef={handleVideoRef}
              />
            );
          })}
        </div>
      </div>

      {/* Controls - Fixed position at bottom */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-20 flex gap-4">
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label={isPlaying.current ? 'Pause' : 'Play'}
        >
          {isPlaying.current ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653Z" />
            </svg>
          )}
        </button>
        <button
          onClick={toggleMute}
          className="w-12 h-12 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center text-white shadow-lg transition-all duration-200 hover:scale-110 active:scale-95"
          aria-label={isMuted.current ? 'Unmute' : 'Mute'}
        >
          {isMuted.current ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
            </svg>
          )}
        </button>
      </div>
    </section>
  );
}
