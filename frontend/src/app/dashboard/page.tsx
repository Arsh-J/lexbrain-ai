"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { queryApi, authApi, clearToken, isLoggedIn, isSessionExpiredByInactivity, isTokenExpiredByAge, touchActivity } from "@/lib/api";
import { Aurora } from "@/components/ui/aurora";

interface HistoryItem {
  query_id: number;
  query_text: string;
  timestamp: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [query, setQuery]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [history, setHistory]     = useState<HistoryItem[]>([]);
  const [loadingHistory, setLH]   = useState(true);
  const [historyError, setHE]     = useState("");
  const [userName, setUserName]   = useState("");
  const [mounted, setMounted]     = useState(false);
  const [agentStep, setAgentStep] = useState(0);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [listening, setListening] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const recognitionRef = useRef<any>(null);
  const baseTextRef   = useRef("");
  const finalAccumRef = useRef("");
  const idleTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Inactivity timeout constants ────────────────────────────────────────
  const WARN_AFTER_MS   = 1 * 60 * 60 * 1000 + 45 * 60 * 1000; // 1h 45m
  const LOGOUT_AFTER_MS = 2 * 60 * 60 * 1000;                    // 2h

  const resetIdleTimers = useCallback(() => {
    touchActivity();
    setIdleWarning(false);
    if (warnTimerRef.current)  clearTimeout(warnTimerRef.current);
    if (idleTimerRef.current)  clearTimeout(idleTimerRef.current);
    warnTimerRef.current  = setTimeout(() => setIdleWarning(true),          WARN_AFTER_MS);
    idleTimerRef.current  = setTimeout(() => {
      clearToken();
      window.location.href = "/login?reason=idle";
    }, LOGOUT_AFTER_MS);
  }, []);

  const AGENTS = [
    "🧠 Agent 1 — Classifying legal domain...",
    "📚 Agent 2 — Retrieving IPC sections...",
    "⚖️  Agent 3 — Predicting outcomes...",
    "🛡️  Agent 4 — Advising precautions...",
    "✍️  Agent 5 — Writing case summary...",
  ];

  const fetchHistory = useCallback(async (forceRefresh = false) => {
    setLH(true);
    setHE("");
    try {
      const r = await queryApi.history(forceRefresh);
      setHistory(Array.isArray(r.data) ? r.data : []);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || "Failed to load history";
      setHE(msg);
      console.error("History fetch error:", err);
    } finally {
      setLH(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) {
      window.location.href = "/login";
      return;
    }
    // If user was inactive for 2+ hours since last activity, force logout
    if (isSessionExpiredByInactivity()) {
      clearToken();
      window.location.href = "/login?reason=idle";
      return;
    }
    // If JWT is older than 10 hours, force re-login (absolute session expiry)
    if (isTokenExpiredByAge()) {
      clearToken();
      window.location.href = "/login?reason=expired";
      return;
    }
    setMounted(true);
    fetchHistory();
    authApi.getMe()
      .then(r => {
        setUserName(r.data.name || "");
        // Show welcome toast here — after dashboard is mounted, timed correctly
        if (sessionStorage.getItem("just_logged_in")) {
          sessionStorage.removeItem("just_logged_in");
          const name = r.data.name ? `, ${r.data.name.split(" ")[0]}` : "";
          toast.success(`Welcome back${name}. Your cases are ready.`, {
            duration: 3500,
            icon: "⚖️",
          });
        }
      })
      .catch(() => { /* silent — don't disrupt the page */ });

    // Start inactivity timers
    resetIdleTimers();

    // Register interaction listeners to reset the idle clock
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"];
    events.forEach(ev => window.addEventListener(ev, resetIdleTimers, { passive: true }));

    return () => {
      events.forEach(ev => window.removeEventListener(ev, resetIdleTimers));
      if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [fetchHistory, resetIdleTimers]);

  // Cycle agent status while loading
  useEffect(() => {
    if (!loading) { setAgentStep(0); return; }
    const iv = setInterval(() => setAgentStep(s => (s + 1) % AGENTS.length), 2600);
    return () => clearInterval(iv);
  }, [loading]);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 10) { toast.error("Please describe your situation in more detail."); return; }
    setLoading(true);
    try {
      const res = await queryApi.analyze(q);
      // Navigate first so the result page is already loading, THEN show toast
      // and refresh history in background — user sees the toast on the case page
      router.push(`/case/${res.data.query_id}`);
      // 600ms: enough for Next.js to start rendering the case page before toast appears
      setTimeout(() => toast.success("Analysis complete! Opening your case..."), 600);
      fetchHistory(); // background refresh — doesn't block navigation
      // Keep loading=true so agent progress stays until unmount
    } catch (err: any) {
      const detail = err.response?.data?.detail || err.message || "Analysis failed";
      toast.error(detail);
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    toast.success("Signed out.");
    window.location.href = "/login";
  };

  const handleDeleteOne = (id: number) => {
    const removed = history.find(h => h.query_id === id);
    setHistory(prev => prev.filter(h => h.query_id !== id));
    queryApi.deleteOne(id).catch(() => {
      if (removed) setHistory(prev => [removed, ...prev]);
      toast.error("Failed to delete.");
    });
  };

  const handleDeleteAll = () => {
    const snapshot = history;
    setHistory([]);
    setConfirmClearAll(false);
    queryApi.deleteAll().catch(() => {
      setHistory(snapshot);
      toast.error("Failed to clear history.");
    });
  };

  const toggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SpeechRecognition();
    rec.lang = "en-IN";
    rec.continuous = true;
    rec.interimResults = true;
    recognitionRef.current = rec;

    // Snapshot the textarea value into a ref — stable across all async callbacks
    baseTextRef.current  = query.trim();
    finalAccumRef.current = "";

    rec.onstart = () => setListening(true);

    rec.onend = () => {
      setListening(false);
      // Commit only finalized text, drop any trailing interim preview
      const committed = [baseTextRef.current, finalAccumRef.current]
        .filter(Boolean).join(" ").trim();
      setQuery(committed);
    };

    rec.onerror = (e: any) => {
      if (e.error === "no-speech") return; // pause timeout — not a real error
      setListening(false);
      toast.error("Microphone error. Check browser permissions.");
    };

    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          // Append to ref — never stale, no closure problem
          finalAccumRef.current = (finalAccumRef.current + " " + t).trim();
        } else {
          interim += t;
        }
      }
      // Display = original text + confirmed speech + live preview
      const display = [baseTextRef.current, finalAccumRef.current, interim]
        .filter(Boolean).join(" ").trim();
      setQuery(display);
    };

    rec.start();
  };

  const examples = [
    "My landlord refuses to return ₹50,000 security deposit after 4 months of vacating",
    "Someone is blackmailing me online with private photos and demanding money",
    "My employer hasn't paid salary for the last 3 months despite repeated requests",
    "I was cheated by an online seller who took payment but never delivered the product",
    "My business partner withdrew company funds without my knowledge",
    "My neighbor is constructing a wall illegally on my property boundary",
  ];

  const firstInitial = userName ? userName[0].toUpperCase() : "?";

  if (!mounted) {
    return <div style={{ minHeight: "100vh", background: "var(--ink)" }} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ink)", fontFamily: "'Syne', system-ui, sans-serif" }}>
      <Aurora colorStops={["#1D4ED8", "#6366F1", "#060D18"]} amplitude={1.5} blend={120} speed={1.4} opacity={0.6} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 260, background: "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* ── Inactivity warning banner ─────────────────────────────────── */}
      {idleWarning && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "rgba(30,20,10,0.97)", border: "1px solid rgba(245,158,11,0.5)", borderRadius: 14, padding: "16px 24px", display: "flex", alignItems: "center", gap: 16, boxShadow: "0 8px 32px rgba(0,0,0,0.6)", maxWidth: 480, width: "calc(100% - 40px)" }}>
          <span style={{ fontSize: 22 }}>⏳</span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--amber)" }}>Session expiring soon</p>
            <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--dim)", lineHeight: 1.5 }}>You&apos;ll be signed out in ~15 minutes due to inactivity. Move your mouse or press a key to stay signed in.</p>
          </div>
          <button onClick={resetIdleTimers} style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "var(--amber)", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}>Stay signed in</button>
        </div>
      )}

      {/* NAV */}
      <nav style={{ position: "sticky", top: 0, zIndex: 50, borderBottom: "1px solid var(--border)", backdropFilter: "blur(20px)", background: "rgba(10,12,16,0.92)", padding: "0 6%" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 62 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <span style={{ fontSize: 18, filter: "drop-shadow(0 0 5px rgba(59,130,246,0.4))" }}>⚖️</span>
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900, fontSize: 17, color: "var(--bright)" }}>LexBrain AI</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {userName && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "var(--amber)" }}>{firstInitial}</div>
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{userName.split(" ")[0]}</span>
              </div>
            )}
            <button onClick={handleLogout}
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", color: "var(--dim)", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.2s" }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "#E05252"; b.style.borderColor = "rgba(224,82,82,0.3)"; }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.color = "var(--dim)"; b.style.borderColor = "var(--border)"; }}>
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "44px 6% 100px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 28, alignItems: "start" }}>

          {/* MAIN COLUMN */}
          <div>
            <div style={{ marginBottom: 36 }}>
              <div style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", marginBottom: 8 }}>CASE ROOM</div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px,3.5vw,40px)", fontWeight: 900, color: "var(--bright)", letterSpacing: "-0.5px" }}>
                Open a New Investigation
              </h1>
            </div>

            {/* Query card */}
            <div style={{ background: "var(--slate)", border: "1px solid var(--border)", borderRadius: 16, padding: "26px", marginBottom: 22, transition: "border-color 0.3s" }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.22)"}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"}>
              <form onSubmit={handleAnalyze}>
                <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "var(--muted)", marginBottom: 12, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                  Describe Your Legal Situation
                </label>
                <div style={{ position: "relative" }}>
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  rows={5} disabled={loading}
                  className="field"
                  style={{ width: "100%", resize: "vertical", lineHeight: 1.7, minHeight: 120, paddingRight: 48 }}
                  placeholder="e.g., My landlord is not returning my ₹50,000 security deposit even after 4 months of vacating. What legal action can I take?"
                />
                <button
                  type="button"
                  onClick={toggleVoice}
                  disabled={loading}
                  title={listening ? "Stop recording" : "Speak your case"}
                  style={{
                    position: "absolute", top: 10, right: 10,
                    width: 34, height: 34, borderRadius: "50%",
                    border: listening ? "1.5px solid rgba(239,68,68,0.7)" : "1px solid rgba(59,130,246,0.25)",
                    background: listening ? "rgba(239,68,68,0.15)" : "rgba(59,130,246,0.08)",
                    color: listening ? "#F87171" : "var(--amber)",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s",
                    boxShadow: listening ? "0 0 12px rgba(239,68,68,0.3)" : "0 0 6px rgba(59,130,246,0.12)",
                    animation: listening ? "micPulse 1.4s ease-in-out infinite" : "none",
                  }}
                  onMouseEnter={e => { if (!listening && !loading) { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(59,130,246,0.18)"; b.style.borderColor = "rgba(59,130,246,0.5)"; b.style.boxShadow = "0 0 12px rgba(59,130,246,0.25)"; }}}
                  onMouseLeave={e => { if (!listening) { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(59,130,246,0.08)"; b.style.borderColor = "rgba(59,130,246,0.25)"; b.style.boxShadow = "0 0 6px rgba(59,130,246,0.12)"; }}}>
                  {listening ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="4" y="4" width="6" height="16" rx="1"/>
                      <rect x="14" y="4" width="6" height="16" rx="1"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3"/>
                      <path d="M19 10a7 7 0 0 1-14 0"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                      <line x1="9" y1="22" x2="15" y2="22"/>
                    </svg>
                  )}
                </button>
                {listening && (
                  <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", gap: 3, alignItems: "flex-end", height: 16 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: 3, borderRadius: 2, background: "#F87171", animation: `voiceBar 0.8s ease-in-out ${i * 0.18}s infinite alternate`, height: `${8 + i * 4}px` }} />
                    ))}
                  </div>
                )}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                  <span style={{ fontSize: 11, color: query.length < 10 && query.length > 0 ? "#E05252" : "var(--dim)" }}>
                    {query.length} chars {query.length < 10 && query.length > 0 ? "— add more detail" : ""}
                  </span>
                  <button type="submit" disabled={loading || query.trim().length < 10}
                    className="btn-amber"
                    style={{ fontSize: 13, padding: "10px 22px", opacity: loading || query.trim().length < 10 ? 0.5 : 1, cursor: loading || query.trim().length < 10 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                    {loading
                      ? <><span style={{ width: 12, height: 12, border: "2px solid rgba(0,0,0,0.3)", borderTopColor: "#0A0C10", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} /> Analyzing...</>
                      : "Analyze Case →"}
                  </button>
                </div>
              </form>
            </div>

            {/* Agent progress */}
            {loading && (
              <div style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 14, padding: "18px 22px", marginBottom: 22 }}>
                <div style={{ display: "flex", gap: 5, marginBottom: 12 }}>
                  {AGENTS.map((_, i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < agentStep ? "var(--amber)" : i === agentStep ? "rgba(59,130,246,0.5)" : "rgba(255,255,255,0.07)", transition: "background 0.5s" }} />
                  ))}
                </div>
                <p style={{ fontSize: 13, color: "var(--amber)", fontWeight: 600, margin: 0 }}>{AGENTS[agentStep]}</p>
              </div>
            )}

            {/* Examples */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", marginBottom: 12, letterSpacing: "1.5px", textTransform: "uppercase" }}>📋 Try These Examples</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {examples.map((ex, i) => (
                  <button key={i} onClick={() => setQuery(ex)}
                    style={{ background: "rgba(255,255,255,0.018)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 16px", color: "var(--muted)", fontSize: 13, cursor: "pointer", textAlign: "left", fontFamily: "'Syne', sans-serif", lineHeight: 1.5, transition: "all 0.2s" }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(59,130,246,0.3)"; b.style.color = "var(--text)"; b.style.background = "rgba(59,130,246,0.03)"; }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--muted)"; b.style.background = "rgba(255,255,255,0.018)"; }}>
                    <span style={{ color: "var(--amber)", marginRight: 8 }}>→</span>{ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SIDEBAR — History */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--slate)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px", position: "sticky", top: 80 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: "var(--bright)", margin: 0 }}>📁 Case History</h2>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {history.length > 0 && (
                    <span style={{ fontSize: 10, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "var(--amber)", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>
                      {history.length}
                    </span>
                  )}
                  <button onClick={() => fetchHistory(true)} title="Refresh history"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, color: "var(--dim)", fontSize: 12, padding: "3px 8px", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.3)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"}>
                    ↻
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--dim)", fontSize: 13 }}>
                  Loading cases...
                </div>
              ) : historyError ? (
                <div style={{ padding: "16px", background: "rgba(224,82,82,0.06)", border: "1px solid rgba(224,82,82,0.2)", borderRadius: 10 }}>
                  <p style={{ fontSize: 12, color: "#E05252", margin: "0 0 8px" }}>⚠ Could not load history</p>
                  <p style={{ fontSize: 11, color: "var(--dim)", margin: "0 0 10px" }}>{historyError}</p>
                  <button onClick={() => fetchHistory(true)} style={{ fontSize: 11, color: "var(--amber)", background: "none", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>
                    Retry
                  </button>
                </div>
              ) : history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 16px" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>🗂️</div>
                  <p style={{ color: "var(--dim)", fontSize: 13, lineHeight: 1.5 }}>No cases yet.<br />Submit your first query.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 480, overflowY: "auto" }}>
                  {history.map(item => (
                    <div key={item.query_id} style={{ position: "relative" }}>
                      <Link href={`/case/${item.query_id}`}
                        style={{ display: "block", background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 36px 12px 14px", textDecoration: "none", transition: "all 0.2s" }}
                        onMouseEnter={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = "rgba(59,130,246,0.3)"; a.style.background = "rgba(59,130,246,0.03)"; }}
                        onMouseLeave={e => { const a = e.currentTarget as HTMLAnchorElement; a.style.borderColor = "var(--border)"; a.style.background = "rgba(255,255,255,0.02)"; }}>
                        <p style={{ margin: "0 0 5px", fontSize: 12, color: "var(--text)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {item.query_text}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--dim)" }}>
                          {new Date(item.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </Link>
                      <button
                        onClick={() => handleDeleteOne(item.query_id)}
                        title="Remove this case"
                        style={{ position: "absolute", top: 8, right: 8, background: "rgba(224,82,82,0.07)", border: "1px solid rgba(224,82,82,0.15)", color: "#FCA5A5", borderRadius: 5, width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, cursor: "pointer", padding: 0, transition: "all 0.2s", fontFamily: "'Syne', sans-serif" }}
                        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(224,82,82,0.2)"; b.style.borderColor = "rgba(224,82,82,0.4)"; }}
                        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(224,82,82,0.07)"; b.style.borderColor = "rgba(224,82,82,0.15)"; }}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ background: "rgba(59,130,246,0.04)", border: "1px solid rgba(59,130,246,0.12)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ fontSize: 11, color: "var(--dim)", lineHeight: 1.65, margin: 0 }}>
                ⚠️ <strong style={{ color: "var(--amber)" }}>Disclaimer:</strong> For informational purposes only. Not legal advice. Consult a qualified advocate for serious matters.
              </p>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes micPulse{0%,100%{box-shadow:0 0 6px rgba(239,68,68,0.3)}50%{box-shadow:0 0 16px rgba(239,68,68,0.55)}} @keyframes voiceBar{from{transform:scaleY(0.4)}to{transform:scaleY(1.1)}}`}</style>
    </div>
  );
}
