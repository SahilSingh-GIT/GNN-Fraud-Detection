import { useRef, useEffect, useCallback } from "react";

// ─── GOD-LEVEL Neural Network Canvas ──────────────────────────────────────────
// Massive interactive neural network with hexagonal grid, data flow pulses,
// multi-layer depth, and cursor-reactive force field
export default function NeuralCanvas({ riskLevel, isAnalyzing }) {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const particlesRef = useRef([]);
  const timeRef = useRef(0);
  const clickWavesRef = useRef([]);

  const DANGER = { r: 255, g: 45, b: 85 };
  const WARN = { r: 255, g: 184, b: 0 };
  const SAFE = { r: 0, g: 245, b: 255 };
  const NEUTRAL = { r: 139, g: 92, b: 246 };

  const getColor = useCallback(() => {
    if (riskLevel === null) return NEUTRAL;
    if (riskLevel > 80) return DANGER;
    if (riskLevel > 50) return WARN;
    return SAFE;
  }, [riskLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
      initNodes();
    };

    const initNodes = () => {
      const W = window.innerWidth;
      const H = window.innerHeight;
      // 3x more nodes than before
      const count = Math.floor((W * H) / 4500);
      nodesRef.current = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        baseR: Math.random() * 2.2 + 0.5,
        r: Math.random() * 2.2 + 0.5,
        pulse: Math.random() * Math.PI * 2,
        layer: Math.floor(Math.random() * 5),
        active: false,
        activationTimer: 0,
        hue: Math.random() * 30 - 15,
        energy: 0,
      }));

      // Floating particles (ambient)
      particlesRef.current = Array.from({ length: 60 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 1.5 + 0.3,
        life: Math.random(),
        maxLife: Math.random() * 3 + 2,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const onMouseMove = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
    };

    const onClick = (e) => {
      clickWavesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        opacity: 0.8,
        time: 0,
      });
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      timeRef.current += 0.01;
      const t = timeRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const nodes = nodesRef.current;
      const col = getColor();
      const mx = mouse.current.x;
      const my = mouse.current.y;

      ctx.clearRect(0, 0, W, H);

      // ── Deep space background with nebula ──
      const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.9);
      bg.addColorStop(0, `rgba(${Math.floor(col.r * 0.04 + 5)}, ${Math.floor(col.g * 0.03 + 2)}, ${Math.floor(col.b * 0.06 + 18)}, 1)`);
      bg.addColorStop(0.5, `rgba(3, 1, 12, 1)`);
      bg.addColorStop(1, "rgba(1, 0, 5, 1)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Secondary nebula glow
      const neb1 = ctx.createRadialGradient(W * 0.25, H * 0.3, 0, W * 0.25, H * 0.3, W * 0.4);
      neb1.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.015)`);
      neb1.addColorStop(1, "transparent");
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, W, H);

      const neb2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, W * 0.35);
      neb2.addColorStop(0, `rgba(139, 92, 246, 0.012)`);
      neb2.addColorStop(1, "transparent");
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, W, H);

      // ── Hexagonal grid overlay ──
      ctx.save();
      ctx.globalAlpha = 0.025;
      ctx.strokeStyle = `rgb(${col.r}, ${col.g}, ${col.b})`;
      ctx.lineWidth = 0.5;
      const hexSize = 50;
      const hexH = hexSize * Math.sqrt(3);
      for (let row = -1; row < H / hexH + 1; row++) {
        for (let c = -1; c < W / (hexSize * 1.5) + 1; c++) {
          const cx2 = c * hexSize * 1.5;
          const cy2 = row * hexH + (c % 2 ? hexH / 2 : 0);
          ctx.beginPath();
          for (let s = 0; s < 6; s++) {
            const angle = (Math.PI / 3) * s + Math.PI / 6;
            const px = cx2 + hexSize * 0.6 * Math.cos(angle);
            const py = cy2 + hexSize * 0.6 * Math.sin(angle);
            s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
      ctx.restore();

      // ── Cursor force field ──
      const cursorGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 280);
      cursorGlow.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, 0.1)`);
      cursorGlow.addColorStop(0.4, `rgba(${col.r}, ${col.g}, ${col.b}, 0.03)`);
      cursorGlow.addColorStop(1, "transparent");
      ctx.fillStyle = cursorGlow;
      ctx.fillRect(0, 0, W, H);

      // Cursor hex ring
      ctx.save();
      ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, 0.12)`;
      ctx.lineWidth = 0.8;
      for (let ring = 0; ring < 3; ring++) {
        const ringR = 40 + ring * 35 + Math.sin(t * 2 + ring) * 5;
        ctx.beginPath();
        for (let s = 0; s < 6; s++) {
          const angle = (Math.PI / 3) * s + t * 0.3;
          const px = mx + ringR * Math.cos(angle);
          const py = my + ringR * Math.sin(angle);
          s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();

      // ── Click waves ──
      const waves = clickWavesRef.current;
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.time += 0.02;
        w.radius += 4;
        w.opacity = Math.max(0, 0.6 - w.time * 0.5);
        if (w.opacity <= 0) { waves.splice(i, 1); continue; }
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${w.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        // Activate nearby nodes
        for (const n of nodes) {
          const d = Math.sqrt((n.x - w.x) ** 2 + (n.y - w.y) ** 2);
          if (Math.abs(d - w.radius) < 20) n.activationTimer = 1.2;
        }
      }

      // ── Update & draw nodes ──
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.pulse += 0.025 + (isAnalyzing ? 0.05 : 0);
        n.activationTimer = Math.max(0, n.activationTimer - 0.015);
        n.energy = Math.max(0, n.energy - 0.01);

        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Cursor interaction
        if (dist < 200) {
          const force = (200 - dist) / 200;
          n.vx -= (dx / dist) * force * 0.4;
          n.vy -= (dy / dist) * force * 0.4;
          if (dist < 100) {
            n.activationTimer = Math.min(1.5, n.activationTimer + 0.05);
            n.energy = Math.min(1, n.energy + 0.03);
          }
        }

        // Analyzing wave
        if (isAnalyzing) {
          const cx2 = W / 2, cy2 = H / 2;
          const cdist = Math.sqrt((n.x - cx2) ** 2 + (n.y - cy2) ** 2);
          if (cdist > 1) {
            const wave = Math.sin(t * 4 - cdist * 0.008) * 0.4;
            n.vx += ((cx2 - n.x) / cdist) * wave * 0.06;
            n.vy += ((cy2 - n.y) / cdist) * wave * 0.06;
            n.energy = Math.min(1, n.energy + Math.abs(wave) * 0.01);
          }
        }

        n.vx *= 0.97;
        n.vy *= 0.97;
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0) { n.x = 0; n.vx *= -0.8; }
        if (n.x > W) { n.x = W; n.vx *= -0.8; }
        if (n.y < 0) { n.y = 0; n.vy *= -0.8; }
        if (n.y > H) { n.y = H; n.vy *= -0.8; }
      }

      // ── Draw edges with data flow ──
      const EDGE_DIST = 110;
      ctx.lineCap = "round";
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (Math.abs(a.layer - b.layer) > 2) continue;
          const dx2 = a.x - b.x, dy2 = a.y - b.y;
          const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d > EDGE_DIST) continue;

          const alpha = (1 - d / EDGE_DIST) * 0.35;
          const act = Math.max(a.activationTimer, b.activationTimer);
          const eng = Math.max(a.energy, b.energy);
          const boost = act * 0.5 + eng * 0.3;

          const cr = Math.min(255, Math.round(col.r * 0.5 + boost * col.r * 0.5));
          const cg = Math.min(255, Math.round(col.g * 0.5 + boost * col.g * 0.5));
          const cb = Math.min(255, Math.round(col.b * 0.5 + boost * col.b * 0.5));

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${alpha + boost * 0.25})`;
          ctx.lineWidth = 0.4 + alpha * 0.8 + act * 0.6;
          ctx.stroke();

          // Data flow signal pulses (multiple per edge)
          if (alpha > 0.08 || act > 0.15) {
            for (let p = 0; p < 2; p++) {
              const pulsePos = ((t * 1.8 + i * 0.2 + p * 0.5) % 1);
              const px = a.x + (b.x - a.x) * pulsePos;
              const py = a.y + (b.y - a.y) * pulsePos;
              const pSize = 1 + act * 2;
              ctx.beginPath();
              ctx.arc(px, py, pSize, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${(alpha + act) * 0.7})`;
              ctx.fill();
            }
          }
        }
      }

      // ── Draw node cores ──
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = Math.sin(n.pulse) * 0.5 + 0.5;
        const act = n.activationTimer;
        const eng = n.energy;
        const radius = n.baseR * (1 + pulse * 0.3 + act * 1.2 + eng * 0.5);

        // Outer glow halo
        if (act > 0.08 || eng > 0.1 || pulse > 0.75) {
          const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, radius * 6);
          glow.addColorStop(0, `rgba(${col.r}, ${col.g}, ${col.b}, ${act * 0.3 + eng * 0.15 + pulse * 0.03})`);
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius * 6, 0, Math.PI * 2);
          ctx.fill();
        }

        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        const bright = 0.4 + act * 0.5 + eng * 0.3 + pulse * 0.1;
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${bright})`;
        ctx.fill();

        // White-hot center for active nodes
        if (act > 0.5) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, radius * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${act * 0.5})`;
          ctx.fill();
        }
      }

      // ── Floating particles ──
      const parts = particlesRef.current;
      for (const p of parts) {
        p.x += p.vx + Math.sin(t + p.phase) * 0.2;
        p.y += p.vy;
        p.life += 0.005;
        if (p.life > p.maxLife || p.y < -10) {
          p.x = Math.random() * W;
          p.y = H + 10;
          p.life = 0;
        }
        const a = Math.sin((p.life / p.maxLife) * Math.PI) * 0.3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${a})`;
        ctx.fill();
      }

      // ── Scanline overlay ──
      ctx.fillStyle = "rgba(0, 0, 0, 0.02)";
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      // ── Moving scan beam ──
      const scanY = ((t * 30) % (H + 40)) - 20;
      const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `rgba(${col.r}, ${col.g}, ${col.b}, 0.03)`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 20, W, 40);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      window.removeEventListener("resize", resize);
    };
  }, [getColor, isAnalyzing]);

  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}
