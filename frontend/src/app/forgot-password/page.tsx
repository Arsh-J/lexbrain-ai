"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { forgotPassword, verifyOtp, isLoggedIn } from "@/lib/api";
import { Aurora } from "@/components/ui/aurora";

type Step = "email" | "otp";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [mounted, setMounted] = useState(false);

  // Step 1 state
  const [email, setEmail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [sendLabel, setSendLabel]   = useState("Sending OTP…");

  // Step 2 state
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [resetting, setResetting]   = useState(false);
  const [resetLabel, setResetLabel] = useState("Resetting…");
  const [success, setSuccess]       = useState(false);

  const labelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isLoggedIn()) {
      window.location.href = "/dashboard";
      return;
    }
    setMounted(true);
    router.prefetch("/login");
  }, [router]);

  // ── Step 1: send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSendingOtp(true);
    setSendLabel("Sending OTP…");
    // Resend API typically responds in 500ms–1s — shift label at 800ms
    labelTimerRef.current = setTimeout(() => setSendLabel("Delivering to your inbox…"), 800);
    try {
      await forgotPassword(email.trim().toLowerCase());
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      toast.success("OTP sent! Check your inbox (and spam folder).", {
        icon: "📬",
        duration: 5000,
        style: { background: "#0E1320", border: "1px solid rgba(52,211,153,0.3)", color: "#D1FAE5" },
      });
      setStep("otp");
    } catch {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSendingOtp(false);
      setSendLabel("Sending OTP…");
    }
  };

  // ── Step 2: verify OTP and reset password ─────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) { toast.error("Enter the 6-digit OTP."); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setResetting(true);
    setResetLabel("Verifying OTP…");
    // Redis check is ~100–200ms — shift to DB update label at 400ms
    labelTimerRef.current = setTimeout(() => setResetLabel("Saving new password…"), 400);
    try {
      await verifyOtp(email, otp, newPassword);
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      setSuccess(true);
      toast.success("Password reset successfully! Redirecting…", {
        icon: "🔑",
        duration: 3000,
        style: { background: "#0E1320", border: "1px solid rgba(52,211,153,0.3)", color: "#D1FAE5" },
      });
      setTimeout(() => { window.location.href = "/login"; }, 2000);
    } catch (err: any) {
      if (labelTimerRef.current) clearTimeout(labelTimerRef.current);
      toast.error(err.response?.data?.detail || "Invalid or expired OTP.");
    } finally {
      setResetting(false);
      setResetLabel("Verifying OTP…");
    }
  };

  const pw = newPassword;
  const strength = pw.length === 0 ? 0 : pw.length < 6 ? 1 : pw.length < 10 ? 2 : 3;
  const sColors = ["transparent", "#EF4444", "#3B82F6", "#34D399"];
  const sLabels = ["", "Weak", "Fair", "Strong"];

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--ink)" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--ink)", fontFamily: "'Syne', system-ui, sans-serif" }}>
      <Aurora colorStops={["#1D4ED8", "#6366F1", "#060D18"]} amplitude={1.5} blend={120} speed={1.4} opacity={0.65} />

      {/* Left panel */}
      <div style={{ flex: "0 0 42%", background: "linear-gradient(160deg, #0E1320 0%, var(--ink) 100%)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 8%", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "20%", left: "5%", width: 320, height: 320, borderRadius: "50%", background: "rgba(99,102,241,0.05)", filter: "blur(80px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, right: 0, height: 2, background: "rgba(59,130,246,0.08)", animation: "scanline 6s linear infinite", pointerEvents: "none" }} />

        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 64 }}>
          <span style={{ fontSize: 20, filter: "drop-shadow(0 0 6px rgba(59,130,246,0.5))" }}>⚖️</span>
          <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 18, color: "var(--bright)" }}>LexBrain AI</span>
        </Link>

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px,3vw,42px)", fontWeight: 900, color: "var(--bright)", lineHeight: 1.1, marginBottom: 20 }}>
          Lost access?<br />We&apos;ll get<br /><span style={{ color: "var(--amber)" }}>you back in.</span>
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.8, maxWidth: 300, marginBottom: 48 }}>
          Enter your registered email and we&apos;ll send a one-time password to verify your identity.
        </p>

        {/* Step indicators */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["📧", "Enter your email address", step === "email"],
            ["🔢", "Enter the 6-digit OTP", step === "otp"],
            ["🔑", "Set your new password", step === "otp"],
          ].map(([icon, text, active], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, color: active ? "var(--amber)" : "var(--muted)", fontSize: 13, transition: "color 0.3s" }}>
              <span style={{ fontSize: 16, opacity: active ? 1 : 0.5 }}>{icon}</span>
              <span style={{ opacity: active ? 1 : 0.5 }}>{text as string}</span>
            </div>
          ))}
        </div>

        <div style={{ position: "absolute", bottom: 32, right: 28, fontFamily: "'Playfair Display', serif", fontSize: 80, fontWeight: 900, color: "rgba(59,130,246,0.04)", lineHeight: 1, userSelect: "none" }}>§</div>
      </div>

      {/* Right form panel */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 8%" }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)", borderRadius: 20, padding: "4px 12px", fontSize: 10, color: "#A5B4FC", fontWeight: 700, letterSpacing: "2px", marginBottom: 28, textTransform: "uppercase" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#A5B4FC", animation: "pulse 2s infinite" }} />
            ACCOUNT RECOVERY
          </div>

          {success ? (
            /* ── Success state ── */
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>✅</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 900, color: "var(--bright)", marginBottom: 12 }}>Password Reset!</h1>
              <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
                Your password has been successfully updated.
              </p>
              <p style={{ color: "var(--dim)", fontSize: 13 }}>Redirecting to login in 2 seconds…</p>
            </div>
          ) : step === "email" ? (
            /* ── Step 1: Email form ── */
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "var(--bright)", letterSpacing: "-0.3px", marginBottom: 6 }}>Forgot Password</h1>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 36 }}>
                Remember it?{" "}
                <Link href="/login" style={{ color: "var(--amber)", textDecoration: "none", fontWeight: 700 }}>
                  Sign in →
                </Link>
              </p>

              <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    Registered Email Address
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="field"
                    style={{ width: "100%" }}
                    placeholder="you@example.com"
                  />
                  <p style={{ fontSize: 11, color: "var(--dim)", marginTop: 8, lineHeight: 1.5 }}>
                    A 6-digit OTP will be sent to this email address.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={sendingOtp}
                  className="btn-amber"
                  style={{ width: "100%", justifyContent: "center", opacity: sendingOtp ? 0.7 : 1, cursor: sendingOtp ? "not-allowed" : "pointer" }}
                >
                  {sendingOtp ? (
                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0A0C10", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> {sendLabel}</>
                  ) : "Send OTP →"}
                </button>
              </form>
            </>
          ) : (
            /* ── Step 2: OTP + new password ── */
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 900, color: "var(--bright)", letterSpacing: "-0.3px", marginBottom: 6 }}>Reset Password</h1>
              <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 8 }}>
                OTP sent to <strong style={{ color: "var(--amber)" }}>{email}</strong>
              </p>
              <button
                onClick={() => setStep("email")}
                style={{ background: "none", border: "none", color: "var(--dim)", fontSize: 12, padding: 0, cursor: "pointer", marginBottom: 28, fontFamily: "'Syne', sans-serif" }}
              >
                ← Use a different email
              </button>

              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* OTP field */}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    6-Digit OTP
                  </label>
                  <input
                    id="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="\d{6}"
                    required
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="field"
                    style={{ width: "100%", letterSpacing: "0.4em", fontSize: 20, textAlign: "center" }}
                    placeholder="______"
                    autoFocus
                  />
                </div>

                {/* New password */}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    New Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      id="new-password"
                      type={showPw ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="field"
                      style={{ width: "100%", paddingRight: 48 }}
                      placeholder="Min. 6 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--dim)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--amber)"}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = "var(--dim)"}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      {showPw ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C6 20 1.73 14.54 1 12c.46-1.28 1.28-2.85 2.5-4.24M9.9 4.24A10.94 10.94 0 0 1 12 4c6 0 10.27 5.46 11 8-.3.84-.8 1.85-1.56 2.9" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                          <path d="M10.73 10.73A2 2 0 0 0 12 14a2 2 0 0 0 1.27-3.27" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12C2.73 7.61 7 4 12 4s9.27 3.61 11 8c-1.73 4.39-6 8-11 8S2.73 16.39 1 12z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {pw.length > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
                      {[1, 2, 3].map(l => (
                        <div key={l} style={{ flex: 1, height: 3, borderRadius: 2, background: l <= strength ? sColors[strength] : "rgba(255,255,255,0.07)", transition: "background 0.3s", boxShadow: l <= strength ? `0 0 8px ${sColors[strength]}40` : "none" }} />
                      ))}
                      <span style={{ fontSize: 11, color: sColors[strength], fontWeight: 700, minWidth: 40 }}>{sLabels[strength]}</span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 8, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type={showPw ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="field"
                    style={{
                      width: "100%",
                      borderColor: confirmPassword && confirmPassword !== newPassword ? "rgba(239,68,68,0.6)" : "",
                    }}
                    placeholder="Repeat new password"
                  />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <p style={{ fontSize: 11, color: "#EF4444", marginTop: 6 }}>Passwords don&apos;t match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={resetting || otp.length !== 6 || newPassword !== confirmPassword || newPassword.length < 6}
                  className="btn-amber"
                  style={{
                    width: "100%",
                    justifyContent: "center",
                    marginTop: 4,
                    opacity: resetting || otp.length !== 6 || newPassword !== confirmPassword || newPassword.length < 6 ? 0.55 : 1,
                    cursor: resetting ? "not-allowed" : "pointer",
                  }}
                >
                  {resetting ? (
                    <><span style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0A0C10", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> {resetLabel}</>
                  ) : "Reset Password →"}
                </button>
              </form>
            </>
          )}

          <p style={{ textAlign: "center", marginTop: 28, fontSize: 12, color: "var(--dim)" }}>
            <Link href="/" style={{ color: "var(--muted)", textDecoration: "none" }}>← Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
