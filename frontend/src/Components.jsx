import { useState, useEffect, useRef } from "react";

// ─── Threat Radar — replaces the simple RiskRing ──────────────────────────────
export function ThreatRadar({ percent, color }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const timeRef = useRef(0);
  const [displayPercent, setDisplayPercent] = useState(0);

  useEffect(() => {
    let start = 0;
    const target = percent;
    const dur = 1400;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const prog = Math.min(elapsed / dur, 1);
      const ease = 1 - Math.pow(1 - prog, 4);
      setDisplayPercent(Math.round(start + (target - start) * ease));
      if (prog < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [percent]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const size = 200;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2;

    const parseColor = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const draw = () => {
      timeRef.current += 0.015;
      const t = timeRef.current;
      const c = parseColor(color);
      ctx.clearRect(0, 0, size, size);

      // Outer rings
      for (let ring = 0; ring < 4; ring++) {
        const r = 35 + ring * 15;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.04 + (3 - ring) * 0.015})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Radar sweep
      const sweepAngle = t * 1.5;
      const sweepGrad = ctx.createConicGradient(sweepAngle - Math.PI / 2, cx, cy);
      sweepGrad.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, 0.12)`);
      sweepGrad.addColorStop(0.15, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
      sweepGrad.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 78, sweepAngle - Math.PI / 2, sweepAngle + Math.PI * 0.3 - Math.PI / 2);
      ctx.closePath();
      ctx.fillStyle = sweepGrad;
      ctx.fill();

      // Progress arc
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + (Math.PI * 2 * displayPercent) / 100;
      ctx.beginPath();
      ctx.arc(cx, cy, 72, startAngle, endAngle);
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Background arc
      ctx.beginPath();
      ctx.arc(cx, cy, 72, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.06)`;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Tick marks
      for (let i = 0; i < 60; i++) {
        const angle = (Math.PI * 2 * i) / 60 - Math.PI / 2;
        const inner = i % 5 === 0 ? 64 : 67;
        const outer = 70;
        ctx.beginPath();
        ctx.moveTo(cx + inner * Math.cos(angle), cy + inner * Math.sin(angle));
        ctx.lineTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle));
        ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${i % 5 === 0 ? 0.25 : 0.08})`;
        ctx.lineWidth = i % 5 === 0 ? 1.2 : 0.5;
        ctx.stroke();
      }

      // Threat blips
      const blipCount = Math.floor(percent / 20);
      for (let i = 0; i < blipCount; i++) {
        const bAngle = (t * 0.3 + i * 1.8) % (Math.PI * 2);
        const bDist = 25 + Math.sin(t + i * 2) * 20;
        const bx = cx + bDist * Math.cos(bAngle);
        const by = cy + bDist * Math.sin(bAngle);
        const pulsing = Math.sin(t * 3 + i) * 0.5 + 0.5;
        ctx.beginPath();
        ctx.arc(bx, by, 2 + pulsing * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.5 + pulsing * 0.5})`;
        ctx.fill();
        // blip glow
        const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 8);
        bg.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${pulsing * 0.3})`);
        bg.addColorStop(1, "transparent");
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Cross hairs
      ctx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.08)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 80);
      ctx.lineTo(cx, cy + 80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 80, cy);
      ctx.lineTo(cx + 80, cy);
      ctx.stroke();

      animRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [color, percent, displayPercent]);

  return (
    <div style={{ position: "relative", width: 200, height: 200 }}>
      <canvas ref={canvasRef} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 32,
            fontWeight: 900,
            color: "white",
            textShadow: `0 0 30px ${color}`,
            lineHeight: 1,
          }}
        >
          {displayPercent}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 8,
            color: color,
            letterSpacing: 3,
            marginTop: 4,
            textTransform: "uppercase",
          }}
        >
          THREAT LVL
        </span>
      </div>
    </div>
  );
}

// ─── Holographic Input Field ──────────────────────────────────────────────────
export function HoloInput({ name, label, icon, placeholder, value, onChange, unit }) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <label
        style={{
          display: "block",
          fontFamily: "var(--font-mono)",
          fontSize: 9,
          letterSpacing: 3,
          textTransform: "uppercase",
          color: focused ? "#00f5ff" : "#334155",
          marginBottom: 6,
          transition: "color 0.4s",
        }}
      >
        {icon} {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          name={name}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type="number"
          style={{
            width: "100%",
            padding: "14px 16px",
            paddingRight: unit ? 50 : 16,
            borderRadius: 10,
            fontSize: 13,
            fontFamily: "var(--font-mono)",
            background: focused
              ? "rgba(0, 245, 255, 0.04)"
              : "rgba(255, 255, 255, 0.02)",
            border: `1px solid ${focused ? "rgba(0, 245, 255, 0.35)" : "rgba(255, 255, 255, 0.06)"}`,
            color: "#e2e8f0",
            outline: "none",
            transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: focused
              ? "0 0 25px rgba(0, 245, 255, 0.08), inset 0 0 15px rgba(0, 245, 255, 0.02)"
              : "none",
          }}
        />
        {unit && (
          <span
            style={{
              position: "absolute",
              right: 14,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 10,
              color: focused ? "#00f5ff" : "#334155",
              fontFamily: "var(--font-mono)",
              letterSpacing: 1,
              transition: "color 0.4s",
            }}
          >
            {unit}
          </span>
        )}
        {focused && (
          <>
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: "10%",
                right: "10%",
                height: 1,
                background: "linear-gradient(90deg, transparent, #00f5ff, transparent)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -1,
                left: 0,
                right: 0,
                bottom: -1,
                borderRadius: 10,
                pointerEvents: "none",
                boxShadow: "0 0 15px rgba(0, 245, 255, 0.05)",
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── XAI Feature Bar with animated shimmer ────────────────────────────────────
export function FeatureBar({ label, value, max, color, delay }) {
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setVisible(true), delay);
    const t2 = setTimeout(() => setWidth((value / max) * 100), delay + 100);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [value, max, delay]);

  return (
    <div
      style={{
        marginBottom: 14,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-20px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 5,
          fontFamily: "var(--font-mono)",
          fontSize: 10,
        }}
      >
        <span style={{ color: "#64748b" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value.toFixed(3)}</span>
      </div>
      <div
        style={{
          position: "relative",
          height: 6,
          borderRadius: 3,
          background: "rgba(255, 255, 255, 0.03)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${width}%`,
            borderRadius: 3,
            background: `linear-gradient(90deg, ${color}33, ${color})`,
            boxShadow: `0 0 12px ${color}66`,
            transition: "width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {/* Shimmer effect */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: `${width}%`,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)",
            backgroundSize: "200% 100%",
            animation: width > 0 ? "shimmer 2s ease-in-out infinite" : "none",
            borderRadius: 3,
          }}
        />
      </div>
    </div>
  );
}

// ─── Animated Counter ─────────────────────────────────────────────────────────
export function AnimatedCounter({ value, duration = 1200, style }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let startTime = null;
    const start = display;
    const animate = (ts) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (value - start) * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <span style={style}>{display}</span>;
}

// ─── Glass Panel wrapper ──────────────────────────────────────────────────────
export function GlassPanel({ children, style, glowColor, animate = false, ...rest }) {
  return (
    <div
      style={{
        background: "rgba(8, 4, 25, 0.65)",
        border: `1px solid ${glowColor ? glowColor + "22" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 20,
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        boxShadow: glowColor
          ? `0 0 60px ${glowColor}10, inset 0 1px 0 rgba(255,255,255,0.03)`
          : "0 0 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
        padding: 28,
        position: "relative",
        overflow: "hidden",
        animation: animate ? "fade-in-up 0.6s ease-out" : "none",
        transition: "border-color 0.8s, box-shadow 0.8s",
        ...style,
      }}
      {...rest}
    >
      {/* Top shine line */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "15%",
          right: "15%",
          height: 1,
          background: `linear-gradient(90deg, transparent, ${glowColor || "rgba(255,255,255,0.08)"}, transparent)`,
          opacity: 0.5,
        }}
      />
      {children}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
export function StatusBadge({ text, color, pulse = false }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 12px",
        borderRadius: 20,
        fontSize: 10,
        fontFamily: "var(--font-mono)",
        letterSpacing: 1.5,
        color: color,
        background: color + "10",
        border: `1px solid ${color}30`,
        textTransform: "uppercase",
      }}
    >
      {pulse && (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}`,
            animation: "pulse-glow 1.5s ease infinite",
          }}
        />
      )}
      {text}
    </div>
  );
}

// ─── Data Stream Visualizer (matrix rain column) ──────────────────────────────
export function DataStream({ color, width = 24, speed = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const h = 200;
    canvas.width = width * dpr;
    canvas.height = h * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = h + "px";
    ctx.scale(dpr, dpr);

    const chars = "01アイウエオカキクケコ⬡◆▲△".split("");
    const drops = Array.from({ length: Math.ceil(width / 8) }, () => Math.random() * h);
    let time = 0;

    const draw = () => {
      time += 0.05 * speed;
      ctx.fillStyle = "rgba(2, 1, 8, 0.12)";
      ctx.fillRect(0, 0, width, h);

      ctx.font = "8px 'JetBrains Mono'";
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 8;
        const brightness = Math.sin(time + i) * 0.3 + 0.7;
        ctx.fillStyle = color + Math.floor(brightness * 200).toString(16).padStart(2, "0");
        ctx.fillText(char, x, drops[i]);
        if (drops[i] > h && Math.random() > 0.97) drops[i] = 0;
        drops[i] += 6 + Math.random() * 4;
      }
      animRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animRef.current);
  }, [color, width, speed]);

  return (
    <canvas
      ref={canvasRef}
      style={{ borderRadius: 6, opacity: 0.6 }}
    />
  );
}
