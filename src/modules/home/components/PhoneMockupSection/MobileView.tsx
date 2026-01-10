'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';

const videos = [
  '/assets/videos/videos-1.mp4',
  '/assets/videos/videos-2.mp4',
  '/assets/videos/videos-3.mp4',
  '/assets/videos/videos-4.mp4',
  '/assets/videos/videos-5.mp4',
  '/assets/videos/videos-6.mp4',
  '/assets/videos/videos-7.mp4',
  '/assets/videos/videos-8.mp4',
  '/assets/videos/videos-9.mp4',
  '/assets/videos/videos-10.mp4',
  '/assets/videos/videos-11.mp4',
  '/assets/videos/videos-12.mp4',
  '/assets/videos/videos-13.mp4',
  '/assets/videos/videos-14.mp4'
];

// Adjusted for mobile: slightly narrower than desktop to fit screen widths
const CARD_WIDTH = 240; 
const GAP = 16;
const TOTAL_ITEM_WIDTH = CARD_WIDTH + GAP;
const VIDEO_COUNT = videos.length;
const extendedVideos = [...videos, ...videos, ...videos];
const PRELOAD_RANGE = 2;

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
      if (video.currentTime > 0) video.currentTime = 0;
      video.muted = true;
    }
  }, [isActive, isMuted, isPlaying]);

  useEffect(() => {
    onVideoRef(videoRef.current, index);
    return () => onVideoRef(null, index);
  }, [index, onVideoRef]);

  return (
    <div
      className={`relative shrink-0 rounded-[2.5rem] overflow-hidden bg-black transition-all duration-500 border-4 border-gray-800 shadow-xl
        ${isActive ? 'scale-100 opacity-100 z-10' : 'scale-90 opacity-40'}
      `}
      style={{ width: CARD_WIDTH, height: 480 }}
    >
      {isNearby ? (
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-cover"
          loop
          playsInline
          preload={isActive ? 'auto' : 'metadata'}
        />
      ) : (
        <div className="w-full h-full bg-gray-900" />
      )}
    </div>
  );
});

export default function MobileView() {
  const [currentIndex, setCurrentIndex] = useState(VIDEO_COUNT);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isMuted = useRef(true);
  const isPlaying = useRef(true);
  const [, forceUpdate] = useState({});

  const isDragging = useRef(false);
  const startX = useRef(0);
  const currentTranslate = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<number, HTMLVideoElement | null>>(new Map());

  const handleVideoRef = useCallback((el: HTMLVideoElement | null, index: number) => {
    if (el) videoRefs.current.set(index, el);
    else videoRefs.current.delete(index);
  }, []);

  const isNearby = useCallback((index: number) => {
    const diff = Math.abs(index - currentIndex);
    return diff <= PRELOAD_RANGE || diff >= extendedVideos.length - PRELOAD_RANGE;
  }, [currentIndex]);

  // Infinite Loop Logic
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
      requestAnimationFrame(() => requestAnimationFrame(() => setIsTransitioning(true)));
    }
  }, [isTransitioning]);

  // Interaction Handlers
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
    if (diff < -50) setCurrentIndex(i => i + 1);
    else if (diff > 50) setCurrentIndex(i => i - 1);
  }, []);

  const togglePlay = useCallback(() => {
    isPlaying.current = !isPlaying.current;
    const video = videoRefs.current.get(currentIndex);
    if (video) isPlaying.current ? video.play() : video.pause();
    forceUpdate({});
  }, [currentIndex]);

  const toggleMute = useCallback(() => {
    isMuted.current = !isMuted.current;
    const video = videoRefs.current.get(currentIndex);
    if (video) video.muted = isMuted.current;
    forceUpdate({});
  }, [currentIndex]);

  const handlePrev = useCallback(() => {
    setCurrentIndex(i => i - 1);
  }, []);

  const handleNext = useCallback(() => {
    setCurrentIndex(i => i + 1);
  }, []);

  return (
    <section className="relative w-full py-1 bg-[#f0fdf4] overflow-hidden select-none">
      <div className="text-center mb-2 px-4">
        <h2 className="text-gray-600 text-sm max-w-xs mx-auto">
          Swipe through to see our street food discovery in action
        </h2>
      </div>

      <div
        className="relative h-[520px] w-full flex items-center touch-pan-y"
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={e => handleDragEnd(e.clientX)}
        onMouseLeave={() => isDragging.current && handleDragEnd(startX.current)}
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
          {extendedVideos.map((src, index) => (
            <VideoCard
              key={index}
              src={src}
              index={index}
              isActive={index === currentIndex}
              isNearby={isNearby(index)}
              isMuted={isMuted.current}
              isPlaying={isPlaying.current}
              onVideoRef={handleVideoRef}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform hover:bg-black/80"
          aria-label="Previous video"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M15 18l-6-6 6-6" /></svg>
        </button>

        <button
          onClick={handleNext}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform hover:bg-black/80"
          aria-label="Next video"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M9 18l6-6-6-6" /></svg>
        </button>

        {/* Control Buttons - Moved inside phone container */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-20 pointer-events-none">
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform pointer-events-auto hover:bg-black/80"
          >
            {isPlaying.current ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>
          <button
            onClick={toggleMute}
            className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform pointer-events-auto hover:bg-black/80"
          >
            {isMuted.current ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
            )}
          </button>
        </div>
      </div>

    </section>
  );
}