"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authApi, saveToken, isLoggedIn } from "@/lib/api";
import { Aurora } from "@/components/ui/aurora";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]  = useState(false);
  const [mounted, setMounted] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  // Timed to match: bcrypt ~300ms, JWT+cookie ~100ms, navigate ~200ms
  const M = ["Checking credentials…", "Authenticating…", "Opening your dashboard…"];

  useEffect(() => {
    if (loading) {
      // 500ms interval: 3 messages × 500ms = 1.5s covers worst-case login latency
      const interval = setInterval(() => {
        setMsgIdx(i => Math.min(i + 1, M.length - 1));
      }, 500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    if (isLoggedIn()) {
      window.location.href = "/dashboard";
      return;
    }
    // Show a message if user was logged out due to inactivity
    const params = new URLSearchParams(window.location.search);
    if (params.get("reason") === "idle") {
      toast("You were signed out after 2 hours of inactivity.", {
        icon: "⏱️",
        duration: 5000,
        style: { background: "#1a1200", border: "1px solid rgba(245,158,11,0.4)", color: "#FCD34D" },
      });
    } else if (params.get("reason") === "expired") {
      toast("Your session has expired. Please sign in again.", {
        icon: "🔒",
        duration: 5000,
        style: { background: "#1a1200", border: "1px solid rgba(245,158,11,0.4)", color: "#FCD34D" },
      });
    }
    setMounted(true);
    // Pre-compile dashboard so redirect after login is instant
    router.prefetch("/dashboard");
    router.prefetch("/signup");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Instant client-side checks (no network round-trip needed) ────────────
    if (!form.email.includes("@")) {
      toast.error("Enter a valid email address."); return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters."); return;
    }

    setLoading(true);
    setMsgIdx(0);
    try {
      const res = await authApi.login(form);
      saveToken(res.data.access_token);
      // Set flag BEFORE navigating so dashboard shows the toast after reload
      sessionStorage.setItem("just_logged_in", "1");
      window.location.href = "/dashboard";
      // Keep loading=true while page transitions so button stays disabled
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials.");
      setLoading(false);
      setMsgIdx(0);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--ink)", fontFamily: "'Syne', system-ui, sans-serif" }}>
      <Aurora colorStops={["#1D4ED8", "#6366F1", "#060D18"]} amplitude={1.5} blend={120} speed={1.4} opacity={0.65} />
      {/* Left noir panel */}
      <div style={{ flex: "0 0 42%", background: "linear-gradient(160deg, #0E1320 0%, var(--ink) 100%)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 8%", position: "relative", overflow: "hidden" }}>

        {/* Amber glow blob */}
        <div style={{ position: "absolute", top: "20%", left: "5%", width: 320, height: 320, borderRadius: "50%", background: "rgba(59,130,246,0.05)", filter: "blur(80px)", pointerEvents: "none" }} />

        {/* Scanline */}
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "rgba(59,130,246,0.08)", animation: "scanline 6s linear infinite", pointerEvents: "none" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 64 }}>
          <span style={{ fontSize: 20, filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}>⚖️</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: "var(--bright)" }}>LexBrain AI</span>
        </Link>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px,3vw,46px)", fontWeight: 900, color: "var(--bright)", lineHeight: 1.1, marginBottom: 20 }}>
          The case<br />awaits your<br /><span style={{ color: "var(--amber)" }}>return.</span>
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, maxWidth: 300, marginBottom: 48 }}>
          Sign in once. Your session persists until you choose to close it — no repeated logins.
        </p>

        {/* Case board items */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            ["📁", "All past cases saved automatically"],
            ["🔒", "Session stays active until sign-out"],
            ["⚡", "Resume analysis where you left off"],
          ].map(([icon, text]) => (
            <div key={String(text)} style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 13 }}>
              <span style={{ fontSize: 16 }}>{icon}</span> {text}
            </div>
          ))}
        </div>

        {/* Decorative case number */}
        <div style={{ position: "absolute", bottom: 32, right: 28, fontFamily: "'Playfair Display', serif", fontSize: 80, fontWeight: 900, color: "rgba(59,130,246,0.04)", lineHeight: 1, userSelect: "none" }}>
          §
        </div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 8%" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Small tag */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "var(--amber)", fontWeight: 700, letterSpacing: "2px", marginBottom: 28, textTransform: "uppercase" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--amber)", animation: "pulse 2s infinite" }} />
            SECURE ACCESS
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, color: "var(--bright)", letterSpacing: "-0.3px", marginBottom: 6 }}>Sign In</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 36 }}>
            No account? <Link href="/signup" style={{ color: "var(--amber)", textDecoration: "none", fontWeight: 700 }}>Create one free →</Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>Email Address</label>
              <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                className="field" style={{ width: "100%" }} placeholder="you@example.com" />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                  className="field" style={{ width: "100%", paddingRight: 48 }} placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", lineHeight: 1 }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--amber)"}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--dim)"}
                  aria-label={showPw ? "Hide password" : "Show password"}>
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6 20 1.73 14.54 1 12c.46-1.28 1.28-2.85 2.5-4.24M9.9 4.24A10.94 10.94 0 0 1 12 4c6 0 10.27 5.46 11 8-.3.84-.8 1.85-1.56 2.9"/>
                      <line x1="2" y1="2" x2="22" y2="22"/>
                      <path d="M10.73 10.73A2 2 0 0 0 12 14a2 2 0 0 0 1.27-3.27"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12C2.73 7.61 7 4 12 4s9.27 3.61 11 8c-1.73 4.39-6 8-11 8S2.73 16.39 1 12z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: -8 }}>
              <Link href="/forgot-password" style={{ fontSize: 12, color: "var(--amber)", textDecoration: "none", fontWeight: 600, opacity: 0.85 }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "1"}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85"}>
                Forgot Password?
              </Link>
            </div>
            <button type="submit" disabled={loading} className="btn-amber"
              style={{ width: "100%", justifyContent: "center", marginTop: 4, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? (
                <><span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0A0C10", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> {M[msgIdx]}</>
              ) : "Enter the Case Room →"}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: "14px 16px", background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.1)", borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
              ⏱️ <strong style={{ color: "var(--amber)" }}>Session policy:</strong> Sessions last 10 hours. You are signed out automatically after 2 hours of inactivity for security.
            </p>
          </div>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--dim)" }}>
            <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
