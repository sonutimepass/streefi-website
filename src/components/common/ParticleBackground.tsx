'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface ParticleBackgroundProps {
  particleColor?: string;
  particleCount?: number;
  speed?: number;
  useFoodIcons?: boolean; // New prop to toggle food icons
}

export default function ParticleBackground({
  particleColor = '#06c167',
  particleCount = 3000,
  speed = 2,
  useFoodIcons = false
}: ParticleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SETUP THREE.JS SCENE ---
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x000000, 0.002); 

    const camera = new THREE.PerspectiveCamera(
      75, 
      container.offsetWidth / container.offsetHeight, 
      0.1, 
      2000
    );
    camera.position.z = 1000;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true,
      antialias: true 
    });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 2. CREATE FOOD ICON TEXTURES ---
    const foodSVGs = [
      // Burger
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
        <circle cx="32" cy="32" r="30" fill="#FFD700"/>
        <path d="M20 28 h24 l-2 8 h-20 z" fill="#8B4513"/>
        <rect x="18" y="36" width="28" height="4" fill="#228B22" rx="2"/>
        <rect x="18" y="40" width="28" height="6" fill="#D2691E" rx="3"/>
      </svg>`,
      // Pizza
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
        <circle cx="32" cy="32" r="28" fill="#FF6347"/>
        <circle cx="24" cy="28" r="4" fill="#DC143C"/>
        <circle cx="38" cy="26" r="4" fill="#DC143C"/>
        <circle cx="28" cy="38" r="4" fill="#DC143C"/>
        <circle cx="40" cy="36" r="4" fill="#DC143C"/>
      </svg>`,
      // Hot Dog
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
        <ellipse cx="32" cy="32" rx="26" ry="12" fill="#F4A460"/>
        <ellipse cx="32" cy="32" rx="24" ry="8" fill="#8B4513"/>
        <path d="M12 30 Q32 28 52 30" stroke="#FFD700" stroke-width="2" fill="none"/>
      </svg>`,
      // Ice Cream
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
        <circle cx="32" cy="24" r="16" fill="#FFB6C1"/>
        <path d="M20 24 L32 52 L44 24 Z" fill="#DEB887"/>
      </svg>`,
      // Donut
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
        <circle cx="32" cy="32" r="24" fill="#FF69B4"/>
        <circle cx="32" cy="32" r="12" fill="transparent" stroke="#FFF" stroke-width="8"/>
        <circle cx="24" cy="22" r="2" fill="#FFD700"/>
        <circle cx="38" cy="26" r="2" fill="#87CEEB"/>
        <circle cx="28" cy="38" r="2" fill="#FF1493"/>
      </svg>`,
      // Taco
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="22" height="22">
        <path d="M10 40 Q32 10 54 40 Z" fill="#FFD700"/>
        <path d="M14 38 Q32 14 50 38" fill="#228B22"/>
        <circle cx="24" cy="32" r="3" fill="#DC143C"/>
        <circle cx="40" cy="32" r="3" fill="#FF6347"/>
      </svg>`
    ];

    const createTextureFromSVG = (svgString: string): THREE.Texture => {
      const blob = new Blob([svgString], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const texture = new THREE.TextureLoader().load(url);
      texture.needsUpdate = true;
      return texture;
    };

    let sprites: THREE.Sprite[] = [];

    if (useFoodIcons) {
      // Create sprite-based food icons
      const textures = foodSVGs.map(svg => createTextureFromSVG(svg));
      
      for (let i = 0; i < particleCount; i++) {
        const randomTexture = textures[Math.floor(Math.random() * textures.length)];
        const material = new THREE.SpriteMaterial({ 
          map: randomTexture,
          transparent: true,
          opacity: 0.8
        });
        
        const sprite = new THREE.Sprite(material);
        sprite.position.set(
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 2000,
          (Math.random() - 0.5) * 2000
        );
        
        // Randomize size
        const scale = 20 + Math.random() * 30;
        sprite.scale.set(scale, scale, 1);
        
        scene.add(sprite);
        sprites.push(sprite);
      }
    } else {
      // Original particle system
      const geometry = new THREE.BufferGeometry();
      const positions = [];
      const sizes = [];

      for (let i = 0; i < particleCount; i++) {
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        positions.push(x, y, z);
        sizes.push(Math.random() * 2);
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      
      const material = new THREE.PointsMaterial({
        color: new THREE.Color(particleColor),
        size: 2,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.8,
      });

      const starField = new THREE.Points(geometry, material);
      scene.add(starField);
    }

    // --- 3. INTERACTION STATE ---
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleResize = () => {
      camera.aspect = container.offsetWidth / container.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.offsetWidth, container.offsetHeight);
    };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / container.offsetWidth) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / container.offsetHeight) * 2 + 1;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // --- 4. ANIMATION LOOP ---
    let animationFrameId: number;

    const animate = () => {
      if (useFoodIcons) {
        // Animate food sprites
        sprites.forEach((sprite) => {
          sprite.position.z += speed * 5;
          
          // Add gentle rotation
          sprite.material.rotation += 0.01;

          // Fade-in/Fade-out based on distance (depth)
          // Far away (-1000) = fade in from 0
          // Close to camera (1000) = fade out to 0
          const normalizedZ = (sprite.position.z + 1000) / 2000; // 0 to 1
          
          if (normalizedZ < 0.15) {
            // Fade in when spawning (first 15% of journey)
            sprite.material.opacity = normalizedZ / 0.15 * 0.8;
          } else if (normalizedZ > 0.85) {
            // Fade out when approaching camera (last 15%)
            sprite.material.opacity = (1 - normalizedZ) / 0.15 * 0.8;
          } else {
            // Full opacity in the middle
            sprite.material.opacity = 0.8;
          }

          if (sprite.position.z > 1000) {
            sprite.position.z = -1000;
            sprite.position.x = (Math.random() - 0.5) * 2000;
            sprite.position.y = (Math.random() - 0.5) * 2000;
            sprite.material.opacity = 0; // Start invisible
          }
        });

        // Mouse interaction with scene rotation
        scene.rotation.y += 0.05 * (mouseX * 0.3 - scene.rotation.y);
        scene.rotation.x += 0.05 * (mouseY * 0.3 - scene.rotation.x);
      } else {
        // Original particle animation
        const firstChild = scene.children[0];
        if (firstChild && firstChild instanceof THREE.Points) {
          const positions = firstChild.geometry.attributes.position.array as Float32Array;
          
          for (let i = 2; i < positions.length; i += 3) {
            positions[i] += speed * 5;

            if (positions[i] > 1000) {
              positions[i] = -1000;
            }
          }
          firstChild.geometry.attributes.position.needsUpdate = true;

          targetX = mouseX * 0.5;
          targetY = mouseY * 0.5;
          
          firstChild.rotation.y += 0.05 * (targetX - firstChild.rotation.y);
          firstChild.rotation.x += 0.05 * (targetY - firstChild.rotation.x);
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      
      if (useFoodIcons) {
        sprites.forEach(sprite => {
          if (sprite.material.map) {
            sprite.material.map.dispose();
          }
          sprite.material.dispose();
        });
      } else {
        scene.children.forEach(child => {
          if (child instanceof THREE.Points) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
      
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [particleColor, particleCount, speed, useFoodIcons, isMounted]);

  if (!isMounted) {
    return (
      <div 
        className="absolute inset-0 w-full h-full z-0 pointer-events-none"
        style={{ background: 'transparent' }}
      />
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full z-0 pointer-events-none"
      style={{ background: 'transparent' }} // Ensure parent has a background color (e.g. black/white)
    />
  );
}