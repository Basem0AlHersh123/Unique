"use client";

import { useEffect, useState } from "react";

export default function ParticlesBackground() {
  const [particles, setParticles] = useState<{ id: number; x: number; delay: number; size: number; duration: number }[]>([]);

  useEffect(() => {
    const count = 50;
    const newParticles = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 20,
      size: Math.random() * 3 + 2,
      duration: Math.random() * 20 + 15,
    }));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setParticles(newParticles);
  }, []);

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
          }}
        />
      ))}
    </div>
  );
}