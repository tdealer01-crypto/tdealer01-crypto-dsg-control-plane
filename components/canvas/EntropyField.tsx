import React, { useEffect, useMemo, useRef } from 'react';

type Status = 'ready' | 'degraded' | 'down' | 'blocked' | 'unknown';

type EntropyFieldProps = {
  width?: number;
  height?: number;
  cols?: number;
  rows?: number;
  status?: Status;
  entropy?: number; // expected 0..1
  latencyMs?: number;
  activeAgents?: number;
  allowRate?: number; // 0..1
  blockRate?: number; // 0..1
  stabilizeRate?: number; // 0..1
  deterministic?: boolean;
  animated?: boolean;
  className?: string;
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function hash2D(x: number, y: number, seed: number) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise2D(x: number, y: number, seed: number) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const sx = x - x0;
  const sy = y - y0;

  const u = sx * sx * (3 - 2 * sx);
  const v = sy * sy * (3 - 2 * sy);

  const n00 = hash2D(x0, y0, seed);
  const n10 = hash2D(x1, y0, seed);
  const n01 = hash2D(x0, y1, seed);
  const n11 = hash2D(x1, y1, seed);

  const nx0 = n00 * (1 - u) + n10 * u;
  const nx1 = n01 * (1 - u) + n11 * u;
  return nx0 * (1 - v) + nx1 * v;
}

function statusTint(status: Status) {
  switch (status) {
    case 'ready':
      return { r: 34, g: 197, b: 94 };
    case 'degraded':
      return { r: 250, g: 204, b: 21 };
    case 'blocked':
      return { r: 249, g: 115, b: 22 };
    case 'down':
      return { r: 239, g: 68, b: 68 };
    default:
      return { r: 99, g: 102, b: 241 };
  }
}

function mix(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
}

export default function EntropyField({
  width = 720,
  height = 360,
  cols = 48,
  rows = 24,
  status = 'unknown',
  entropy = 0.08,
  latencyMs = 84,
  activeAgents = 12,
  allowRate = 0.9,
  blockRate = 0.05,
  stabilizeRate = 0.05,
  deterministic = true,
  animated = true,
  className = '',
}: EntropyFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const startRef = useRef<number>(0);

  const model = useMemo(() => {
    const e = clamp(entropy);
    const latencyNorm = clamp(latencyMs / 400);
    const agentDensity = clamp(activeAgents / 100);
    const allow = clamp(allowRate);
    const block = clamp(blockRate);
    const stabilize = clamp(stabilizeRate);
    const tint = statusTint(status);

    return {
      e,
      latencyNorm,
      agentDensity,
      allow,
      block,
      stabilize,
      tint,
    };
  }, [entropy, latencyMs, activeAgents, allowRate, blockRate, stabilizeRate, status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cellW = width / cols;
    const cellH = height / rows;

    const draw = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = (ts - startRef.current) / 1000;
      const t = animated ? elapsed : 0;

      ctx.clearRect(0, 0, width, height);

      const bgTop = rgba(2, 6, 23, 1);
      const bgBottom = rgba(15, 23, 42, 1);
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, bgTop);
      grad.addColorStop(1, bgBottom);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      const symmetryBias = deterministic ? 0.9 : 0.2;
      const harmonicStrength = clamp(1 - model.e * 1.2);
      const noiseStrength = clamp(model.e * 1.35 + model.block * 0.8 + model.stabilize * 0.35);
      const pulse = 0.5 + 0.5 * Math.sin(t * 1.3);
      const latencyGlow = model.latencyNorm;
      const density = 0.15 + model.agentDensity * 0.85;

      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const nx = col / Math.max(cols - 1, 1);
          const ny = row / Math.max(rows - 1, 1);

          const mirroredX = deterministic ? Math.min(nx, 1 - nx) * 2 : nx;
          const waveA = Math.sin(mirroredX * Math.PI * 4 + t * 1.1);
          const waveB = Math.cos(ny * Math.PI * 6 - t * 0.8);
          const harmonic = (waveA * 0.5 + waveB * 0.5 + 1) / 2;

          const radialDx = nx - 0.5;
          const radialDy = ny - 0.5;
          const radial = Math.sqrt(radialDx * radialDx + radialDy * radialDy);
          const ripple = 0.5 + 0.5 * Math.sin(radial * 28 - t * 1.6);

          const noise = smoothNoise2D(nx * 10 + t * 0.4, ny * 10 - t * 0.25, 7.13);
          const mirroredNoise = smoothNoise2D((1 - nx) * 10 - t * 0.2, ny * 10 + t * 0.2, 11.7);
          const balancedNoise = mix(noise, mirroredNoise, symmetryBias);

          const signal = clamp(
            harmonic * harmonicStrength * 0.65 +
              ripple * (0.15 + model.stabilize * 0.25) +
              balancedNoise * noiseStrength * 0.8,
          );

          const gateBias = clamp(model.allow * 0.2 - model.block * 0.35 - model.stabilize * 0.15 + 0.5);
          const brightness = clamp(signal * 0.7 + gateBias * 0.3);
          const alpha = clamp(0.08 + brightness * 0.75) * density;

          const sizeJitter = 0.78 + smoothNoise2D(nx * 20, ny * 20, 3.4) * 0.22;
          const w = cellW * sizeJitter;
          const h = cellH * sizeJitter;
          const x = col * cellW + (cellW - w) / 2;
          const y = row * cellH + (cellH - h) / 2;

          const isHot = brightness > 0.72;
          const hotMix = isHot ? clamp((brightness - 0.72) / 0.28) : 0;
          const redPush = clamp(model.block * 1.8 + model.e * 0.6);

          const baseR = mix(28, model.tint.r, 0.75);
          const baseG = mix(45, model.tint.g, 0.7);
          const baseB = mix(90, model.tint.b, 0.65);

          const r = mix(baseR, 239, hotMix * redPush);
          const g = mix(baseG, 68, hotMix * redPush * 0.7);
          const b = mix(baseB, 68, hotMix * redPush * 0.45);

          ctx.fillStyle = rgba(r, g, b, alpha);
          ctx.fillRect(x, y, w, h);
        }
      }

      ctx.save();
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < rows; i += 1) {
        const y = i * cellH + cellH / 2;
        ctx.strokeStyle = rgba(model.tint.r, model.tint.g, model.tint.b, 0.15);
        ctx.beginPath();
        for (let x = 0; x <= width; x += 8) {
          const nx = x / width;
          const waveY = y + Math.sin(nx * Math.PI * 6 + t * 1.2 + i * 0.18) * (2 + model.e * 8);
          if (x === 0) ctx.moveTo(x, waveY);
          else ctx.lineTo(x, waveY);
        }
        ctx.stroke();
      }
      ctx.restore();

      const glow = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.45,
      );
      glow.addColorStop(0, rgba(model.tint.r, model.tint.g, model.tint.b, 0.1 + pulse * 0.05 + latencyGlow * 0.1));
      glow.addColorStop(1, rgba(model.tint.r, model.tint.g, model.tint.b, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = rgba(model.tint.r, model.tint.g, model.tint.b, 0.3);
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

      ctx.fillStyle = rgba(226, 232, 240, 0.8);
      ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(`status:${status}`, 12, 18);
      ctx.fillText(`entropy:${model.e.toFixed(3)}`, 12, 34);
      ctx.fillText(`latency:${latencyMs}ms`, 12, 50);
      ctx.fillText(`agents:${activeAgents}`, 12, 66);

      if (animated) {
        frameRef.current = requestAnimationFrame(draw);
      }
    };

    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [width, height, cols, rows, model, deterministic, animated, latencyMs, activeAgents, status]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 ${className}`}>
      <canvas ref={canvasRef} aria-label="Entropy field visualization" className="block h-auto w-full" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/60 to-transparent" />
    </div>
  );
}
