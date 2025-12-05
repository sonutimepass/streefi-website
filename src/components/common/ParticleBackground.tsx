'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ParticleBackgroundProps {
  particleColor?: string;
  particleCount?: number;
  speed?: number;
}

export default function ParticleBackground({
  particleColor = '#4285F4', // Google Blue
  particleCount = 2000,      // High count for dense starfield
  speed = 2                  // Speed of the "liftoff"
}: ParticleBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SETUP THREE.JS SCENE ---
    const scene = new THREE.Scene();
    
    // Add subtle fog to fade particles into the distance
    scene.fog = new THREE.FogExp2(0x000000, 0.002); 

    const camera = new THREE.PerspectiveCamera(
      75, 
      container.offsetWidth / container.offsetHeight, 
      0.1, 
      2000
    );
    // Position camera inside the tunnel
    camera.position.z = 1000;

    const renderer = new THREE.WebGLRenderer({ 
      alpha: true, // Transparent background
      antialias: true 
    });
    renderer.setSize(container.offsetWidth, container.offsetHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // --- 2. CREATE PARTICLES ---
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    // Create thousands of random points in a 3D box
    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 2000;
      const y = (Math.random() - 0.5) * 2000;
      const z = (Math.random() - 0.5) * 2000;
      positions.push(x, y, z);
      
      // Randomize size for depth variation
      sizes.push(Math.random() * 2);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    
    // Material: Uses a simple circle/square sprite
    const material = new THREE.PointsMaterial({
      color: new THREE.Color(particleColor),
      size: 2,
      sizeAttenuation: true, // Particles get smaller when far away (Essential for 3D look)
      transparent: true,
      opacity: 0.8,
    });

    const starField = new THREE.Points(geometry, material);
    scene.add(starField);

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
      // Normalize mouse position from -1 to 1
      const rect = container.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / container.offsetWidth) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / container.offsetHeight) * 2 + 1;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    // --- 4. ANIMATION LOOP ---
    let animationFrameId: number;

    const animate = () => {
      // 1. Move particles towards camera (The "Warp" effect)
      const positions = geometry.attributes.position.array as Float32Array;
      
      for (let i = 2; i < positions.length; i += 3) {
        positions[i] += speed * 5; // Move Z coordinate

        // If particle passes the camera, reset it to the far distance
        if (positions[i] > 1000) {
          positions[i] = -1000;
          
          // Optional: Reshuffle X/Y for randomness
          // positions[i-2] = (Math.random() - 0.5) * 2000; // X
          // positions[i-1] = (Math.random() - 0.5) * 2000; // Y
        }
      }
      geometry.attributes.position.needsUpdate = true; // Tell GPU to update positions

      // 2. Camera Rotation (Mouse Interaction)
      // Smoothly interpolate current rotation to target rotation
      targetX = mouseX * 0.5;
      targetY = mouseY * 0.5;
      
      starField.rotation.y += 0.05 * (targetX - starField.rotation.y);
      starField.rotation.x += 0.05 * (targetY - starField.rotation.x);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // --- CLEANUP ---
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
      
      // Dispose Three.js resources to prevent memory leaks
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [particleColor, particleCount, speed]);

  return (
    <div 
      ref={containerRef} 
      className="absolute inset-0 w-full h-full -z-10"
      style={{ background: 'transparent' }} // Ensure parent has a background color (e.g. black/white)
    />
  );
}