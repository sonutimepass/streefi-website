import React from 'react';

// Embedded SVG components for all testimonial avatars
const profileImages = {
  'anjali-brahmbhatt': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#F38181" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">AB</text>
    </svg>
  ),
  'bhavana-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#F38181" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">BP</text>
    </svg>
  ),
  'bhavesh-makwana': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">BM</text>
    </svg>
  ),
  'deepal-rathod': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">DR</text>
    </svg>
  ),
  'devam-prajapati': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FCBAD3" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">DP</text>
    </svg>
  ),
  'dhara-vaghela': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">DV</text>
    </svg>
  ),
  'dhaval-bharwad': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">DB</text>
    </svg>
  ),
  'hardev-vinzuda': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#A8D8EA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">HV</text>
    </svg>
  ),
  'harshil-vyas': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">HV</text>
    </svg>
  ),
  'hitesh-shah': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#F38181" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">HS</text>
    </svg>
  ),
  'indrajeet-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#AA96DA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">IP</text>
    </svg>
  ),
  'jash-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#BAE1FF" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">JP</text>
    </svg>
  ),
  'jignesh-mewada': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">JM</text>
    </svg>
  ),
  'kavita-jadeja': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">KJ</text>
    </svg>
  ),
  'kinjal-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FF6B6B" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">KP</text>
    </svg>
  ),
  'krish-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FFB6B9" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">KP</text>
    </svg>
  ),
  'manish-ninama': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#4ECDC4" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">MN</text>
    </svg>
  ),
  'mann-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#95E1D3" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">MP</text>
    </svg>
  ),
  'mansi-thakar': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">MT</text>
    </svg>
  ),
  'meena-parikh': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">MP</text>
    </svg>
  ),
  'neha-shah': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FFDAC1" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">NS</text>
    </svg>
  ),
  'niyati-joshi': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">NJ</text>
    </svg>
  ),
  'parthiv-gohil': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">PG</text>
    </svg>
  ),
  'patel-jay': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#FFFFD2" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#333" textAnchor="middle" dominantBaseline="central">PJ</text>
    </svg>
  ),
  'priyanka-zala': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">PZ</text>
    </svg>
  ),
  'rahul-chotaliya': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">RC</text>
    </svg>
  ),
  'ravi-sharma': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">RS</text>
    </svg>
  ),
  'rinkal-solanki': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">RS</text>
    </svg>
  ),
  'smit-gadhvi': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">SG</text>
    </svg>
  ),
  'suresh-patel': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">SP</text>
    </svg>
  ),
  'tushar-panchal': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">TP</text>
    </svg>
  ),
  'viral-gajjar': () => (
    <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
      <text x="50" y="50" fontFamily="Arial, sans-serif" fontSize="36" fontWeight="bold" fill="#fff" textAnchor="middle" dominantBaseline="central">VG</text>
    </svg>
  ),
} as const;

interface ProfileImageProps {
  name: string;
  className?: string;
  width?: number;
  height?: number;
}

export default function ProfileImage({ name, className = '', width, height }: ProfileImageProps) {
  const imageKey = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
  const ImageComponent = profileImages[imageKey as keyof typeof profileImages];
  
  if (!ImageComponent) {
    // Fallback for unknown profiles
    return (
      <svg 
        width={width || "100"} 
        height={height || "100"} 
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <rect width="100" height="100" fill="#C7CEEA" rx="50"/>
        <text 
          x="50" 
          y="50" 
          fontFamily="Arial, sans-serif" 
          fontSize="36" 
          fontWeight="bold" 
          fill="#fff" 
          textAnchor="middle" 
          dominantBaseline="central"
        >
          ?
        </text>
      </svg>
    );
  }

  const SvgElement = ImageComponent();
  
  // Apply custom width/height if provided
  if (width || height) {
    return React.cloneElement(SvgElement, {
      width: width || SvgElement.props.width,
      height: height || SvgElement.props.height,
      className
    });
  }

  return React.cloneElement(SvgElement, { className });
}
