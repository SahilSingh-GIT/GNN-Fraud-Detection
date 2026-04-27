import { useRef, useEffect, useCallback } from "react";

// ─── AMOLED Neural Network Canvas — Beast Mode Gold ───────────────────────────
// Hyper-dynamic, 3D parallax, data-flow simulation, and intense reactivity.
export default function NeuralCanvas({ riskLevel, isAnalyzing }) {
  const canvasRef = useRef(null);
  const mouse = useRef({ x: -9999, y: -9999, vx: 0, vy: 0 });
  const animRef = useRef(null);
  const nodesRef = useRef([]);
  const particlesRef = useRef([]);
  const sparksRef = useRef([]);
  const timeRef = useRef(0);
  const clickWavesRef = useRef([]);

  // Gold color palette
  const DANGER = { r: 239, g: 68, b: 68 };    // Red
  const WARN = { r: 245, g: 158, b: 11 };      // Amber
  const SAFE = { r: 34, g: 197, b: 94 };       // Green
  const NEUTRAL = { r: 255, g: 215, b: 0 };    // Pure Gold

  const getColor = useCallback(() => {
    if (riskLevel === null) return NEUTRAL;
    if (riskLevel > 80) return DANGER;
    if (riskLevel > 50) return WARN;
    return SAFE;
  }, [riskLevel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { alpha: false }); // Optimize
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
      const count = Math.floor((W * H) / 6000); // Slightly fewer nodes for performance, but higher impact
      
      nodesRef.current = Array.from({ length: count }, (_, i) => {
        const z = Math.random() * 0.8 + 0.2; // Depth: 0.2 (back) to 1.0 (front)
        return {
          id: i,
          x: Math.random() * W,
          y: Math.random() * H,
          ox: Math.random() * W, // Origin X
          oy: Math.random() * H, // Origin Y
          vx: 0,
          vy: 0,
          z: z, 
          baseR: (Math.random() * 2 + 1) * z,
          pulse: Math.random() * Math.PI * 2,
          activationTimer: 0,
          energy: 0,
          ringAngle: Math.random() * Math.PI * 2,
          ringSpeed: (Math.random() - 0.5) * 0.05,
        };
      });

      // Floating dust particles
      particlesRef.current = Array.from({ length: 80 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.5 + 0.1,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.5 - 0.2,
        size: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    let lastX = 0, lastY = 0;
    const onMouseMove = (e) => {
      mouse.current.vx = e.clientX - lastX;
      mouse.current.vy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    const onClick = (e) => {
      clickWavesRef.current.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        energy: 1.0,
      });
      
      // Spawn massive sparks
      for(let i=0; i<15; i++) {
        sparksRef.current.push({
            x: e.clientX,
            y: e.clientY,
            vx: (Math.random() - 0.5) * 20,
            vy: (Math.random() - 0.5) * 20,
            life: 1.0,
            size: Math.random() * 3 + 2
        });
      }
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    window.addEventListener("resize", resize);
    resize();

    const draw = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const W = window.innerWidth;
      const H = window.innerHeight;
      const nodes = nodesRef.current;
      const col = getColor();
      const mx = mouse.current.x;
      const my = mouse.current.y;
      
      // Decay mouse velocity
      mouse.current.vx *= 0.9;
      mouse.current.vy *= 0.9;

      // ── Background ──
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, W, H);

      // Deep Gold Nebula (reacts to analysis)
      const pulseScale = isAnalyzing ? Math.sin(t * 5) * 0.1 + 1 : 1;
      const bgNeb = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.max(W,H) * 0.6 * pulseScale);
      bgNeb.addColorStop(0, `rgba(218, 165, 32, ${isAnalyzing ? 0.05 : 0.015})`);
      bgNeb.addColorStop(0.5, `rgba(184, 134, 11, ${isAnalyzing ? 0.02 : 0.005})`);
      bgNeb.addColorStop(1, "transparent");
      ctx.fillStyle = bgNeb;
      ctx.fillRect(0, 0, W, H);

      // Hex Grid (Matrix style, fades in/out based on analysis)
      if (isAnalyzing) {
          ctx.save();
          ctx.globalAlpha = 0.05 + Math.sin(t * 8) * 0.02;
          ctx.strokeStyle = `rgb(255, 215, 0)`;
          ctx.lineWidth = 1;
          const hSize = 80;
          const hH = hSize * Math.sqrt(3);
          ctx.beginPath();
          for (let row = -2; row < H / hH + 2; row++) {
            for (let c = -2; c < W / (hSize * 1.5) + 2; c++) {
              const cx2 = c * hSize * 1.5;
              const cy2 = row * hH + (c % 2 ? hH / 2 : 0);
              const dist = Math.sqrt((cx2-W/2)**2 + (cy2-H/2)**2);
              if (dist > W*0.6) continue;
              
              for (let s = 0; s < 6; s++) {
                const angle = (Math.PI / 3) * s;
                const px = cx2 + hSize * Math.cos(angle);
                const py = cy2 + hSize * Math.sin(angle);
                s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
              }
            }
          }
          ctx.stroke();
          ctx.restore();
      }

      // ── Cursor Core ──
      if (mx > -1000) {
          const cGlow = ctx.createRadialGradient(mx, my, 0, mx, my, 400);
          cGlow.addColorStop(0, `rgba(255, 215, 0, 0.15)`);
          cGlow.addColorStop(0.2, `rgba(218, 165, 32, 0.05)`);
          cGlow.addColorStop(1, "transparent");
          ctx.fillStyle = cGlow;
          ctx.fillRect(0, 0, W, H);

          // Advanced Geometric Cursor Rings
          ctx.save();
          ctx.translate(mx, my);
          for(let r=1; r<=3; r++) {
              ctx.rotate(t * 0.5 * (r%2 ? 1 : -1));
              const ringR = 35 + r * 25 + Math.sin(t * 4 + r) * 10;
              ctx.strokeStyle = `rgba(255, 215, 0, ${0.4 / r})`;
              ctx.lineWidth = 2;
              ctx.beginPath();
              for(let s=0; s<8; s++) {
                  const a = (Math.PI / 4) * s;
                  const px = ringR * Math.cos(a);
                  const py = ringR * Math.sin(a);
                  s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(0, 0, ringR + 5, 0, Math.PI * 2 * 0.1);
              ctx.stroke();
          }
          ctx.restore();
      }

      // ── Shockwaves ──
      const waves = clickWavesRef.current;
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.radius += 15 + w.energy * 8; // Fast expansion
        w.energy -= 0.025;
        if (w.energy <= 0) { waves.splice(i, 1); continue; }
        
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${w.energy})`; 
        ctx.lineWidth = 4 * w.energy;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.radius * 0.9, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 215, 0, ${w.energy * 0.6})`; 
        ctx.lineWidth = 15 * w.energy;
        ctx.stroke();
      }

      // ── Update Nodes & Physics ──
      const EDGE_DIST = 160;
      
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.pulse += 0.05 + (isAnalyzing ? 0.15 : 0);
        n.ringAngle += n.ringSpeed;
        n.activationTimer *= 0.92; 
        n.energy *= 0.92;

        n.ox += Math.sin(t + n.id) * 0.6;
        n.oy += Math.cos(t * 0.8 + n.id) * 0.6;

        n.vx += (n.ox - n.x) * 0.002;
        n.vy += (n.oy - n.y) * 0.002;

        const dx = mx - n.x;
        const dy = my - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Hyper-reactive Cursor Physics
        if (dist < 350 && dist > 0) {
            const f = (350 - dist) / 350;
            if (dist < 150) {
                // Repel strongly, create a hollow zone
                n.vx -= (dx / dist) * f * 3.0;
                n.vy -= (dy / dist) * f * 3.0;
                n.energy = Math.min(1, n.energy + 0.2);
            } else {
                // Attract to form a constellation ring
                n.vx += (dx / dist) * f * 0.8;
                n.vy += (dy / dist) * f * 0.8;
                n.vx += (dy / dist) * f * 2.0;
                n.vy -= (dx / dist) * f * 2.0;
            }
            n.activationTimer = Math.min(1, n.activationTimer + f * 0.15);
        }

        // Mouse velocity drag
        if (dist < 250) {
             n.vx += mouse.current.vx * 0.015;
             n.vy += mouse.current.vy * 0.015;
        }

        // Wave displacement
        for (const w of waves) {
            const wd = Math.sqrt((n.x - w.x)**2 + (n.y - w.y)**2);
            if (Math.abs(wd - w.radius) < 40) {
                const angle = Math.atan2(n.y - w.y, n.x - w.x);
                n.vx += Math.cos(angle) * w.energy * 20 * n.z;
                n.vy += Math.sin(angle) * w.energy * 20 * n.z;
                n.energy = 1.0;
                n.activationTimer = 1.0;
                
                if(Math.random() < 0.15) {
                    sparksRef.current.push({
                        x: n.x, y: n.y,
                        vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15,
                        life: 1.0, size: 2.5
                    });
                }
            }
        }

        // Global Analysis Vortex
        if (isAnalyzing) {
            const cx = W/2, cy = H/2;
            const angle = Math.atan2(n.y - cy, n.x - cx);
            n.vx += Math.cos(angle - Math.PI/2) * 0.8;
            n.vy += Math.sin(angle - Math.PI/2) * 0.8;
            n.vx -= Math.cos(angle) * 0.3;
            n.vy -= Math.sin(angle) * 0.3;
            if (Math.random() < 0.02) n.energy = 1; 
        }

        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        
        if (n.x < -100 || n.x > W+100 || n.y < -100 || n.y > H+100) {
            n.x = n.ox = Math.random() * W;
            n.y = n.oy = Math.random() * H;
        }
      }

      // ── Draw Edges (Data Links) ──
      ctx.lineCap = "round";
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          if (Math.abs(a.z - b.z) > 0.3) continue; 
          
          const dx2 = a.x - b.x, dy2 = a.y - b.y;
          const d = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d > EDGE_DIST) continue;

          const baseAlpha = (1 - d / EDGE_DIST) * 0.5;
          const energyBlend = Math.max(a.energy, b.energy, a.activationTimer, b.activationTimer);
          const totalAlpha = baseAlpha + energyBlend * 0.7;
          
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(255, 215, 0, ${totalAlpha * a.z})`;
          ctx.lineWidth = (0.8 + energyBlend * 2.0) * a.z;
          ctx.stroke();

          // Data Packets along lines
          if (energyBlend > 0.2 || Math.random() < 0.002) {
              const tOffset = (t * 3 + i * 1.1 + j * 0.7) % 1;
              const px = a.x + dx2 * -tOffset;
              const py = a.y + dy2 * -tOffset;
              
              ctx.beginPath();
              ctx.arc(px, py, 2.5 * a.z + energyBlend*2.5, 0, Math.PI*2);
              ctx.fillStyle = `rgba(255, 255, 255, ${totalAlpha})`; 
              ctx.fill();
              
              ctx.beginPath();
              ctx.arc(px, py, 8 * a.z, 0, Math.PI*2);
              ctx.fillStyle = `rgba(255, 215, 0, ${totalAlpha * 0.6})`;
              ctx.fill();
          }
        }
      }

      // ── Draw Nodes ──
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        const pulse = Math.sin(n.pulse) * 0.5 + 0.5;
        const e = Math.max(n.energy, n.activationTimer);
        const radius = n.baseR * (1 + pulse * 0.3 + e * 2.0);

        // Core Glow
        if (e > 0.1 || isAnalyzing) {
            const glowR = radius * (5 + e * 5);
            const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
            glow.addColorStop(0, `rgba(255, 215, 0, ${e * 0.6 + 0.15})`);
            glow.addColorStop(1, "transparent");
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2); ctx.fill();
        }

        // Tech Ring 
        if (e > 0.2) {
            ctx.save();
            ctx.translate(n.x, n.y);
            ctx.rotate(n.ringAngle);
            ctx.strokeStyle = `rgba(255, 255, 255, ${e * 0.9})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius * 3.0, 0, Math.PI * 1.5);
            ctx.stroke();
            ctx.restore();
        }

        // Solid Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.5 + e * 0.7})`;
        ctx.fill();

        // White Hot Center
        ctx.beginPath();
        ctx.arc(n.x, n.y, radius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + e})`;
        ctx.fill();
      }

      // ── Sparks (Explosive particles) ──
      const sparks = sparksRef.current;
      for (let i = sparks.length - 1; i >= 0; i--) {
          const s = sparks[i];
          s.x += s.vx;
          s.y += s.vy;
          s.vx *= 0.9;
          s.vy *= 0.9;
          s.life -= 0.025;
          if (s.life <= 0) { sparks.splice(i, 1); continue; }
          
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255, 255, 255, ${s.life})`;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.size * s.life * 4, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255, 215, 0, ${s.life * 0.6})`;
          ctx.fill();
      }

      // ── Ambient Dust ──
      const parts = particlesRef.current;
      for (const p of parts) {
        p.x += p.vx + Math.sin(t + p.phase) * 0.6 * p.z;
        p.y += p.vy * p.z;
        if (isAnalyzing) p.y -= 3 * p.z; 
        
        if (p.y < -50) {
            p.y = H + 50;
            p.x = Math.random() * W;
        }
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${0.3 * p.z + (isAnalyzing ? 0.4 : 0)})`;
        ctx.fill();
      }

      // ── Cinematic Vignette & Scanlines ──
      const vig = ctx.createRadialGradient(W/2, H/2, W*0.3, W/2, H/2, Math.max(W,H)*0.8);
      vig.addColorStop(0, "transparent");
      vig.addColorStop(1, "rgba(0,0,0,0.85)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      // HUD overlay elements
      if (isAnalyzing) {
          ctx.fillStyle = `rgba(255, 215, 0, ${Math.sin(t*10)*0.15 + 0.15})`;
          ctx.font = "bold 12px monospace";
          ctx.fillText(`SYS.SCAN // ${Math.floor(Math.random()*10000)}`, mx + 25, my - 25);
          
          // Crosshairs
          ctx.strokeStyle = `rgba(255, 215, 0, 0.4)`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mx - 50, my); ctx.lineTo(mx - 20, my);
          ctx.moveTo(mx + 20, my); ctx.lineTo(mx + 50, my);
          ctx.moveTo(mx, my - 50); ctx.lineTo(mx, my - 20);
          ctx.moveTo(mx, my + 20); ctx.lineTo(mx, my + 50);
          ctx.stroke();
      }

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

  // pointerEvents: "none" might block clicks on the canvas, so remove it to allow onClick!
  return <canvas ref={canvasRef} style={{ position: "fixed", inset: 0, zIndex: 0 }} />;
}
