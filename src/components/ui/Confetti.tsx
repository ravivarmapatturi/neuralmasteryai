import { useEffect, useRef, useState, useCallback } from 'react';

export interface ToastMessage {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  xp?: number;
  type?: 'xp' | 'badge' | 'celebration';
}

// Global event bus for triggering confetti and toasts from anywhere in the app
type ConfettiListener = () => void;
type ToastListener = (toast: ToastMessage) => void;

const confettiListeners: Set<ConfettiListener> = new Set();
const toastListeners: Set<ToastListener> = new Set();

export function triggerConfetti() {
  confettiListeners.forEach((fn) => fn());
}

export function showRewardToast(toast: Omit<ToastMessage, 'id'>) {
  const fullToast: ToastMessage = {
    ...toast,
    id: Math.random().toString(36).substring(2, 9),
  };
  toastListeners.forEach((fn) => fn(fullToast));
  triggerConfetti();
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: 'rect' | 'circle';
}

const COLORS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const launchConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const count = 75;
    const newParticles: Particle[] = [];

    for (let i = 0; i < count; i++) {
      const x = width / 2 + (Math.random() - 0.5) * 300;
      const y = height / 3;
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 6;

      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 4,
        size: Math.random() * 8 + 6,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
        opacity: 1,
        shape: Math.random() > 0.4 ? 'rect' : 'circle',
      });
    }

    particlesRef.current = [...particlesRef.current, ...newParticles];

    if (!animFrameRef.current) {
      render();
    }
  }, []);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const particles = particlesRef.current;
    let activeCount = 0;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p.opacity <= 0.01 || p.y > canvas.height + 50) continue;

      activeCount++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.vx *= 0.98; // air resistance
      p.rotation += p.rotationSpeed;
      p.opacity *= 0.98; // fade out

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.4);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    if (activeCount > 0) {
      animFrameRef.current = requestAnimationFrame(render);
    } else {
      animFrameRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current = [];
    }
  };

  useEffect(() => {
    const handleConfetti = () => launchConfetti();
    const handleToast = (toast: ToastMessage) => {
      setToasts((prev) => [...prev.slice(-2), toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 4500);
    };

    confettiListeners.add(handleConfetti);
    toastListeners.add(handleToast);

    return () => {
      confettiListeners.delete(handleConfetti);
      toastListeners.delete(handleToast);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [launchConfetti]);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 9999,
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              pointerEvents: 'auto',
              background: 'rgba(17, 24, 39, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(99, 102, 241, 0.3)',
              borderRadius: 12,
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 280,
              maxWidth: 360,
              color: '#fff',
              animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {t.icon && <div style={{ fontSize: 28 }}>{t.icon}</div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#f3f4f6', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t.title}
                {t.xp && (
                  <span style={{ fontSize: 12, padding: '2px 6px', borderRadius: 6, background: 'rgba(99, 102, 241, 0.3)', color: '#818cf8', fontWeight: 600 }}>
                    +{t.xp} XP
                  </span>
                )}
              </div>
              {t.subtitle && <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{t.subtitle}</div>}
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
