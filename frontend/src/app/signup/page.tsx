"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { authApi, saveToken, isLoggedIn } from "@/lib/api";
import { Aurora } from "@/components/ui/aurora";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm]     = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]  = useState(false);
  const [mounted, setMounted] = useState(false);
  const [msgIdx, setMsgIdx] = useState(0);
  const M = ["Creating Account...", "Securing Credentials...", "Opening Case File..."];

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setMsgIdx(i => Math.min(i + 1, M.length - 1));
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  useEffect(() => {
    if (isLoggedIn()) {
      window.location.href = "/dashboard";
      return;
    }
    setMounted(true);
    // Pre-compile dashboard so redirect after signup is instant
    router.prefetch("/dashboard");
    router.prefetch("/login");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    setLoading(true);
    setMsgIdx(0);
    try {
      await authApi.signup(form);
      const res = await authApi.login({ email: form.email, password: form.password });
      saveToken(res.data.access_token);
      toast.success("Case file opened. Welcome to LexBrain AI.");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Signup failed. Try again.");
      setLoading(false);
    }
  };

  const pw = form.password;
  const strength = pw.length === 0 ? 0 : pw.length < 6 ? 1 : pw.length < 10 ? 2 : 3;
  const sColors  = ["transparent", "#EF4444", "#3B82F6", "#34D399"];
  const sLabels  = ["", "Weak", "Fair", "Strong"];

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--ink)", display: "flex", alignItems: "center", justifyContent: "center" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--ink)", fontFamily: "'Syne', system-ui, sans-serif" }}>
      <Aurora colorStops={["#1D4ED8", "#6366F1", "#060D18"]} amplitude={1.5} blend={120} speed={1.4} opacity={0.65} />
      {/* Left panel */}
      <div style={{ flex: "0 0 42%", background: "linear-gradient(160deg, #0E1320, var(--ink))", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 8%", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: "20%", right: "5%", width: 300, height: 300, borderRadius: "50%", background: "rgba(59,130,246,0.04)", filter: "blur(70px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "rgba(59,130,246,0.07)", animation: "scanline 8s linear infinite", animationDelay: "3s", pointerEvents: "none" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 64 }}>
          <span style={{ fontSize: 20, filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}>⚖️</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: "var(--bright)" }}>LexBrain AI</span>
        </Link>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(30px,3vw,46px)", fontWeight: 900, color: "var(--bright)", lineHeight: 1.1, marginBottom: 20 }}>
          Open your<br />case file.<br /><span style={{ color: "var(--amber)" }}>Free.</span>
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, maxWidth: 300, marginBottom: 44 }}>
          Create an account and get instant access to AI-powered legal intelligence.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[["🔍","IPC Sections"],["⚡","Outcome Prediction"],["🛡️","Precaution Advice"],["📄","Legal Reports"]].map(([ic,lb]) => (
            <div key={String(lb)} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>{ic}</span>
              <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{lb}</span>
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 28, right: 24, fontFamily: "'Playfair Display', serif", fontSize: 80, fontWeight: 900, color: "rgba(59,130,246,0.04)", lineHeight: 1, userSelect: "none" }}>§</div>
      </div>

      {/* Right form */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 8%" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.15)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#4ADE80", fontWeight: 700, letterSpacing: "2px", marginBottom: 28, textTransform: "uppercase" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ADE80", animation: "pulse 2s infinite" }} />
            NEW CASE FILE
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 900, color: "var(--bright)", letterSpacing: "-0.3px", marginBottom: 6 }}>Create Account</h1>
          <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 36 }}>
            Have one? <Link href="/login" style={{ color: "var(--amber)", textDecoration: "none", fontWeight: 700 }}>Sign in →</Link>
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {[
              { key: "name",  label: "Full Name",     type: "text",  ph: "Enter your full name" },
              { key: "email", label: "Email Address", type: "email", ph: "you@example.com" },
            ].map(({ key, label, type, ph }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>{label}</label>
                <input type={type} required value={form[key as keyof typeof form]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  className="field" style={{ width: "100%" }} placeholder={ph} />
              </div>
            ))}

            <div>
              <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input type={showPw ? "text" : "password"} required value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="field" style={{ width: "100%", paddingRight: 48 }} placeholder="Min. 6 characters" />
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
              {pw.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                  {[1,2,3].map(l => (
                    <div key={l} style={{ flex: 1, height: 3, borderRadius: 2, background: l <= strength ? sColors[strength] : "rgba(255,255,255,0.07)", transition: "background 0.3s", boxShadow: l <= strength ? `0 0 8px ${sColors[strength]}40` : "none" }} />
                  ))}
                  <span style={{ fontSize: 11, color: sColors[strength], fontWeight: 700, minWidth: 40 }}>{sLabels[strength]}</span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-amber"
              style={{ width: "100%", justifyContent: "center", marginTop: 6, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? (
                <><span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0A0C10", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> {M[msgIdx]}</>
              ) : "Open My Case File →"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--dim)" }}>
            <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
