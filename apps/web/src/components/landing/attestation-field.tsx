"use client";

import { useEffect, useRef } from "react";

/**
 * Original hero visual, built in the source system's language (monochrome canvas,
 * very low alpha, slow drift) rather than reusing that project's hosted video.
 *
 * What it depicts: scattered attestation records drifting in the field, each
 * drawing a faint line toward a focal point as it resolves — the aggregation step,
 * many independent issuers collapsing into one answer.
 */
export function AttestationField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Deterministic placement (golden-ratio walk) so the field looks composed
    // rather than randomly clumped, and renders identically across reloads.
    const COUNT = 64;
    const nodes = Array.from({ length: COUNT }, (_, i) => {
      const seed = i * 1.618;
      return {
        bx: (seed * 127.1) % 1,
        by: (seed * 311.7) % 1,
        phase: seed * Math.PI * 2,
        speed: 0.25 + (seed % 0.35),
        radius: 0.9 + (seed % 1.8),
      };
    });

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Focal point sits where the headline's right edge lands on desktop.
      const fx = width * 0.72;
      const fy = height * 0.48;

      nodes.forEach((n) => {
        const driftX = Math.sin(time * n.speed * 0.4 + n.phase) * 26;
        const driftY = Math.cos(time * n.speed * 0.3 + n.phase * 0.7) * 18;
        const x = n.bx * width + driftX;
        const y = n.by * height + driftY;

        const pulse = Math.sin(time * n.speed + n.phase) * 0.5 + 0.5;

        // Only nodes near the focal point draw a connecting line, so the
        // convergence reads as selective resolution rather than a spiderweb.
        const dx = x - fx;
        const dy = y - fy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const reach = Math.min(width, height) * 0.55;
        if (dist < reach) {
          const strength = (1 - dist / reach) * (0.05 + pulse * 0.05);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(fx, fy);
          ctx.strokeStyle = `rgba(255,255,255,${strength})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(x, y, n.radius + pulse * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${0.1 + pulse * 0.22})`;
        ctx.fill();
      });
    };

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const loop = (now: number) => {
      draw(now / 1000);
      frameRef.current = requestAnimationFrame(loop);
    };

    if (reduced.matches) {
      draw(0); // one composed static frame
    } else {
      frameRef.current = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
