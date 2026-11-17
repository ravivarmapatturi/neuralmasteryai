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
type CoinListener = () => void;

const confettiListeners: Set<ConfettiListener> = new Set();
const toastListeners: Set<ToastListener> = new Set();
const coinListeners: Set<CoinListener> = new Set();

export function triggerConfetti() {
  confettiListeners.forEach((fn) => fn());
}

export function showRewardToast(toast: Omit<ToastMessage, 'id'>) {
  const fullToast: ToastMessage = {
    ...toast,
    id: Math.random().toString(36).substring(2, 9),
  };
  toastListeners.forEach((fn) => fn(fullToast));
  // No confetti over the page text (owner, 18 Nov); the notebook card is the celebration.
}

export function showUnderstoodCoin() {
  coinListeners.forEach((fn) => fn());
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
  const [coinSequence, setCoinSequence] = useState(0);
  const [coinTarget, setCoinTarget] = useState({ x: 0, y: -40 });

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
    const handleCoin = () => {
      const target = document.getElementById('nm-xp-streak-counter');
      if (target) {
        const rect = target.getBoundingClientRect();
        setCoinTarget({ x: rect.left + rect.width / 2 - window.innerWidth / 2, y: rect.top + rect.height / 2 - window.innerHeight / 2 });
        target.classList.remove('nm-xp-pulse');
        requestAnimationFrame(() => target.classList.add('nm-xp-pulse'));
      }
      setCoinSequence((sequence) => sequence + 1);
    };

    confettiListeners.add(handleConfetti);
    toastListeners.add(handleToast);
    coinListeners.add(handleCoin);

    return () => {
      confettiListeners.delete(handleConfetti);
      toastListeners.delete(handleToast);
      coinListeners.delete(handleCoin);
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
              // Notebook card (owner, 18 Nov): paper, pen border, handwriting -- not a dark dashboard toast.
              background: 'var(--nm-surface)',
              border: '2px solid var(--nm-hl-4-ink)',
              boxShadow: '0 8px 22px rgba(30, 41, 90, 0.16)',
              borderRadius: '255px 15px 225px 15px/15px 225px 15px 255px',
              fontFamily: "'Kalam', cursive",
              padding: '12px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              minWidth: 280,
              maxWidth: 360,
              color: 'var(--nm-text-primary)',
              animation: 'slideInUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {t.icon && <div style={{ fontSize: 28 }}>{t.icon}</div>}
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 17, color: 'var(--nm-hl-4-ink)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t.title}
                {t.xp && (
                  <span style={{ fontSize: 14, padding: '1px 8px', borderRadius: 3, background: 'var(--nm-hl-1)', color: 'var(--nm-hl-1-ink)', fontWeight: 700 }}>
                    +{t.xp} XP
                  </span>
                )}
              </div>
              {t.subtitle && <div style={{ fontSize: 15, color: 'var(--nm-text-secondary)', marginTop: 2 }}>{t.subtitle}</div>}
            </div>
          </div>
        ))}
      </div>
      {coinSequence > 0 && (
        <div
          key={coinSequence}
          className="nm-understood-coin-stage"
          role="status"
          aria-label="10 experience points earned"
          data-testid="understood-coin"
          style={{ '--coin-target-x': `${coinTarget.x}px`, '--coin-target-y': `${coinTarget.y}px` } as React.CSSProperties}
        >
          <span className="nm-understood-coin-ring" aria-hidden="true" />
          <span className="nm-understood-coin">+10</span>
        </div>
      )}
      <style>{`
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <style>{`
        .nm-understood-coin-stage {
          --coin-target-x: 0px;
          --coin-target-y: -40vh;
          position: fixed;
          z-index: 10001;
          left: 50%;
          top: 50%;
          width: 120px;
          height: 120px;
          display: grid;
          place-items: center;
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: nm-coin-flight 1.5s 900ms cubic-bezier(.2,.75,.25,1) forwards;
        }
        .nm-understood-coin {
          width: 92px;
          height: 92px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          border: 3px solid var(--nm-accent-warn);
          background: var(--nm-mark-yellow);
          color: var(--nm-text-primary);
          box-shadow: inset 0 0 0 3px color-mix(in srgb, var(--nm-surface) 42%, transparent), 0 5px 16px color-mix(in srgb, var(--nm-accent-warn) 28%, transparent);
          font-family: 'Kalam', cursive;
          font-size: 26px;
          font-weight: 700;
          animation: nm-coin-flip 900ms ease-in-out both;
          backface-visibility: visible;
        }
        .nm-understood-coin-ring {
          position: absolute;
          inset: 4px;
          border: 2px dotted var(--nm-accent-warn);
          border-radius: 50%;
          animation: nm-coin-sparkle 650ms ease-out both;
        }
        @keyframes nm-coin-flip {
          0% { transform: rotateY(0) scale(.6); }
          55% { transform: rotateY(540deg) scale(1.08); }
          100% { transform: rotateY(720deg) scale(1); }
        }
        @keyframes nm-coin-sparkle {
          from { opacity: .9; transform: scale(.55) rotate(0); }
          to { opacity: 0; transform: scale(1.6) rotate(45deg); }
        }
        @keyframes nm-coin-flight {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          65% { opacity: 1; transform: translate(calc(-50% + var(--coin-target-x)), calc(-50% + var(--coin-target-y))) scale(.8); }
          100% { opacity: 0; transform: translate(calc(-50% + var(--coin-target-x)), calc(-50% + var(--coin-target-y))) scale(.25); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nm-understood-coin-stage { animation: nm-coin-fade 1.2s ease-out forwards; }
          .nm-understood-coin { animation: none; }
          .nm-understood-coin-ring { display: none; }
          @keyframes nm-coin-fade { 0% { opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { opacity: 0; } }
        }
      `}</style>
    </>
  );
}
