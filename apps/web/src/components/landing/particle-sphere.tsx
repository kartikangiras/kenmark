"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * A sphere of points, lit from the upper right, turning slowly. Drawn on a
 * canvas with no dependencies; collapses to a single frame under reduced
 * motion.
 */
export function ParticleSphere({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COUNT = 2600;
    const points = new Float32Array(COUNT * 3);
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < COUNT; i++) {
      const y = 1 - (i / (COUNT - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = golden * i;
      points[i * 3] = Math.cos(theta) * r;
      points[i * 3 + 1] = y;
      points[i * 3 + 2] = Math.sin(theta) * r;
    }

    const light = [0.55, 0.7, 0.45];
    const lightLen = Math.hypot(...light);
    light[0] /= lightLen;
    light[1] /= lightLen;
    light[2] /= lightLen;

    let frame = 0;
    let size = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = canvas.clientWidth;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    };

    const draw = (angle: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const radius = (size / 2) * 0.92 * dpr;
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const tilt = 0.35;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      for (let i = 0; i < COUNT; i++) {
        const x0 = points[i * 3];
        const y0 = points[i * 3 + 1];
        const z0 = points[i * 3 + 2];
        // rotate around Y, then tilt around X
        const x1 = x0 * cosA + z0 * sinA;
        const z1 = -x0 * sinA + z0 * cosA;
        const y2 = y0 * cosT - z1 * sinT;
        const z2 = y0 * sinT + z1 * cosT;

        const lit = Math.max(0, x1 * light[0] + y2 * light[1] + z2 * light[2]);
        const depth = (z2 + 1) / 2;
        const alpha = 0.08 + 0.92 * (0.3 * depth + 0.7 * Math.pow(lit, 1.6));
        const dot = (0.7 + 1.1 * lit) * dpr;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx + x1 * radius, cy - y2 * radius, dot, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      draw(0.6);
    } else {
      const start = performance.now();
      const tick = (now: number) => {
        draw(0.6 + (now - start) * 0.00009);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduced) draw(0.6);
    });
    observer.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className={cn("aspect-square w-full", className)} />
  );
}
