'use client';

import { useEffect, useRef, useState } from 'react';

interface Stat {
  value: number;
  label: string;
  suffix: string;
}

const stats: Stat[] = [
  { value: 10000, label: 'Foodies', suffix: 'K+' },
  { value: 500, label: 'Vendors', suffix: '+' },
  { value: 50, label: 'Cities', suffix: '+' },
  { value: 4.8, label: 'Rating', suffix: '★' }
];

export default function CountUpStats() {
  const [counts, setCounts] = useState<number[]>([0, 0, 0, 0]);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.5 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const intervals = stats.map((stat, index) => {
      const increment = stat.value / 50; // 50 steps for smooth animation
      let current = 0;

      return setInterval(() => {
        current += increment;
        if (current >= stat.value) {
          current = stat.value;
          clearInterval(intervals[index]);
        }
        setCounts(prev => {
          const newCounts = [...prev];
          newCounts[index] = current;
          return newCounts;
        });
      }, 40);
    });

    return () => intervals.forEach(interval => clearInterval(interval));
  }, [hasStarted]);

  const formatNumber = (num: number, index: number) => {
    if (index === 3) return num.toFixed(1); // Rating
    if (index === 0) return (num / 1000).toFixed(0); // Foodies in K
    return Math.floor(num).toString();
  };

  return (
    <div ref={containerRef} className="flex justify-center items-center gap-8 md:gap-12 flex-wrap">
      {stats.map((stat, index) => (
        <div key={index} className="flex flex-col items-center justify-center text-center">
          <div className="text-2xl md:text-3xl font-bold text-white">
            {formatNumber(counts[index], index)}{stat.suffix}
          </div>
          <div className="text-emerald-400 text-sm mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
