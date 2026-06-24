"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  hue: number;
}

function generateParticles(): Particle[] {
  return Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 6,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 3,
    hue: Math.floor(Math.random() * 360),
  }));
}

export function LoadingScreen() {
  const [mounted, setMounted] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const messages = [
    "جاري التحميل...",
    "Loading...",
    "يُحضّر التجربة...",
    "Preparing your experience...",
  ];

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
    setParticles(generateParticles());
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-background flex items-center justify-center overflow-hidden">
      {/* Ambient particles — client only to avoid hydration mismatch */}
      {mounted && particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            backgroundColor: `hsl(${p.hue}, 80%, 60%)`,
            boxShadow: `0 0 ${p.size * 2}px hsl(${p.hue}, 80%, 60%)`,
          }}
        />
      ))}

      {/* Radial glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-primary/10 via-primary-dark/10 to-accent/10 blur-[100px] animate-pulse-slow" />

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-8 z-10">
        {/* Logo container with morphing border */}
        <div className="relative animate-morph-container">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary via-primary-dark to-accent opacity-20 blur-2xl animate-spin-slow" />

          {/* Logo */}
          <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-surface border-2 border-border/50 flex items-center justify-center shadow-2xl animate-logo-dance">
            <Image
              src="/logo.svg"
              alt="UNIQUE"
              width={80}
              height={80}
              className="w-16 h-16 sm:w-20 sm:h-20 animate-logo-spin"
              style={{
                filter: "drop-shadow(0 0 8px rgba(110, 36, 226, 0.4))",
              }}
            />
          </div>
        </div>

        {/* Animated dots */}
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-dot-bounce" />
          <span className="w-2.5 h-2.5 rounded-full bg-primary-dark animate-dot-bounce" style={{ animationDelay: "0.15s" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-accent animate-dot-bounce" style={{ animationDelay: "0.3s" }} />
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-dot-bounce" style={{ animationDelay: "0.45s" }} />
        </div>

        {/* Loading text */}
        <p
          key={messageIndex}
          className="text-lg font-medium text-text-secondary animate-fade-in-up"
        >
          {messages[messageIndex]}
        </p>
      </div>

      <style jsx>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes logo-dance {
          0%, 100% {
            transform: translateY(0) scale(1) rotate(0deg);
            box-shadow: 0 0 20px rgba(110, 36, 226, 0.2);
          }
          25% {
            transform: translateY(-8px) scale(1.05) rotate(2deg);
            box-shadow: 0 0 40px rgba(29, 112, 229, 0.3);
          }
          50% {
            transform: translateY(0) scale(1) rotate(0deg);
            box-shadow: 0 0 60px rgba(234, 25, 152, 0.3);
          }
          75% {
            transform: translateY(-4px) scale(1.02) rotate(-2deg);
            box-shadow: 0 0 40px rgba(252, 185, 20, 0.3);
          }
        }

        @keyframes logo-spin {
          0% {
            transform: rotate(0deg) scale(1);
            filter: drop-shadow(0 0 8px rgba(110, 36, 226, 0.4)) hue-rotate(0deg);
          }
          25% {
            filter: drop-shadow(0 0 12px rgba(29, 112, 229, 0.6)) hue-rotate(90deg);
          }
          50% {
            transform: rotate(180deg) scale(1.1);
            filter: drop-shadow(0 0 16px rgba(234, 25, 152, 0.6)) hue-rotate(180deg);
          }
          75% {
            filter: drop-shadow(0 0 12px rgba(252, 185, 20, 0.6)) hue-rotate(270deg);
          }
          100% {
            transform: rotate(360deg) scale(1);
            filter: drop-shadow(0 0 8px rgba(110, 36, 226, 0.4)) hue-rotate(360deg);
          }
        }

        @keyframes morph-container {
          0%, 100% {
            border-radius: 50% 50% 50% 50% / 50% 50% 50% 50%;
          }
          33% {
            border-radius: 60% 40% 50% 50% / 40% 60% 50% 50%;
          }
          66% {
            border-radius: 40% 60% 50% 50% / 60% 40% 50% 50%;
          }
        }

        @keyframes dot-bounce {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes float-particle {
          0%, 100% {
            transform: translateY(0) scale(1);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-30px) scale(1.5);
            opacity: 0.8;
          }
        }

        @keyframes pulse-slow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.5;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.8;
          }
        }

        @keyframes hue-rotate {
          from { filter: hue-rotate(0deg); }
          to { filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
