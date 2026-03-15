"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "@/lib/api";
import { Aurora } from "@/components/ui/aurora";


/* ─── Radar animation ─────────────────────────────────────────────────── */
function RadarOrb() {
  return (
    <div style={{ position: "relative", width: 220, height: 240, margin: "0 auto", filter: "drop-shadow(0 0 22px rgba(59,130,246,0.4))" }}>
      <svg width="220" height="240" viewBox="0 0 220 240">
        <defs>
          <radialGradient id="radarGrad" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.80)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </radialGradient>
          <radialGradient id="radarTrail" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.22)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </radialGradient>
          <radialGradient id="radarBg" cx="50%" cy="46%" r="50%">
            <stop offset="0%" stopColor="rgba(59,130,246,0.09)" />
            <stop offset="100%" stopColor="rgba(6,13,24,0)" />
          </radialGradient>
        </defs>

        {/* Background disc */}
        <circle cx="110" cy="110" r="92" fill="url(#radarBg)" />

        {/* Concentric rings */}
        {[90, 67, 45, 22].map((r, i) => (
          <circle key={i} cx="110" cy="110" r={r}
            fill="none"
            stroke={i === 0 ? "rgba(59,130,246,0.55)" : "rgba(59,130,246,0.30)"}
            strokeWidth={i === 0 ? 1.6 : 1.1}
          />
        ))}

        {/* Cross hair lines */}
        <line x1="110" y1="18" x2="110" y2="202" stroke="rgba(59,130,246,0.30)" strokeWidth="0.9" />
        <line x1="18"  y1="110" x2="202" y2="110" stroke="rgba(59,130,246,0.30)" strokeWidth="0.9" />

        {/* Diagonal guides */}
        <line x1="46" y1="46"  x2="174" y2="174" stroke="rgba(59,130,246,0.13)" strokeWidth="0.7" />
        <line x1="174" y1="46" x2="46"  y2="174" stroke="rgba(59,130,246,0.13)" strokeWidth="0.7" />

        {/* Tick marks on outer ring (every 30°) */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const inner = 86, outer = 92;
          return (
            <line key={i}
              x1={110 + inner * Math.cos(a)} y1={110 + inner * Math.sin(a)}
              x2={110 + outer * Math.cos(a)} y2={110 + outer * Math.sin(a)}
              stroke="rgba(59,130,246,0.55)" strokeWidth={i % 3 === 0 ? 1.4 : 0.8}
            />
          );
        })}

        {/* Compass labels */}
        <text x="110" y="13" textAnchor="middle" fill="rgba(59,130,246,0.55)" fontSize="7" fontFamily="'Courier New',monospace" fontWeight="700">N</text>
        <text x="207" y="113" textAnchor="middle" fill="rgba(59,130,246,0.55)" fontSize="7" fontFamily="'Courier New',monospace" fontWeight="700">E</text>
        <text x="110" y="208" textAnchor="middle" fill="rgba(59,130,246,0.55)" fontSize="7" fontFamily="'Courier New',monospace" fontWeight="700">S</text>
        <text x="13"  y="113" textAnchor="middle" fill="rgba(59,130,246,0.55)" fontSize="7" fontFamily="'Courier New',monospace" fontWeight="700">W</text>

        {/* Echo trail (60° arc behind sweep) */}
        <g style={{ transformOrigin: "110px 110px", animation: "radar 3s linear infinite" }}>
          <path d="M110 110 L200 110 A90 90 0 0 1 155 32Z" fill="url(#radarTrail)" />
        </g>

        {/* Radar sweep */}
        <g style={{ transformOrigin: "110px 110px", animation: "radar 3s linear infinite" }}>
          <path d="M110 110 L200 110 A90 90 0 0 0 110 20Z" fill="url(#radarGrad)" />
          <line x1="110" y1="110" x2="200" y2="110" stroke="#93C5FD" strokeWidth="2" opacity="0.95" />
        </g>

        {/* Blip dots */}
        <circle cx="148" cy="78"  r="7" fill="none" stroke="rgba(59,130,246,0.25)" strokeWidth="1" style={{ animation: "pulse 1.5s ease-in-out infinite" }} />
        <circle cx="148" cy="78"  r="3.5" fill="#3B82F6" />

        <circle cx="80"  cy="130" r="6" fill="none" stroke="rgba(74,222,128,0.25)"  strokeWidth="1" style={{ animation: "pulse 2s ease-in-out infinite", animationDelay: "0.7s" }} />
        <circle cx="80"  cy="130" r="2.5" fill="#34D399" />

        <circle cx="158" cy="140" r="6" fill="none" stroke="rgba(59,130,246,0.25)" strokeWidth="1" style={{ animation: "pulse 1.8s ease-in-out infinite", animationDelay: "1.2s" }} />
        <circle cx="158" cy="140" r="3"   fill="#60A5FA" />

        <circle cx="95"  cy="72"  r="5" fill="none" stroke="rgba(96,207,255,0.25)"  strokeWidth="1" style={{ animation: "pulse 2.2s ease-in-out infinite", animationDelay: "0.4s" }} />
        <circle cx="95"  cy="72"  r="2.2" fill="#93C5FD" />

        {/* Center crosshair dot */}
        <circle cx="110" cy="110" r="4" fill="none" stroke="#93C5FD" strokeWidth="1.2" opacity="0.8" />
        <circle cx="110" cy="110" r="2" fill="#93C5FD" opacity="0.95" />

        {/* Status label */}
        <text x="110" y="228" textAnchor="middle" fill="rgba(59,130,246,0.70)" fontSize="8" fontFamily="'Courier New',monospace" fontWeight="700" letterSpacing="3">SCANNING…</text>
      </svg>
    </div>
  );
}

const NavBtn = ({ href, children, style, className, msg = "Opening..." }: any) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const router = useRouter();

  const handleNav = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    setIsNavigating(true);
    router.push(href);
  };

  return (
    <a href={href} onClick={handleNav} className={className} style={{...style, opacity: isNavigating ? 0.7 : 1, pointerEvents: isNavigating ? "none" : "auto" }}>
      {isNavigating ? (
        <><span style={{ width: 14, height: 14, display: "inline-block", border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "currentColor", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8, verticalAlign: "middle" }} /> {msg}</>
      ) : children}
    </a>
  );
};

/* ─── Legal AI Visual (Canvas) ─────────────────────────────────────────── */
function LegalAIVisual() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctxRaw = canvas.getContext("2d");
    if (!ctxRaw) return;
    const ctx = ctxRaw;

    const W = 420, H = 500;
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(dpr, dpr);

    // ── sphere node topology ──────────────────────────────────────────
    // CY = midpoint of gap between top cards (bottom=106) and bottom cards (top=402)
    const CX = W / 2, CY = 254;
    const R = 88;
    const NODE_COUNT = 28;
    type Node = { bx: number; by: number; bz: number; x: number; y: number; z: number };
    const baseNodes: Node[] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const phi   = Math.acos(1 - 2 * (i + 0.5) / NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const bx = Math.sin(phi) * Math.cos(theta);
      const by = Math.sin(phi) * Math.sin(theta);
      const bz = Math.cos(phi);
      baseNodes.push({ bx, by, bz, x: 0, y: 0, z: 0 });
    }

    // edges: connect nodes within distance threshold on sphere
    const edges: [number, number][] = [];
    for (let a = 0; a < NODE_COUNT; a++) {
      for (let b = a + 1; b < NODE_COUNT; b++) {
        const n = baseNodes[a], m = baseNodes[b];
        const d = Math.hypot(n.bx - m.bx, n.by - m.by, n.bz - m.bz);
        if (d < 0.82) edges.push([a, b]);
      }
    }

    // ── background particles ──────────────────────────────────────────
    const DOTS = Array.from({ length: 55 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 0.8 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.012 + Math.random() * 0.018,
      color: Math.random() > 0.55 ? "#3B82F6" : Math.random() > 0.5 ? "#60A5FA" : "#34D399",
    }));

    // ── orbit rings ───────────────────────────────────────────────────
    const RINGS = [
      { rx: 130, ry: 40,  tilt: 0.38, speed: 0.006, phase: 0 },
      { rx: 108, ry: 34,  tilt: -0.52, speed: -0.009, phase: 1.1 },
      { rx: 148, ry: 52,  tilt: 0.18, speed: 0.004, phase: 2.4 },
    ];

    // ── card layout constants ─────────────────────────────────────────
    const CW = 124, CH = 70;
    const topY  = 36;
    const botY  = H - CH - 28;
    const leftX  = 12;
    const rightX = W - CW - 12;

    function cBg(cx: number, cy: number, border: string) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.beginPath();
      ctx.roundRect(cx, cy, CW, CH, 12);
      ctx.fillStyle = "rgba(4,8,22,0.96)";
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const sh = ctx.createLinearGradient(cx, cy, cx, cy + 22);
      sh.addColorStop(0, "rgba(255,255,255,0.08)");
      sh.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sh;
      ctx.fill();
      ctx.restore();
    }

    function cRule(cx: number, cy: number, col: string) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy);
      ctx.lineTo(cx + CW - 10, cy);
      ctx.strokeStyle = col;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      ctx.restore();
    }

    function cTxt(
      text: string, cx: number, cy: number,
      col: string, size: number, weight: string,
      align: CanvasTextAlign = "left"
    ) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.globalAlpha = 1;
      ctx.font = `${weight} ${size}px 'Courier New',monospace`;
      ctx.fillStyle = col;
      ctx.textAlign = align;
      ctx.fillText(text, cx, cy);
      ctx.restore();
    }

    function cBadge(cx: number, cy: number, label: string, bg: string, border: string, col: string) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.shadowColor = "transparent";
      ctx.beginPath();
      ctx.roundRect(cx, cy, 64, 14, 4);
      ctx.fillStyle = bg;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.font = "700 7px 'Courier New',monospace";
      ctx.fillStyle = col;
      ctx.textAlign = "center";
      ctx.fillText(label, cx + 32, cy + 10);
      ctx.restore();
    }

    function drawCards() {
      // IPC MATCH — top-left
      const ix = leftX, iy = topY;
      cBg(ix, iy, "rgba(59,130,246,0.38)");
      cTxt("IPC MATCH", ix + 10, iy + 16, "rgba(96,165,250,1)", 7.5, "700");
      cRule(ix, iy + 22, "rgba(59,130,246,0.35)");
      cTxt("\u00a7 420",  ix + 10,     iy + 46, "#93C5FD", 17, "900");
      cTxt("94%",         ix + CW - 10, iy + 46, "#34D399", 14, "900", "right");
      cTxt("Cheating \u00b7 IPC", ix + 10, iy + 62, "rgba(180,210,255,0.85)", 7, "600");

      // AI ENGINE — top-right
      const ax = rightX, ay = topY;
      cBg(ax, ay, "rgba(64,168,255,0.34)");
      const pl = 0.55 + 0.45 * Math.sin(t * 2.8);
      ctx.save();
      ctx.beginPath();
      ctx.arc(ax + 19, ay + 15, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(74,222,128,${pl})`;
      ctx.shadowColor = "#4ADE80";
      ctx.shadowBlur = 9;
      ctx.fill();
      ctx.restore();
      cTxt("AI ENGINE",      ax + 32, ay + 19, "rgba(96,190,255,1)", 7.5, "700");
      cRule(ax, ay + 24, "rgba(64,168,255,0.40)");
      cTxt("ANALYZING\u2026",  ax + 10,  ay + 43, "#60A5FA",              11, "800");
      cTxt("5 AGENTS ACTIVE", ax + 10,  ay + 59, "rgba(180,210,255,0.90)", 7, "600");

      // VERDICT — bottom-left
      const vx = leftX, vy = botY;
      cBg(vx, vy, "rgba(74,222,128,0.30)");
      cTxt("VERDICT", vx + 10, vy + 16, "rgba(74,222,128,1)", 7.5, "700");
      cRule(vx, vy + 22, "rgba(74,222,128,0.40)");
      cTxt("73%",   vx + 10, vy + 47, "#34D399",               18, "900");
      cTxt("MATCH", vx + 60, vy + 47, "rgba(180,220,255,0.95)", 10, "700");
      cBadge(vx + 10, vy + 53, "BAILABLE", "rgba(59,130,246,0.18)", "rgba(59,130,246,0.65)", "#93C5FD");

      // PENALTY — bottom-right
      const px = rightX, py = botY;
      cBg(px, py, "rgba(96,207,255,0.28)");
      cTxt("PENALTY",           px + 10, py + 16, "rgba(96,207,255,1)", 7.5, "700");
      cRule(px, py + 22, "rgba(96,207,255,0.40)");
      cTxt("\u20b950,000",      px + 10, py + 46, "#60A5FA",               16, "900");
      cTxt("MIN 2 YRS PRISON",  px + 10, py + 61, "rgba(147,197,253,0.95)",  7, "600");
    }

    let t = 0;
    let raf: number;

    function frame() {
      ctx.clearRect(0, 0, W, H);

      // background
      ctx.fillStyle = "#060D18";
      ctx.fillRect(0, 0, W, H);

      // background glow
      const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, 200);
      bg.addColorStop(0, "rgba(59,130,246,0.12)");
      bg.addColorStop(0.45, "rgba(29,78,216,0.07)");
      bg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── background dots ──
      for (const d of DOTS) {
        const op = 0.3 + 0.4 * Math.sin(t * d.speed * 60 + d.phase);
        ctx.save();
        ctx.globalAlpha = op;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = d.color;
        ctx.shadowColor = d.color;
        ctx.shadowBlur = 4;
        ctx.fill();
        ctx.restore();
      }

      // ── orbit rings ──
      for (const ring of RINGS) {
        ring.phase += ring.speed;
        ctx.save();
        ctx.translate(CX, CY);
        ctx.rotate(ring.tilt);
        ctx.scale(1, ring.ry / ring.rx);
        ctx.beginPath();
        ctx.arc(0, 0, ring.rx, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(59,130,246,0.55)";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#3B82F6";
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
        // dot on ring
        const dx = ring.rx * Math.cos(ring.phase);
        const dy = ring.rx * Math.sin(ring.phase);
        ctx.restore();
        ctx.save();
        const rdx = dx * Math.cos(ring.tilt) - dy * (ring.ry / ring.rx) * Math.sin(ring.tilt);
        const rdy = dx * Math.sin(ring.tilt) + dy * (ring.ry / ring.rx) * Math.cos(ring.tilt);
        ctx.beginPath();
        ctx.arc(CX + rdx, CY + rdy, 3, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(59,130,246,0.7)";
        ctx.shadowColor = "#3B82F6";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();
      }

      // ── rotate nodes ──
      const spinY = t * 0.28;
      const spinX = t * 0.10;
      const cosY  = Math.cos(spinY), sinY = Math.sin(spinY);
      const cosX  = Math.cos(spinX), sinX = Math.sin(spinX);
      for (const n of baseNodes) {
        // rotate Y then X
        const rx1 = n.bx * cosY + n.bz * sinY;
        const rz1 = -n.bx * sinY + n.bz * cosY;
        const ry1 = n.by * cosX - rz1 * sinX;
        const rz2 = n.by * sinX + rz1 * cosX;
        n.x  = CX + rx1 * R;
        n.y  = CY + ry1 * R;
        n.z  = rz2;
      }

      // ── edges ──
      for (const [a, b] of edges) {
        const na = baseNodes[a], nb = baseNodes[b];
        const avgZ = (na.z + nb.z) * 0.5;
        const vis  = (avgZ + 1) / 2;          // 0=back, 1=front
        const pulse = 0.18 + 0.22 * Math.sin(t * 1.4 + a * 0.5);
        ctx.save();
        ctx.globalAlpha = vis * pulse * 1.6;
        ctx.beginPath();
        ctx.moveTo(na.x, na.y);
        ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth   = 0.85;
        ctx.stroke();
        ctx.restore();
      }

      // ── nodes ──
      for (let i = 0; i < NODE_COUNT; i++) {
        const n   = baseNodes[i];
        const vis = (n.z + 1) / 2;
        const r   = 2.2 + vis * 2.2;
        const glow = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.8);
        glow.addColorStop(0, `rgba(147,197,253,${0.9 * vis})`);
        glow.addColorStop(1, "rgba(147,197,253,0)");
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.8, 0, Math.PI * 2);
        ctx.fillStyle = glow;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,197,253,${vis})`;
        ctx.shadowColor = "#3B82F6";
        ctx.shadowBlur  = 8;
        ctx.fill();
        ctx.restore();
      }

      // ── outer sphere glow ──
      const glow2 = ctx.createRadialGradient(CX, CY, R * 0.7, CX, CY, R * 1.4);
      glow2.addColorStop(0, "rgba(59,130,246,0.06)");
      glow2.addColorStop(1, "rgba(59,130,246,0)");
      ctx.beginPath();
      ctx.arc(CX, CY, R * 1.4, 0, Math.PI * 2);
      ctx.fillStyle = glow2;
      ctx.fill();

      // ── panel cards ──
      drawCards();

      t += 0.016;
      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: "block", borderRadius: 16 }}
    />
  );
}
/* ─── Main Page ───────────────────────────────────────────────────────── */
export default function LandingPage() {
  const router = useRouter();
  const [scrollY, setScrollY] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [typed, setTyped] = useState("");
  const fullText = "Describe your situation. We find the law.";

  useEffect(() => {
    setLoggedIn(isLoggedIn());
    // Pre-compile destination routes so navigation is instant
    router.prefetch("/login");
    router.prefetch("/signup");
    router.prefetch("/dashboard");
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, [router]);

  // Typewriter effect
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      setTyped(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(iv);
    }, 55);
    return () => clearInterval(iv);
  }, []);

  const features = [
    { icon: "🔍", t: "IPC Identifier", d: "Pinpoints exact Indian Penal Code sections for your situation in seconds." },
    { icon: "⚡", t: "Outcome Engine", d: "Predicts bail, imprisonment, fines, and civil remedies from 5 AI agents." },
    { icon: "🛡️", t: "Precaution Brief", d: "Immediate steps to protect your rights before you reach a lawyer." },
    { icon: "📁", t: "Case Reports", d: "Download a court-ready PDF or DOCX report with all references." },
    { icon: "🔐", t: "Persistent Sessions", d: "Log in once — stay in until you choose to sign out. Your history always waiting." },
    { icon: "📜", t: "Full Case History", d: "Every query saved. Re-read past analyses. Download old reports anytime." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", overflowX: "hidden" }}>
      <Aurora
        colorStops={["#1D4ED8", "#6366F1", "#060D18"]}
        amplitude={1.5}
        blend={120}
        speed={1.4}
        opacity={0.65}
      />

      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, rgba(5,7,11,0.7) 100%)", pointerEvents: "none", zIndex: 1 }} />

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        padding: "0 6%",
        borderBottom: "1px solid rgba(59,130,246,0.10)",
        backdropFilter: "blur(20px)",
        background: "rgba(6,13,24,0.82)",
      }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 68 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 22, filter: "drop-shadow(0 0 8px rgba(59,130,246,0.6))" }}>⚖️</span>
            <div>
              <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 20, color: "#EDF2F7", letterSpacing: "0.5px" }}>LexBrain AI</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: "var(--amber)", marginLeft: 8, letterSpacing: "2px", opacity: 0.8 }}>INDIA</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {loggedIn ? (
              <NavBtn href="/dashboard" className="btn-amber" style={{ fontSize: 13, padding: "9px 20px" }}>Open Dashboard →</NavBtn>
            ) : (
              <>
                <NavBtn href="/login" className="btn-ghost" style={{ fontSize: 13, padding: "8px 18px" }}>Sign In</NavBtn>
                <NavBtn href="/signup" className="btn-amber" style={{ fontSize: 13, padding: "9px 20px" }}>Start Free →</NavBtn>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", zIndex: 2, minHeight: "100vh", display: "flex", alignItems: "center", padding: "100px 6% 60px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%", display: "flex", alignItems: "center", gap: 60, flexWrap: "wrap", justifyContent: "space-between" }}>

          {/* Left text */}
          <div style={{ flex: "1 1 460px", maxWidth: 560, animation: "fadeUp 0.8s ease forwards" }}>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: "2px", marginBottom: 28, textTransform: "uppercase" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ADE80", animation: "pulse 2s infinite" }} />
              5-Agent AI · Indian Law Intelligence
            </div>

            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(40px,5.5vw,68px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-1px", color: "var(--bright)", marginBottom: 16 }}>
              Know Your<br />
              <span style={{ color: "var(--amber)", textShadow: "0 0 40px rgba(59,130,246,0.4)" }}>Legal Rights.</span><br />
              Right Now.
            </h1>

            {/* Typewriter */}
            <div style={{ fontFamily: "'Syne', monospace", fontSize: 17, color: "var(--muted)", marginBottom: 36, minHeight: 26 }}>
              {typed}<span style={{ animation: "blink 1s step-end infinite", color: "var(--amber)" }}>|</span>
            </div>

            <p style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.8, marginBottom: 44, maxWidth: 460 }}>
              Type your legal situation in plain language. Our 5 specialized AI agents identify IPC sections, predict outcomes, suggest precautions — and generate a professional report in under 15 seconds.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <NavBtn href="/signup" className="btn-amber">Analyze My Case Free →</NavBtn>
              <NavBtn href="/login" className="btn-ghost">Sign In</NavBtn>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 32, marginTop: 52, flexWrap: "wrap" }}>
              {[["500+", "IPC Sections"], ["5", "AI Agents"], ["< 15s", "Analysis"], ["PDF+DOCX", "Reports"]].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "var(--amber)", lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3, letterSpacing: "0.5px" }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — hologram */}
          <div style={{ flex: "1 1 420px", display: "flex", justifyContent: "center", animation: "fadeIn 1s ease 0.3s both" }}>
            <LegalAIVisual />
          </div>

        </div>
      </section>

      {/* ── DIVIDER ── */}
      <div style={{ position: "relative", zIndex: 2, padding: "0 6%", marginBottom: 80 }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", borderTop: "1px solid var(--border)" }} />
      </div>

      {/* ── HOW IT WORKS ── */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 6% 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>OPERATION PROCEDURE</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px,4vw,46px)", color: "var(--bright)", letterSpacing: "-0.5px" }}>How the Investigation Works</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 2 }}>
            {[
              ["01", "File Your Case", "Describe the situation in plain language — no legal terms needed."],
              ["02", "Intelligence Gathering", "Agent 1 classifies. Agent 2 retrieves IPC. Agent 3 predicts outcomes."],
              ["03", "Field Analysis", "Agent 4 advises precautions. Agent 5 writes a plain-language summary."],
              ["04", "Close the Case", "Review full analysis and download a professional PDF or DOCX report."],
            ].map(([n, t, d], i) => (
              <div key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent", border: "1px solid var(--border)", borderRadius: i === 0 ? "14px 0 0 14px" : i === 3 ? "0 14px 14px 0" : "0", padding: "36px 28px", position: "relative", overflow: "hidden", transition: "border-color 0.3s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.3)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 60, fontWeight: 900, color: "rgba(59,130,246,0.07)", lineHeight: 1, position: "absolute", top: 10, right: 14 }}>{n}</div>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.25)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 13, fontWeight: 800, color: "var(--amber)" }}>{parseInt(n)}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--bright)", marginBottom: 8, letterSpacing: "0.2px" }}>{t}</h3>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 6% 100px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>CAPABILITIES</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px,4vw,46px)", color: "var(--bright)" }}>Intelligence Arsenal</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 14 }}>
            {features.map((f, i) => (
              <div key={i} className="card" style={{ transition: "all 0.25s", cursor: "default" }}
                onMouseEnter={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "rgba(59,130,246,0.3)"; d.style.transform = "translateY(-2px)"; d.style.boxShadow = "0 8px 32px rgba(59,130,246,0.08)"; }}
                onMouseLeave={e => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "var(--border)"; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--bright)", marginBottom: 8 }}>{f.t}</h3>
                <p style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.65 }}>{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RADAR + CTA ── */}
      <section style={{ position: "relative", zIndex: 2, padding: "0 6% 120px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", textAlign: "center" }}>
          <RadarOrb />
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px,4vw,44px)", color: "var(--bright)", marginBottom: 16, marginTop: 24 }}>
            Ready to Open Your Case?
          </h2>
          <p style={{ color: "var(--text)", fontSize: 15, lineHeight: 1.75, marginBottom: 36, maxWidth: 480, margin: "0 auto 36px" }}>
            Free. No credit card. Log in once — your cases stay until you sign out.
          </p>
          <NavBtn href="/signup" className="btn-amber" style={{ fontSize: 16, padding: "15px 40px" }}>
            Begin Investigation →
          </NavBtn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ position: "relative", zIndex: 2, borderTop: "1px solid var(--border)", padding: "24px 6%", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--dim)", opacity: 0.5 }}>
          © 2024 LexBrain AI India · For informational purposes only · Not a substitute for professional legal advice
        </p>
      </footer>
    </div>
  );
}
