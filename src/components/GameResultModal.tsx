'use client';

import { useEffect } from 'react';
import confetti from 'canvas-confetti';

interface GameResultModalProps {
  isWinner: boolean;
  onPlayAgain: () => void;
  onClose: () => void;
}

export default function GameResultModal({ isWinner, onPlayAgain, onClose }: GameResultModalProps) {
  useEffect(() => {
    if (isWinner) {
      // Enhanced confetti effect for winner
      const duration = 5000;
      const animationEnd = Date.now() + duration;

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      // Initial burst
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
      });

      // Continuous confetti
      const interval: ReturnType<typeof setInterval> = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Left side confetti
        confetti({
          particleCount,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.6 },
          colors: ['#FFD700', '#FF6B6B', '#4ECDC4']
        });

        // Right side confetti
        confetti({
          particleCount,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.6 },
          colors: ['#45B7D1', '#FFA07A', '#FFD700']
        });

        // Random bursts from top
        if (Math.random() < 0.3) {
          confetti({
            particleCount: 30,
            spread: 360,
            startVelocity: 30,
            origin: { x: randomInRange(0.2, 0.8), y: randomInRange(0, 0.3) },
            colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A']
          });
        }
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isWinner]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
        {/* Icon */}
        <div className="mb-6 text-8xl">
          {isWinner ? '🎉' : '💀'}
        </div>

        {/* Title */}
        <h2 className="text-4xl font-bold text-white mb-4">
          {isWinner ? 'Congratulations!' : 'Try again!'}
        </h2>

        {/* Subtitle */}
        <p className="text-xl text-white/90 mb-8">
          {isWinner ? 'You won the game! 🏆' : 'You lost this time 😭'}
        </p>

        {/* Play Again Button */}
        <button
          onClick={onPlayAgain}
          className="px-12 py-4 bg-white text-indigo-600 text-xl font-bold rounded-full hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          Play Again!
        </button>
      </div>
    </div>
  );
}
