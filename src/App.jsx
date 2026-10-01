import { useState, useMemo, useCallback } from "react";
import {
  classSeverity, storageOf, daysSince, stripHtml,
  score, grade, remediation, compliance,
} from "./analysis.js";
import { downloadReport, printReport } from "./report.js";

// ══════════════════════════════════════════════════════════════
// CredShield v2 — real data.
// Every breach record shown comes from the Have I Been Pwned API
// via this app's own serverless endpoints. Scoring, remediation and
// regulatory mapping are derived from those records.
// ══════════════════════════════════════════════════════════════

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

.cs{
  --ink-900:#080B12;--ink-800:#0C111A;--ink-700:#111825;--ink-600:#18222F;
  --line:#1D2836;--line-hi:#2B3B4E;--text:#DDE5F0;--dim:#8496AE;--mute:#4C5C73;
  --s1:#FF4D3D;--s2:#FF8A3D;--s3:#FFC53D;--s4:#3DD9A4;
  --brand:#7C5CFF;--brand-soft:#7C5CFF1F;--brand-line:#7C5CFF4D;
  background:var(--ink-900);color:var(--text);
  font-family:'IBM Plex Sans',system-ui,sans-serif;font-size:14px;line-height:1.55;
  min-height:100vh;-webkit-font-smoothing:antialiased;
}
.cs *,.cs *::before,.cs *::after{box-sizing:border-box}
.cs h1,.cs h2,.cs h3{font-family:'Space Grotesk',sans-serif;margin:0;letter-spacing:-.02em}
.cs button,.cs input{font-family:inherit;font-size:inherit}
.cs a{color:#B7A4FF}
.cs :focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:3px}
@media (prefers-reduced-motion:reduce){.cs *{animation:none!important;transition:none!important}}

.cs .mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}
.cs .t-xs{font-size:12px}.cs .t-sm{font-size:13px}.cs .t-md{font-size:16px}.cs .t-lg{font-size:20px}
.cs .dim{color:var(--dim)}.cs .mute{color:var(--mute)}
.cs .wrap{max-width:1060px;margin:0 auto;padding:24px 22px 60px}
.cs .row{display:flex;align-items:center;gap:12px}
.cs .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.cs .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}

.cs .panel{background:var(--ink-800);border:1px solid var(--line);border-radius:14px;padding:18px 20px}
.cs .sunk{background:var(--ink-900);border-radius:10px;padding:12px 14px}
.cs .hero{background:radial-gradient(120% 140% at 88% -10%,#7C5CFF1A 0%,transparent 55%),
  linear-gradient(168deg,var(--ink-700),var(--ink-800));
  border:1px solid var(--line-hi);border-radius:22px;padding:36px 34px}

.cs .sev{border-left-width:4px;border-left-style:solid}
.cs .sev-critical{border-left-color:var(--s1)}
.cs .sev-high{border-left-color:var(--s2)}
.cs .sev-medium{border-left-color:var(--s3);border-left-style:dashed}
.cs .sev-low{border-left-color:var(--s4);border-left-style:dotted}
.cs .glyph{font-family:'IBM Plex Mono',monospace;letter-spacing:-1px;font-size:12px}

.cs .chip{display:inline-flex;align-items:center;gap:5px;border-radius:4px;font-size:12px;
  font-weight:600;padding:3px 8px;border:1px solid;white-space:nowrap;line-height:1.3}
.cs .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;border-radius:9px;
  padding:11px 20px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid transparent;line-height:1}
.cs .btn:disabled{opacity:.5;cursor:not-allowed}
.cs .btn-p{background:var(--brand);color:#fff}
.cs .btn-g{background:transparent;border-color:var(--line-hi);color:var(--text)}
.cs .field{width:100%;background:var(--ink-900);border:1px solid var(--line-hi);border-radius:9px;
  padding:12px 14px;color:var(--text);outline:none}
.cs .field:focus{border-color:var(--brand)}

.cs .tabs{display:flex;gap:3;background:var(--ink-800);padding:4px;border-radius:12px;
  border:1px solid var(--line);margin-bottom:18px;overflow-x:auto}
.cs .tab{flex:1;min-width:120px;background:transparent;border:1px solid transparent;border-radius:9px;
  padding:10px;font-size:13px;font-weight:600;color:var(--dim);cursor:pointer;white-space:nowrap}
.cs .tab[aria-selected="true"]{background:var(--ink-600);border-color:var(--line-hi);color:#B7A4FF}

.cs .spine{position:relative;height:20px;display:flex;align-items:center}
.cs .spine-t{position:absolute;left:0;right:0;height:2px;background:var(--line-hi);border-radius:2px}
.cs .spine-f{position:absolute;left:0;height:2px;border-radius:2px}
.cs .spine-d{position:absolute;width:9px;height:9px;border-radius:50%;border:2px solid var(--ink-800);top:5.5px}

@media (max-width:860px){
  .cs .g2{grid-template-columns:1fr}
  .cs .g4{grid-template-columns:1fr 1fr}
  .cs .hero{padding:26px 20px;border-radius:16px}
  .cs .wrap{padding:18px 14px 50px}
  .cs .stack-sm{flex-direction:column;align-items:stretch}
  .cs .full-sm{width:100%}
}
@media (max-width:420px){.cs .g4{grid-template-columns:1fr}}
`;

const SEV = {
  Critical: { v: "s1", g: "████" }, High: { v: "s2", g: "███" },
  Medium: { v: "s3", g: "██" }, Low: { v: "s4", g: "█" },
};
const tone = s => `var(--${SEV[s]?.v || "s4"})`;
const sevOf = n => n >= 5 ? "Critical" : n >= 4 ? "High" : n >= 3 ? "Medium" : "Low";
const fmt = n => n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}k` : String(n);

const WINDOWS = [
  { id: "all", label: "All time",       days: Infinity },
  { id: "5y",  label: "Last 5 years",   days: 1825 },
  { id: "3y",  label: "Last 3 years",   days: 1095 },
  { id: "1y",  label: "Last 12 months", days: 365 },
];
const RECENT_DAYS = 730;

const Chip = ({ children, c = "var(--dim)" }) => (
  <span className="chip" style={{ color: c, borderColor: c + "4D", background: c + "14" }}>{children}</span>
);
const SevChip = ({ level }) => (
  <span className="chip" style={{ color: tone(level), borderColor: tone(level), background: tone(level) + "14" }}>
    <span className="glyph" aria-hidden="true">{SEV[level].g}</span>{level}
  </span>
);
const Meter = ({ v, c, h = 5 }) => (
  <div style={{ width: "100%", height: h, background: "var(--line)", borderRadius: h }}>
    <div style={{ width: `${Math.min(v, 100)}%`, height: "100%", background: c, borderRadius: h, transition: "width .7s" }} />
  </div>
);

function Spine({ days, max = 4000, c }) {
  const pct = Math.min(100, (days / max) * 100);
  return (
    <div className="spine">
      <div className="spine-t" />
      <div className="spine-f" style={{ width: `${pct}%`, background: c }} />
      <div className="spine-d" style={{ left: `calc(${pct}% - 4.5px)`, background: c }} />
    </div>
  );
}

function Dial({ s, size = 112 }) {
  const g = grade(s), c = tone(g.sev), N = 30;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} role="img" aria-label={`Risk ${s} of 100, ${g.label}`}>
        {Array.from({ length: N }, (_, i) => {
          const a = (i / N) * 2 * Math.PI - Math.PI / 2;
          const on = i < Math.round(s / 100 * N);
          const R1 = size / 2 - 16, R2 = size / 2 - 5;
          return <line key={i}
            x1={size / 2 + Math.cos(a) * R1} y1={size / 2 + Math.sin(a) * R1}
            x2={size / 2 + Math.cos(a) * R2} y2={size / 2 + Math.sin(a) * R2}
            stroke={on ? c : "var(--line-hi)"} strokeWidth={on ? 3 : 2} strokeLinecap="round" />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="mono" style={{ fontSize: 30, fontWeight: 700, color: c, lineHeight: 1 }}>{s}</span>
        <span className="t-xs dim" style={{ marginTop: 3 }}>{g.label}</span>
      </div>
    </div>
  );
}

// ─── breach record card ──────────────────────────────────────
function BreachCard({ b, open, onToggle }) {
  const classes = b.DataClasses || [];
  const worst = Math.max(...classes.map(classSeverity), 1);
  const lvl = sevOf(worst);
  const c = tone(lvl);
  const store = storageOf(b);
  const age = daysSince(b.BreachDate);

  return (
    <div className={`panel sev sev-${lvl.toLowerCase()}`} style={{ padding: 0, marginBottom: 9, overflow: "hidden" }}>
      <button onClick={onToggle} aria-expanded={open}
        style={{ width: "100%", background: "transparent", border: "none", padding: "14px 16px", cursor: "pointer", textAlign: "left", color: "inherit" }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
              <span className="t-md" style={{ fontWeight: 600 }}>{b.Title}</span>
              {age <= RECENT_DAYS && <Chip c="var(--s1)">Recent</Chip>}
              {b.IsStealerLog && <Chip c="var(--s1)">Infostealer</Chip>}
              {b.IsSensitive && <Chip c="var(--s2)">Sensitive</Chip>}
              {!b.IsVerified && <Chip c="var(--s3)">Unverified</Chip>}
              {b.IsSpamList && <Chip c="var(--dim)">Spam list</Chip>}
            </div>
            <div className="t-xs dim" style={{ marginBottom: 8 }}>
              Breached {new Date(b.BreachDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
              {" · "}{fmt(b.PwnCount)} accounts{" · "}{classes.length} data classes
            </div>
            <Spine days={age} c={c} />
            <div className="t-xs mute mono" style={{ marginTop: 3 }}>in circulation {age.toLocaleString()} days</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <SevChip level={lvl} />
            <div className="t-xs" style={{ color: c, marginTop: 6 }}>{open ? "Hide" : "Detail"}</div>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--line)" }}>
          <p className="t-sm dim" style={{ margin: "13px 0" }}>{stripHtml(b.Description)}</p>

          <div className="g2" style={{ gap: 16 }}>
            <div>
              <div className="t-xs dim" style={{ marginBottom: 8, fontWeight: 600 }}>DATA EXPOSED</div>
              {classes.slice().sort((a, z) => classSeverity(z) - classSeverity(a)).map(cl => {
                const l = sevOf(classSeverity(cl));
                return (
                  <div key={cl} className="row sunk" style={{ gap: 9, padding: "7px 10px", marginBottom: 5 }}>
                    <span className="glyph" style={{ color: tone(l) }} aria-hidden="true">{SEV[l].g}</span>
                    <span className="t-xs" style={{ flex: 1 }}>{cl}</span>
                    <span className="t-xs" style={{ color: tone(l) }}>{l}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="t-xs dim" style={{ marginBottom: 8, fontWeight: 600 }}>RECORD DETAIL</div>
              {[
                ["Breach name", b.Name],
                ["Affected domain", b.Domain || "not attributed"],
                ["Accounts", b.PwnCount.toLocaleString()],
                ["Breach date", b.BreachDate],
                ["Added to index", (b.AddedDate || "").slice(0, 10)],
                ["Days in circulation", age.toLocaleString()],
                ...(store ? [["Password storage", store.algo], ["Time to crack", store.crack]] : []),
                ["Verified by HIBP", b.IsVerified ? "Yes" : "No"],
              ].map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--line)", gap: 10 }}>
                  <span className="t-xs dim">{k}</span>
                  <span className="t-xs mono" style={{ textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="t-xs mute" style={{ marginTop: 12 }}>
            Source: <a href={`https://haveibeenpwned.com/PwnedWebsites#${b.Name}`} target="_blank" rel="noopener noreferrer">Have I Been Pwned</a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── remediation ─────────────────────────────────────────────
function Remediation({ tasks }) {
  const [done, setDone] = useState({});
  const n = Object.values(done).filter(Boolean).length;
  const pct = tasks.length ? Math.round((n / tasks.length) * 100) : 0;
  const groups = ["P0", "P1", "P2"].map(p => ({ p, items: tasks.filter(t => t.priority === p) })).filter(g => g.items.length);
  const legend = { P0: "Today — exploitation is possible now", P1: "This week — closes the weakness", P2: "This month — reduces recurrence" };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="row stack-sm" style={{ justifyContent: "space-between", marginBottom: 12, gap: 10 }}>
          <div>
            <h3 className="t-md">Remediation plan</h3>
            <p className="t-xs dim" style={{ margin: "3px 0 0" }}>
              {tasks.length} actions, derived from the data classes actually exposed
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: pct === 100 ? "var(--s4)" : "var(--brand)" }}>{pct}%</div>
            <div className="t-xs dim">{n} of {tasks.length}</div>
          </div>
        </div>
        <Meter v={pct} c={pct === 100 ? "var(--s4)" : "var(--brand)"} h={6} />
      </div>

      {groups.map(g => (
        <div key={g.p} style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <span className="chip mono" style={{ color: tone(g.items[0].sev), borderColor: tone(g.items[0].sev), background: tone(g.items[0].sev) + "16", fontWeight: 700 }}>{g.p}</span>
            <span className="t-sm dim">{legend[g.p]}</span>
          </div>
          {g.items.map(t => (
            <div key={t.id} className={`panel sev sev-${t.sev.toLowerCase()}`} style={{ marginBottom: 9 }}>
              <div className="row" style={{ gap: 13, alignItems: "flex-start" }}>
                <button onClick={() => setDone(d => ({ ...d, [t.id]: !d[t.id] }))}
                  aria-pressed={!!done[t.id]} aria-label={`Mark ${t.title} done`}
                  style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 2, cursor: "pointer", padding: 0,
                    border: `1.5px solid ${done[t.id] ? "var(--s4)" : "var(--line-hi)"}`,
                    background: done[t.id] ? "var(--s4)" : "transparent",
                    color: "#06120D", fontWeight: 800,
                  }}>{done[t.id] ? "✓" : ""}</button>
                <div style={{ flex: 1, minWidth: 0, opacity: done[t.id] ? .45 : 1 }}>
                  <h3 className="t-sm" style={{ marginBottom: 7, textDecoration: done[t.id] ? "line-through" : "none" }}>{t.title}</h3>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                    <Chip c={tone(t.sev)}>{t.window}</Chip>
                    <Chip>{t.owner}</Chip>
                    <Chip c="var(--mute)">{t.id}</Chip>
                  </div>
                  <p className="t-sm dim" style={{ margin: "0 0 10px" }}>{t.why}</p>
                  <ol className="sunk" style={{ margin: 0, paddingLeft: 30, listStyle: "none" }}>
                    {t.steps.map((s, i) => (
                      <li key={i} style={{ position: "relative", marginBottom: i === t.steps.length - 1 ? 0 : 7 }}>
                        <span className="mono t-xs" style={{ position: "absolute", left: -21, top: 1, color: tone(t.sev) }}>{String(i + 1).padStart(2, "0")}</span>
                        <span className="t-sm">{s}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── compliance ──────────────────────────────────────────────
function Compliance({ items }) {
  if (!items.length) return (
    <div className="panel" style={{ textAlign: "center", padding: "36px" }}>
      <h3 className="t-sm">No obligations triggered</h3>
      <p className="t-sm dim" style={{ margin: "5px 0 0" }}>No findings met the thresholds mapped here.</p>
    </div>
  );
  const byFw = items.reduce((m, i) => { (m[i.framework] ||= []).push(i); return m; }, {});
  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3 className="t-md" style={{ marginBottom: 5 }}>Regulatory clocks</h3>
        <p className="t-sm dim" style={{ margin: 0 }}>
          {items.length} obligation{items.length === 1 ? "" : "s"} across {Object.keys(byFw).length} frameworks,
          triggered by what was actually exposed. A starting point for assessment, not legal advice.
        </p>
      </div>
      {Object.entries(byFw).map(([fw, list]) => (
        <div key={fw} style={{ marginBottom: 18 }}>
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <h3 className="t-sm">{fw}</h3>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          {list.map(c => (
            <div key={c.ref + c.title} className={`panel sev sev-${c.sev.toLowerCase()}`} style={{ marginBottom: 9 }}>
              <h3 className="t-sm" style={{ marginBottom: 6 }}>{c.title}</h3>
              <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                <Chip c={tone(c.sev)}>{c.clock}</Chip>
                <Chip>{c.ref}</Chip>
              </div>
              <p className="t-sm dim" style={{ margin: "0 0 10px" }}>{c.detail}</p>
              <div className="sunk">
                <span className="t-xs" style={{ color: tone(c.sev), fontWeight: 700 }}>EVIDENCE TO RETAIN · </span>
                <span className="t-xs">{c.evidence}</span>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── report export ───────────────────────────────────────────
function ReportBar({ subject, kind, breaches, tasks, compliance, windowLabel, excluded }) {
  const [open, setOpen] = useState(false);
  const [meta, setMeta] = useState({ client: "", engagement: "", tester: "Bolaji Uthman Edu" });
  const [warn, setWarn] = useState("");
  const payload = { subject, kind, breaches, tasks, compliance, meta: { ...meta, windowLabel, excluded } };

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <div className="row stack-sm" style={{ gap: 10, flexWrap: "wrap" }}>
        <button className="btn btn-p" onClick={() => downloadReport(payload)}>↓ Download report</button>
        <button className="btn btn-g" onClick={() => setWarn(printReport(payload) ? "" : "Pop-up blocked — download the report, then print that file to PDF.")}>
          Save as PDF
        </button>
        <button className="btn btn-g" onClick={() => setOpen(!open)}>
          {open ? "Hide client details" : "Add client details"}
        </button>
      </div>
      {warn && <p className="t-xs" style={{ color: "var(--s3)", margin: "10px 0 0" }}>{warn}</p>}

      {open && (
        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          <p className="t-xs mute" style={{ margin: 0 }}>
            Optional. These appear on the report cover page.
          </p>
          {[["client", "Client name"], ["engagement", "Engagement reference"], ["tester", "Assessed by"]].map(([k, label]) => (
            <div key={k}>
              <label className="t-xs dim" htmlFor={`m-${k}`} style={{ display: "block", marginBottom: 4 }}>{label}</label>
              <input id={`m-${k}`} className="field" value={meta[k]}
                onChange={e => setMeta(m => ({ ...m, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
      )}

      <p className="t-xs mute" style={{ margin: "12px 0 0", maxWidth: 620 }}>
        The report is framed as a passive OSINT assessment, not a penetration test. It states plainly
        that no client system was accessed.
      </p>
    </div>
  );
}

// ─── results ─────────────────────────────────────────────────
function Results({ subject, kind, breaches: all }) {
  const [tab, setTab] = useState("overview");
  const [open, setOpen] = useState(null);
  const [win, setWin] = useState("all");

  const windowDays = WINDOWS.find(w => w.id === win).days;
  const breaches = useMemo(
    () => all.filter(b => daysSince(b.BreachDate) <= windowDays),
    [all, windowDays]
  );
  const hidden = all.length - breaches.length;

  const s = useMemo(() => score(breaches), [breaches]);
  const g = grade(s);
  const tasks = useMemo(() => remediation(breaches), [breaches]);
  const comp = useMemo(() => compliance(breaches), [breaches]);
  const classes = useMemo(() => {
    const m = new Map();
    breaches.forEach(b => (b.DataClasses || []).forEach(c => m.set(c, (m.get(c) || 0) + 1)));
    return [...m.entries()].sort((a, z) => classSeverity(z[0]) - classSeverity(a[0]) || z[1] - a[1]);
  }, [breaches]);

  const WindowPicker = () => (
    <div className="row" style={{ gap: 7, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
      <span className="t-xs mute">Findings from:</span>
      {WINDOWS.map(w => (
        <button key={w.id} onClick={() => setWin(w.id)} aria-pressed={win === w.id}
          className="chip" style={{
            cursor: "pointer",
            color: win === w.id ? "#B7A4FF" : "var(--dim)",
            borderColor: win === w.id ? "var(--brand)" : "var(--line-hi)",
            background: win === w.id ? "var(--brand-soft)" : "transparent",
          }}>{w.label}</button>
      ))}
      {hidden > 0 && (
        <span className="t-xs mute">
          {hidden} older finding{hidden === 1 ? "" : "s"} excluded
        </span>
      )}
    </div>
  );

  if (!all.length) return (
    <div className="panel" style={{ textAlign: "center", padding: "44px 26px", borderColor: "var(--s4)55" }}>
      <h3 className="t-md" style={{ color: "var(--s4)" }}>No breaches found</h3>
      <p className="t-sm dim" style={{ margin: "8px auto 0", maxWidth: 440 }}>
        Nothing recorded for <span className="mono">{subject}</span> in the Have I Been Pwned index.
        That is a good sign, though it only covers breaches that have been publicly catalogued.
      </p>
    </div>
  );

  if (!breaches.length) return (
    <div>
      <WindowPicker />
      <div className="panel" style={{ textAlign: "center", padding: "40px 26px" }}>
        <h3 className="t-md">Nothing in this window</h3>
        <p className="t-sm dim" style={{ margin: "8px auto 0", maxWidth: 440 }}>
          All {all.length} finding{all.length === 1 ? "" : "s"} for <span className="mono">{subject}</span> predate
          this period. Widen the window to see them.
        </p>
      </div>
    </div>
  );

  const oldest = Math.max(...breaches.map(b => daysSince(b.BreachDate)));
  const totalAccounts = breaches.reduce((a, b) => a + (b.PwnCount || 0), 0);
  const withPw = breaches.filter(b => (b.DataClasses || []).includes("Passwords")).length;
  const stealers = breaches.filter(b => b.IsStealerLog).length;

  return (
    <div>
      <WindowPicker />
      <div className="panel" style={{ marginBottom: 16, borderColor: tone(g.sev) + "55" }}>
        <div className="row stack-sm" style={{ gap: 22, alignItems: "center" }}>
          <Dial s={s} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
              <span className="mono t-md" style={{ fontWeight: 600, wordBreak: "break-all" }}>{subject}</span>
              <Chip c="var(--brand)">{kind}</Chip>
              <SevChip level={g.sev} />
            </div>
            <p className="t-sm dim" style={{ margin: "0 0 12px" }}>
              {breaches.length} breach{breaches.length === 1 ? "" : "es"} on record.
              Recommended: <strong style={{ color: tone(g.sev) }}>{g.action}</strong>.
            </p>
            <div className="sunk" style={{ marginBottom: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span className="t-xs dim">Oldest finding, time in circulation</span>
                <span className="t-sm mono" style={{ color: tone(g.sev), fontWeight: 600 }}>{oldest.toLocaleString()} days</span>
              </div>
              <Spine days={oldest} c={tone(g.sev)} />
            </div>
            <div className="g4">
              {[
                { n: breaches.length, l: "Breaches", c: "var(--brand)" },
                { n: withPw, l: "With passwords", c: "var(--s1)" },
                { n: stealers, l: "Infostealer logs", c: "var(--s2)" },
                { n: fmt(totalAccounts), l: "Accounts affected", c: "var(--s3)" },
              ].map(x => (
                <div key={x.l} className="sunk" style={{ textAlign: "center" }}>
                  <div className="mono" style={{ fontSize: 21, fontWeight: 700, color: x.c }}>{x.n}</div>
                  <div className="t-xs dim" style={{ marginTop: 2 }}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ReportBar subject={subject} kind={kind} breaches={breaches} tasks={tasks} compliance={comp}
        windowLabel={WINDOWS.find(w => w.id === win).label} excluded={hidden} />

      <div className="tabs" role="tablist">
        {[["overview", "What was exposed"], ["records", `Breaches (${breaches.length})`],
          ["fix", `Remediation (${tasks.length})`], ["reg", `Compliance (${comp.length})`]].map(([id, l]) => (
          <button key={id} role="tab" aria-selected={tab === id} className="tab" onClick={() => setTab(id)}>{l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="panel">
          <h3 className="t-sm" style={{ marginBottom: 3 }}>Data classes exposed</h3>
          <p className="t-xs dim" style={{ margin: "0 0 14px" }}>Across all breaches, most damaging first</p>
          {classes.map(([cl, n]) => {
            const l = sevOf(classSeverity(cl));
            return (
              <div key={cl} style={{ marginBottom: 11 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                  <span className="row t-xs" style={{ gap: 7 }}>
                    <span className="glyph" style={{ color: tone(l) }} aria-hidden="true">{SEV[l].g}</span>{cl}
                  </span>
                  <span className="t-xs mono" style={{ color: tone(l) }}>{n}×</span>
                </div>
                <Meter v={(n / breaches.length) * 100} c={tone(l)} h={3} />
              </div>
            );
          })}
        </div>
      )}
      {tab === "records" && breaches
        .slice().sort((a, b) => new Date(b.BreachDate) - new Date(a.BreachDate))
        .map(b => <BreachCard key={b.Name} b={b} open={open === b.Name} onToggle={() => setOpen(open === b.Name ? null : b.Name)} />)}
      {tab === "fix" && <Remediation tasks={tasks} />}
      {tab === "reg" && <Compliance items={comp} />}
    </div>
  );
}

// ─── app ─────────────────────────────────────────────────────
export default function App() {
  const [mode, setMode] = useState("domain");
  const [q, setQ] = useState("");
  const [pw, setPw] = useState("");
  const [state, setState] = useState({ status: "idle" });

  const run = useCallback(async () => {
    const v = q.trim();
    if (!v) return;
    setState({ status: "loading" });
    try {
      const path = mode === "domain"
        ? `/api/domain-breaches?domain=${encodeURIComponent(v.replace(/^@/, ""))}`
        : `/api/account-breaches?account=${encodeURIComponent(v)}`;
      const r = await fetch(path);
      const j = await r.json();
      if (!r.ok) return setState({ status: "error", message: j.message || j.error || "Lookup failed." });
      setState({ status: "done", subject: j.domain || j.account, breaches: j.breaches || [] });
    } catch {
      setState({ status: "error", message: "Network error. Try again." });
    }
  }, [q, mode]);

  const checkPw = useCallback(async () => {
    if (!pw) return;
    setState({ status: "loading" });
    try {
      const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(pw));
      const hash = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
      const r = await fetch(`/api/password-check?prefix=${hash.slice(0, 5)}`);
      const j = await r.json();
      if (!r.ok) return setState({ status: "error", message: j.error || "Lookup failed." });
      const suffix = hash.slice(5);
      const hit = j.suffixes.split("\n").find(line => line.split(":")[0].trim() === suffix);
      setState({ status: "pw", count: hit ? parseInt(hit.split(":")[1], 10) : 0 });
      setPw("");
    } catch {
      setState({ status: "error", message: "Could not check that password." });
    }
  }, [pw]);

  return (
    <div className="cs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">

        <div className="hero" style={{ marginBottom: 20 }}>
          <div className="t-xs" style={{ color: "#B7A4FF", fontWeight: 600, marginBottom: 14, letterSpacing: ".1em" }}>
            CREDSHIELD · BY ULTENTERPRISE
          </div>
          <h1 style={{ fontSize: "clamp(26px,5vw,42px)", lineHeight: 1.1, maxWidth: "18ch", marginBottom: 14 }}>
            How long has it been out there?
          </h1>
          <p className="dim" style={{ fontSize: 15, maxWidth: 560, margin: 0 }}>
            Check a company domain, an email address or a password against the public breach
            record. Every finding comes back with how long it has been circulating, what it means,
            and what to do about it.
          </p>
        </div>

        <div className="tabs" role="tablist">
          {[["domain", "Company domain"], ["email", "Email address"], ["password", "Password"]].map(([id, l]) => (
            <button key={id} role="tab" aria-selected={mode === id} className="tab"
              onClick={() => { setMode(id); setState({ status: "idle" }); }}>{l}</button>
          ))}
        </div>

        {mode !== "password" ? (
          <div style={{ marginBottom: 20 }}>
            <div className="row stack-sm" style={{ gap: 10 }}>
              <label htmlFor="q" style={{ position: "absolute", left: -9999 }}>
                {mode === "domain" ? "Company domain" : "Email address"}
              </label>
              <input id="q" className="field mono full-sm" value={q} onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()}
                placeholder={mode === "domain" ? "acme.com" : "name@company.com"} style={{ flex: 1 }} />
              <button className="btn btn-p full-sm" onClick={run} disabled={state.status === "loading"}>
                {state.status === "loading" ? "Checking…" : "Check"}
              </button>
            </div>
            <p className="t-xs mute" style={{ margin: "10px 0 0" }}>
              {mode === "domain"
                ? "Returns breaches recorded against that company. Free, no key required."
                : "Returns breaches this individual account appears in. Requires an HIBP API key on the server."}
            </p>
            {mode === "domain" && (
              <div className="row" style={{ gap: 7, marginTop: 10, flexWrap: "wrap" }}>
                <span className="t-xs mute">Try:</span>
                {["adobe.com", "linkedin.com", "dropbox.com", "canva.com"].map(d => (
                  <button key={d} className="chip mono" onClick={() => { setQ(d); setTimeout(run, 0); }}
                    style={{ color: "var(--dim)", borderColor: "var(--line-hi)", background: "transparent", cursor: "pointer" }}>{d}</button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ marginBottom: 20 }}>
            <div className="row stack-sm" style={{ gap: 10 }}>
              <label htmlFor="pw" style={{ position: "absolute", left: -9999 }}>Password to check</label>
              <input id="pw" type="password" className="field full-sm" value={pw}
                onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && checkPw()}
                placeholder="Type a password" style={{ flex: 1 }} autoComplete="off" />
              <button className="btn btn-p full-sm" onClick={checkPw} disabled={state.status === "loading"}>
                {state.status === "loading" ? "Checking…" : "Check"}
              </button>
            </div>
            <p className="t-xs mute" style={{ margin: "10px 0 0", maxWidth: 580 }}>
              The password is hashed in your browser and only the first five characters of that hash
              are sent. Neither the password nor the full hash leaves your device. This is the
              k-anonymity model used by Pwned Passwords.
            </p>
          </div>
        )}

        {state.status === "loading" && (
          <div className="panel" style={{ textAlign: "center", padding: "40px" }}>
            <div className="t-sm mono" style={{ color: "#B7A4FF" }}>Querying the breach index…</div>
          </div>
        )}

        {state.status === "error" && (
          <div className="panel sev sev-high">
            <h3 className="t-sm" style={{ marginBottom: 6 }}>Could not complete the check</h3>
            <p className="t-sm dim" style={{ margin: 0 }}>{state.message}</p>
          </div>
        )}

        {state.status === "pw" && (
          <div className="panel" style={{ borderColor: state.count ? "var(--s1)55" : "var(--s4)55" }}>
            {state.count ? (
              <>
                <h3 className="t-md" style={{ color: "var(--s1)", marginBottom: 8 }}>
                  Seen {state.count.toLocaleString()} times
                </h3>
                <p className="t-sm dim" style={{ margin: 0, maxWidth: 580 }}>
                  This password appears in known breach corpora. Credential-stuffing tools use exactly
                  this list, so it should not be used anywhere. Change it on every service where it appears.
                </p>
              </>
            ) : (
              <>
                <h3 className="t-md" style={{ color: "var(--s4)", marginBottom: 8 }}>Not found</h3>
                <p className="t-sm dim" style={{ margin: 0, maxWidth: 580 }}>
                  This password does not appear in the Pwned Passwords corpus. That does not make it
                  strong, only unseen. Length and uniqueness still matter more than anything else.
                </p>
              </>
            )}
          </div>
        )}

        {state.status === "done" && (
          <Results subject={state.subject} breaches={state.breaches}
            kind={mode === "domain" ? "Domain" : "Identity"} />
        )}

        <div className="panel" style={{ marginTop: 30, background: "transparent" }}>
          <p className="t-xs dim" style={{ margin: 0 }}>
            Breach data is supplied by <a href="https://haveibeenpwned.com" target="_blank" rel="noopener noreferrer">Have I Been Pwned</a> and
            licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
            Risk scoring, remediation planning and regulatory mapping are produced by CredShield from
            that data. Passwords are never transmitted or stored. Domain search returns breaches
            recorded against a company; it does not enumerate individual employee accounts, which
            requires verified ownership of the domain.
            <br /><br />CredShield · <a href="https://ultenterprise.com" target="_blank" rel="noopener noreferrer">UltEnterprise</a>
          </p>
        </div>
      </div>
    </div>
  );
}
