"use client";

import { useEffect, useState } from "react";

interface Particle {
  id: number;
  x: number;
  delay: number;
  size: number;
  duration: number;
  hue: number;
}

export default function ParticlesBackground() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    const count = isMobile ? 25 : 50;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 20,
      size: Math.random() * 3 + 2,
      duration: Math.random() * 20 + 15,
      hue: Math.floor(Math.random() * 60) + 240, // purple-blue range
    }));
    setParticles(newParticles);

    return () => window.removeEventListener("resize", checkMobile);
  }, [isMobile]);

  return (
    <div className="particles-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="particle"
          style={{
            left: `${p.x}%`,
            animationDelay: `${p.delay}s`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            background: `hsl(${p.hue}, 70%, 65%)`,
            boxShadow: `0 0 ${p.size * 3}px hsla(${p.hue}, 70%, 65%, 0.2)`,
          }}
        />
      ))}
    </div>
  );
}