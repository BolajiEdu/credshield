import { useState, useMemo, useCallback, useEffect } from "react";

// ══════════════════════════════════════════════════════════════
// CredShield v6 — Credential Exposure Intelligence
// Design concept: THE CLOCK. Every finding is a stopwatch already
// running. Elapsed time and deadline pressure are the organising
// visual idea — age spines, countdown rings, tabular numerals.
// DEMONSTRATION BUILD — all records generated locally.
// ══════════════════════════════════════════════════════════════

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

.cs {
  /* surfaces — deep slate, lifted off pure black */
  --ink-900:#080B12; --ink-800:#0C111A; --ink-700:#111825; --ink-600:#18222F;
  --line:#1D2836; --line-hi:#2B3B4E;
  --text:#DDE5F0; --dim:#8496AE; --mute:#4C5C73;

  /* signal ramp — heat, not hue-soup */
  --s1:#FF4D3D; --s2:#FF8A3D; --s3:#FFC53D; --s4:#3DD9A4;
  /* brand — violet, deliberately outside the security-dashboard default */
  --brand:#7C5CFF; --brand-soft:#7C5CFF1F; --brand-line:#7C5CFF4D;

  --r-chip:4px; --r-ctl:9px; --r-card:14px; --r-hero:22px;

  background:var(--ink-900); color:var(--text);
  font-family:'IBM Plex Sans',system-ui,sans-serif;
  font-size:14px; line-height:1.55; min-height:100vh;
  -webkit-font-smoothing:antialiased;
}
.cs *,.cs *::before,.cs *::after{box-sizing:border-box}
.cs h1,.cs h2,.cs h3{font-family:'Space Grotesk',sans-serif;margin:0;letter-spacing:-.02em}
.cs button,.cs input,.cs textarea{font-family:inherit;font-size:inherit}

/* ── focus + motion ───────────────────────────────── */
.cs :focus-visible{outline:2px solid var(--brand);outline-offset:2px;border-radius:3px}
.cs button:focus:not(:focus-visible){outline:none}
@media (prefers-reduced-motion:reduce){
  .cs *,.cs *::before,.cs *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
}

/* ── type scale — 12px floor ──────────────────────── */
.cs .t-xs{font-size:12px} .cs .t-sm{font-size:13px} .cs .t-base{font-size:14px}
.cs .t-md{font-size:16px} .cs .t-lg{font-size:20px}
.cs .num{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums;font-feature-settings:"tnum"}
.cs .mono{font-family:'IBM Plex Mono',monospace}
.cs .dim{color:var(--dim)} .cs .mute{color:var(--mute)}

/* ── surface hierarchy — three distinct levels ────── */
.cs .panel{background:var(--ink-800);border:1px solid var(--line);border-radius:var(--r-card);padding:18px 20px}
.cs .panel-flat{background:transparent;border:1px solid var(--line);border-radius:var(--r-card);padding:16px 18px}
.cs .panel-sunk{background:var(--ink-900);border-radius:10px;padding:12px 14px}
.cs .hero{
  background:
    radial-gradient(120% 140% at 88% -10%, #7C5CFF1A 0%, transparent 55%),
    linear-gradient(168deg,var(--ink-700),var(--ink-800));
  border:1px solid var(--line-hi);border-radius:var(--r-hero);padding:38px 36px;position:relative;overflow:hidden
}
.cs .hero::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background-image:repeating-linear-gradient(90deg,#FFFFFF08 0 1px,transparent 1px 64px);
  mask-image:linear-gradient(180deg,transparent,#000 60%,transparent)
}

/* ── severity: encoded by border STYLE + glyph, not colour alone ── */
.cs .sev{border-left-width:4px;border-left-style:solid}
.cs .sev-critical{border-left-color:var(--s1);border-left-style:solid}
.cs .sev-high{border-left-color:var(--s2);border-left-style:solid}
.cs .sev-medium{border-left-color:var(--s3);border-left-style:dashed}
.cs .sev-low{border-left-color:var(--s4);border-left-style:dotted}
.cs .sev-glyph{font-family:'IBM Plex Mono',monospace;letter-spacing:-1px;font-size:12px}

/* ── chips ────────────────────────────────────────── */
.cs .chip{display:inline-flex;align-items:center;gap:5px;border-radius:var(--r-chip);
  font-size:12px;font-weight:600;padding:3px 8px;border:1px solid;white-space:nowrap;line-height:1.3}

/* ── controls ─────────────────────────────────────── */
.cs .btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;
  border-radius:var(--r-ctl);padding:10px 18px;font-size:13px;font-weight:600;
  cursor:pointer;border:1px solid transparent;transition:transform .12s,filter .15s;line-height:1}
.cs .btn:active{transform:translateY(1px)}
.cs .btn:disabled{cursor:not-allowed;opacity:.5}
.cs .btn-primary{background:var(--brand);color:#fff;box-shadow:0 2px 14px #7C5CFF33}
.cs .btn-primary:hover:not(:disabled){filter:brightness(1.1)}
.cs .btn-ghost{background:transparent;border-color:var(--line-hi);color:var(--text)}
.cs .btn-ghost:hover:not(:disabled){border-color:var(--brand-line);color:#fff}
.cs .field{width:100%;background:var(--ink-900);border:1px solid var(--line-hi);
  border-radius:var(--r-ctl);padding:12px 14px;color:var(--text);font-size:14px;outline:none;
  transition:border-color .15s}
.cs .field:focus{border-color:var(--brand)}
.cs .field::placeholder{color:var(--mute)}

/* ── nav ──────────────────────────────────────────── */
.cs .topbar{display:flex;align-items:center;gap:14px;padding:0 24px;height:60px;
  background:#0C111AE6;backdrop-filter:blur(14px);border-bottom:1px solid var(--line);
  position:sticky;top:0;z-index:40}
.cs .navscroll{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.cs .navscroll::-webkit-scrollbar{display:none}
.cs .navbtn{position:relative;background:transparent;border:1px solid transparent;border-radius:var(--r-ctl);
  padding:8px 14px;cursor:pointer;color:var(--dim);font-size:13px;font-weight:600;white-space:nowrap}
.cs .navbtn[aria-current="true"]{background:var(--brand-soft);border-color:var(--brand-line);color:#B7A4FF}
.cs .navbtn:hover{color:var(--text)}

/* ── layout ───────────────────────────────────────── */
.cs .wrap{max-width:1260px;margin:0 auto;padding:26px 24px 64px}
.cs .g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.cs .g3{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.cs .g4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.cs .row{display:flex;align-items:center;gap:12px}
.cs .stack{display:flex;flex-direction:column;gap:12px}

/* ── time spine: the signature element ────────────── */
.cs .spine{position:relative;height:22px;display:flex;align-items:center}
.cs .spine-track{position:absolute;left:0;right:0;height:2px;background:var(--line-hi);border-radius:2px}
.cs .spine-fill{position:absolute;left:0;height:2px;border-radius:2px}
.cs .spine-tick{position:absolute;width:1px;height:6px;background:var(--mute);top:8px}
.cs .spine-now{position:absolute;width:9px;height:9px;border-radius:50%;border:2px solid var(--ink-800);top:6.5px}

/* ── countdown ring ───────────────────────────────── */
.cs .ring-label{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}

/* ── table rows ───────────────────────────────────── */
.cs .rowitem{display:flex;align-items:center;gap:12px;padding:13px 18px;
  border-bottom:1px solid var(--line);cursor:pointer;border-left:3px solid transparent;
  background:transparent;width:100%;text-align:left}
.cs .rowitem:hover{background:#FFFFFF05}
.cs .rowitem[aria-selected="true"]{background:var(--brand-soft);border-left-color:var(--brand)}

/* ── pulse ────────────────────────────────────────── */
@keyframes cs-pulse{0%{transform:scale(.5);opacity:.35}100%{transform:scale(2.3);opacity:0}}
@keyframes cs-in{from{opacity:0;transform:translateY(-3px)}to{opacity:1;transform:none}}
.cs .anim-in{animation:cs-in .3s ease}

/* ── responsive ───────────────────────────────────── */
@media (max-width:980px){
  .cs .g2{grid-template-columns:1fr}
  .cs .g4{grid-template-columns:repeat(2,1fr)}
  .cs .hero{padding:30px 24px}
  .cs .wrap{padding:20px 16px 56px}
  .cs .topbar{padding:0 16px;gap:10px}
}
@media (max-width:620px){
  .cs .g3{grid-template-columns:repeat(2,1fr)}
  .cs .hero{padding:26px 20px;border-radius:16px}
  .cs .panel{padding:15px 16px}
  .cs .stack-sm{flex-direction:column;align-items:stretch}
  .cs .hide-sm{display:none}
  .cs .full-sm{width:100%}
}
@media (max-width:420px){
  .cs .g4{grid-template-columns:1fr 1fr}
  .cs .g3{grid-template-columns:1fr}
}
`;

// ─── icons (hand-rolled, no emoji) ───────────────────────────
const Ico = ({ d, size = 16, stroke = "currentColor", fill = "none", w = 1.7, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
    strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    style={{ flexShrink: 0, display: "block", ...style }}>{d}</svg>
);
const I = {
  shield: p => <Ico {...p} d={<path d="M12 2 4 5v7c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10V5l-8-3Z" />} />,
  search: p => <Ico {...p} d={<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></>} />,
  clock: p => <Ico {...p} d={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.2 1.9" /></>} />,
  down: p => <Ico {...p} d={<><path d="M12 3v13" /><path d="m7 12 5 5 5-5" /><path d="M4 21h16" /></>} />,
  print: p => <Ico {...p} d={<><path d="M6 9V3h12v6" /><rect x="3" y="9" width="18" height="7" rx="2" /><path d="M7 16h10v5H7z" /></>} />,
  refresh: p => <Ico {...p} d={<><path d="M21 12a9 9 0 1 1-3-6.7" /><path d="M21 4v5h-5" /></>} />,
  bell: p => <Ico {...p} d={<><path d="M18 9a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7" /><path d="M10.5 20a2 2 0 0 0 3 0" /></>} />,
  plug: p => <Ico {...p} d={<><path d="M9 2v6M15 2v6" /><path d="M6 8h12v3a6 6 0 0 1-12 0V8Z" /><path d="M12 17v5" /></>} />,
  bank: p => <Ico {...p} d={<><path d="M3 10 12 4l9 6" /><path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9" /><path d="M3 21h18" /></>} />,
  chev: p => <Ico {...p} d={<path d="m6 9 6 6 6-6" />} />,
  check: p => <Ico {...p} d={<path d="m4 12 5.5 5.5L20 7" />} w={2.4} />,
  alert: p => <Ico {...p} d={<><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4M12 17.5v.01" /></>} />,
  lock: p => <Ico {...p} d={<><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>} />,
  code: p => <Ico {...p} d={<><path d="m9 8-5 4 5 4" /><path d="m15 8 5 4-5 4" /></>} />,
  scale: p => <Ico {...p} d={<><path d="M12 3v18" /><path d="M5 7h14" /><path d="m5 7-3 7h6l-3-7Z" /><path d="m19 7-3 7h6l-3-7Z" /></>} />,
  up: p => <Ico {...p} d={<path d="M12 19V5m0 0-6 6m6-6 6 6" />} />,
  dn: p => <Ico {...p} d={<path d="M12 5v14m0 0 6-6m-6 6-6-6" />} />,
};

// ─── institutions ────────────────────────────────────────────
const INSTITUTIONS = [
  { id: "BARC", name: "Barclays",               region: "UK",     tier: "Tier 1", brand: "#00AEEF", domains: ["@barclays.co.uk", "@barclays.com"], accounts: "48M" },
  { id: "HSBC", name: "HSBC",                   region: "UK",     tier: "Tier 1", brand: "#DB0011", domains: ["@hsbc.com", "@hsbc.co.uk"],         accounts: "39M" },
  { id: "LLOY", name: "Lloyds Banking Group",   region: "UK",     tier: "Tier 1", brand: "#009B77", domains: ["@lloydsbanking.com"],               accounts: "26M" },
  { id: "NWG",  name: "NatWest Group",          region: "UK",     tier: "Tier 1", brand: "#8B5FBF", domains: ["@natwest.com"],                     accounts: "19M" },
  { id: "JPM",  name: "JPMorgan Chase",         region: "US",     tier: "Tier 1", brand: "#3D8BD8", domains: ["@jpmchase.com", "@jpmorgan.com"],   accounts: "82M" },
  { id: "BAC",  name: "Bank of America",        region: "US",     tier: "Tier 1", brand: "#E31837", domains: ["@bofa.com"],                        accounts: "68M" },
  { id: "WFC",  name: "Wells Fargo",            region: "US",     tier: "Tier 1", brand: "#D71E28", domains: ["@wellsfargo.com"],                  accounts: "64M" },
  { id: "AXP",  name: "American Express",       region: "US",     tier: "Tier 1", brand: "#3D9BE9", domains: ["@aexp.com", "@amex.com"],           accounts: "121M" },
  { id: "C",    name: "Citigroup",              region: "US",     tier: "Tier 1", brand: "#4A88C7", domains: ["@citi.com"],                        accounts: "58M" },
  { id: "DB",   name: "Deutsche Bank",          region: "EU",     tier: "Tier 1", brand: "#5B7FFF", domains: ["@db.com"],                          accounts: "19M" },
  { id: "BNP",  name: "BNP Paribas",            region: "EU",     tier: "Tier 1", brand: "#00A87E", domains: ["@bnpparibas.com"],                  accounts: "33M" },
  { id: "SAN",  name: "Santander",              region: "EU",     tier: "Tier 1", brand: "#EC0000", domains: ["@santander.com"],                   accounts: "41M" },
  { id: "ING",  name: "ING Group",              region: "EU",     tier: "Tier 2", brand: "#FF6200", domains: ["@ing.com"],                         accounts: "38M" },
  { id: "UBS",  name: "UBS",                    region: "EU",     tier: "Tier 1", brand: "#E60100", domains: ["@ubs.com"],                         accounts: "12M" },
  { id: "GTB",  name: "Guaranty Trust Bank",    region: "Africa", tier: "Tier 1", brand: "#F26B38", domains: ["@gtbank.com"],                      accounts: "32M" },
  { id: "ZNB",  name: "Zenith Bank",            region: "Africa", tier: "Tier 1", brand: "#E31E24", domains: ["@zenithbank.com"],                  accounts: "22M" },
  { id: "UBA",  name: "United Bank for Africa", region: "Africa", tier: "Tier 1", brand: "#D2232A", domains: ["@ubagroup.com"],                    accounts: "45M" },
  { id: "EQTY", name: "Equity Bank",            region: "Africa", tier: "Tier 1", brand: "#C4353F", domains: ["@equitybank.co.ke"],                accounts: "18M" },
  { id: "STAN", name: "Standard Bank",          region: "Africa", tier: "Tier 1", brand: "#4A7FD4", domains: ["@standardbank.co.za"],              accounts: "15M" },
  { id: "FNB",  name: "First National Bank",    region: "Africa", tier: "Tier 2", brand: "#3DB8E8", domains: ["@fnb.co.za"],                       accounts: "11M" },
];

const REGIONS = ["All regions", "UK", "US", "EU", "Africa"];
const DATE_RANGES = [
  { id: "24h", label: "Last 24 hours",  days: 1 },
  { id: "7d",  label: "Last 7 days",    days: 7 },
  { id: "30d", label: "Last 30 days",   days: 30 },
  { id: "90d", label: "Last 90 days",   days: 90 },
  { id: "1y",  label: "Last 12 months", days: 365 },
];
const SEVERITIES = ["All severities", "Critical", "High", "Medium", "Low"];

const EVENT_TYPES = [
  { type: "Credential stuffing campaign", weight: 5 },
  { type: "Stealer log batch identified",  weight: 5 },
  { type: "Telegram listing detected",     weight: 4 },
  { type: "Combo list circulation",        weight: 4 },
  { type: "Session token leak",            weight: 5 },
  { type: "Phishing kit deployment",       weight: 4 },
  { type: "SIM-swap indicator cluster",    weight: 4 },
  { type: "Business email compromise",     weight: 5 },
  { type: "Executive account targeted",    weight: 5 },
  { type: "MFA bypass attempt",            weight: 5 },
  { type: "Ransomware leak publication",   weight: 5 },
  { type: "Card BIN range advertised",     weight: 3 },
  { type: "Employee credential resale",    weight: 3 },
  { type: "Password spray detected",       weight: 3 },
];
const CHANNELS = ["Telegram channel (redacted)", "Tor marketplace", "Public paste site", "Ransomware portal", "Private forum", "Stealer aggregator"];

// ─── generators ──────────────────────────────────────────────
function seedOf(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i); return Math.abs(h); }
function rng(seed) { let s = seed || 1; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];

function bankProfile(inst, days) {
  const r = rng(seedOf(inst.id + days));
  const risk = Math.min(97, Math.round((inst.tier === "Tier 1" ? 40 : 25) + r() * 55));
  const scale = days / 30;
  return {
    risk,
    exposedAccounts: Math.round((800 + r() * 14000) * scale),
    activeListings: Math.round((2 + r() * 28) * Math.min(scale, 3)),
    blockedLogins: Math.round((1200 + r() * 48000) * scale),
    execTargeted: Math.round(r() * 9 * Math.min(scale, 2)),
    iocsShared: Math.round((40 + r() * 900) * scale),
    trend: r() > 0.45 ? "up" : "down",
    trendPct: Math.round(3 + r() * 34),
    dwellDays: Math.round(4 + r() * 90),
  };
}

function makeEvents(insts, days, count) {
  const r = rng(seedOf(insts.map(i => i.id).join("") + days + count));
  return Array.from({ length: count }, (_, i) => {
    const inst = pick(r, insts), ev = pick(r, EVENT_TYPES), roll = r();
    const severity = ev.weight >= 5 ? (roll > .45 ? "Critical" : "High")
      : ev.weight >= 4 ? (roll > .6 ? "High" : "Medium") : (roll > .7 ? "Medium" : "Low");
    return {
      id: `EV-${seedOf(inst.id + i + days).toString(36).slice(0, 7).toUpperCase()}`,
      inst, type: ev.type, severity,
      ts: Date.now() - Math.floor(r() * days * 86400000),
      accounts: Math.round(8 + r() * 6200),
      channel: pick(r, CHANNELS),
      iocs: Math.round(4 + r() * 720),
      status: r() > .55 ? "Mitigated" : r() > .25 ? "Active" : "Investigating",
    };
  }).sort((a, b) => b.ts - a.ts);
}

const SEV = {
  Critical: { v: "s1", glyph: "████", n: 4 },
  High:     { v: "s2", glyph: "███",  n: 3 },
  Medium:   { v: "s3", glyph: "██",   n: 2 },
  Low:      { v: "s4", glyph: "█",    n: 1 },
};
const sevVar = s => `var(--${SEV[s]?.v || "s4"})`;
const riskVar = v => v >= 80 ? "var(--s1)" : v >= 60 ? "var(--s2)" : v >= 40 ? "var(--s3)" : "var(--s4)";

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}
const fullDate = ts => new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

// ══ exposure intelligence ════════════════════════════════════
const BREACHES = [
  { name: "Collection #1 Aggregate",    year: 2019, records: "773M", vector: "Credential aggregation" },
  { name: "RedLine Stealer Batch 4492", year: 2024, records: "2.1M", vector: "Infostealer malware" },
  { name: "Telegram Combo Drop EU-24",  year: 2024, records: "48M",  vector: "Combo list circulation" },
  { name: "BlackCat Leak Site Dump",    year: 2023, records: "890K", vector: "Ransomware publication" },
  { name: "Raccoon Stealer Log Set",    year: 2023, records: "1.4M", vector: "Infostealer malware" },
  { name: "MOVEit Transfer Incident",   year: 2023, records: "62M",  vector: "Zero-day exploitation" },
  { name: "Paste Site Aggregate Q3",    year: 2024, records: "310K", vector: "Public paste harvest" },
];
const DATA_CLASSES = [
  { id: "email",    label: "Email address",            severity: 1 },
  { id: "pw_plain", label: "Plaintext password",       severity: 5 },
  { id: "pw_hash",  label: "Hashed password",          severity: 3 },
  { id: "phone",    label: "Phone number",             severity: 2 },
  { id: "name",     label: "Full name",                severity: 1 },
  { id: "dob",      label: "Date of birth",            severity: 3 },
  { id: "address",  label: "Physical address",         severity: 3 },
  { id: "session",  label: "Session cookie / token",   severity: 5 },
  { id: "mfa",      label: "MFA recovery code",        severity: 5 },
  { id: "card_bin", label: "Card BIN (first 6)",       severity: 4 },
  { id: "sec_q",    label: "Security question answer", severity: 4 },
  { id: "api_key",  label: "API key / secret",         severity: 5 },
];
const HASH_ALGOS = [
  { algo: "MD5 (unsalted)",         crackable: "Seconds",     risk: 5 },
  { algo: "SHA-1 (unsalted)",       crackable: "Minutes",     risk: 5 },
  { algo: "SHA-256 (unsalted)",     crackable: "Hours",       risk: 4 },
  { algo: "bcrypt (cost 10)",       crackable: "Years",       risk: 2 },
  { algo: "Argon2id",               crackable: "Impractical", risk: 1 },
  { algo: "Plaintext (no hashing)", crackable: "Immediate",   risk: 5 },
];
const PW_PATTERNS = [
  { pattern: "Name + birth year",      example: "•••••1987" },
  { pattern: "Company + number",       example: "••••••••23!" },
  { pattern: "Keyboard walk",          example: "••••••••••" },
  { pattern: "Dictionary + symbol",    example: "••••••••#" },
  { pattern: "Reused across services", example: "•••••••••" },
  { pattern: "High entropy, unique",   example: "••••••••••••••" },
];
const DEPTS = ["Finance", "Engineering", "Operations", "Executive", "Customer Support", "HR", "IT Admin"];

function buildExposure(identity, drift = 0) {
  const isDomain = identity.trim().startsWith("@") || (!identity.includes("@") && identity.includes("."));
  const seed = seedOf(identity.toLowerCase().trim());
  const r = rng(seed + drift * 7919);
  const base = isDomain ? 4 + Math.floor(rng(seed)() * 5) : 1 + Math.floor(rng(seed)() * 4);
  const n = Math.max(1, base + (drift ? Math.floor(r() * 3) - 1 : 0));

  const records = Array.from({ length: n }, (_, i) => {
    const breach = BREACHES[(seed + i * 3 + drift) % BREACHES.length];
    const cnt = 2 + Math.floor(r() * 6);
    const classes = []; const pool = [...DATA_CLASSES];
    for (let k = 0; k < cnt && pool.length; k++) classes.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    if (!classes.find(c => c.id === "email")) classes.unshift(DATA_CLASSES[0]);
    const hasPlain = classes.some(c => c.id === "pw_plain");
    const monthsAgo = Math.floor(r() * 30);
    const d = new Date(); d.setMonth(d.getMonth() - monthsAgo);
    const account = isDomain
      ? `${pick(r, ["j.adeyemi", "s.okafor", "m.mueller", "a.dubois", "k.mensah", "l.garcia", "t.wanjiru", "admin", "finance", "it.support"])}${identity.startsWith("@") ? identity : "@" + identity}`
      : identity;
    return {
      id: `EXP-${(seed + i * 31 + drift * 101).toString(36).slice(0, 6).toUpperCase()}`,
      account, breach, classes,
      hash: hasPlain ? HASH_ALGOS[5] : pick(r, HASH_ALGOS.slice(0, 5)),
      pwPattern: pick(r, PW_PATTERNS),
      channel: pick(r, CHANNELS),
      firstSeen: d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
      monthsAgo, daysExposed: monthsAgo * 30 + Math.floor(r() * 29),
      reuseCount: 1 + Math.floor(r() * 6),
      confidence: 60 + Math.floor(r() * 40),
      stillListed: r() > .35,
      department: pick(r, DEPTS),
      severity: Math.max(...classes.map(c => c.severity)),
    };
  });

  const maxSev = Math.max(...records.map(x => x.severity));
  const plainCount = records.filter(x => x.classes.some(c => c.id === "pw_plain")).length;
  const sessionCount = records.filter(x => x.classes.some(c => c.id === "session")).length;
  const activeCount = records.filter(x => x.stillListed).length;
  const recentCount = records.filter(x => x.monthsAgo <= 6).length;
  const oldestDays = Math.max(...records.map(x => x.daysExposed));
  const score = Math.min(99, Math.round(maxSev * 11 + plainCount * 9 + sessionCount * 12 + activeCount * 5 + recentCount * 4 + (records.length > 4 ? 8 : 0)));
  return { identity, isDomain, records, score, plainCount, sessionCount, activeCount, recentCount, oldestDays, scannedAt: Date.now() };
}

function grade(score) {
  if (score >= 80) return { label: "Critical", sev: "Critical", action: "Block and reset now" };
  if (score >= 60) return { label: "High", sev: "High", action: "Force step-up auth" };
  if (score >= 35) return { label: "Medium", sev: "Medium", action: "Flag and monitor" };
  return { label: "Low", sev: "Low", action: "No action required" };
}

function buildRemediation(exp) {
  const tasks = []; const has = id => exp.records.some(r => r.classes.some(c => c.id === id));
  const push = t => tasks.push({ ...t, id: `R${String(tasks.length + 1).padStart(2, "0")}` });

  if (exp.plainCount > 0) push({
    priority: "P0", window: "Within 1 hour", hours: 1, owner: "IAM / Service Desk", sev: "Critical",
    title: "Force password reset on all affected accounts",
    why: `${exp.plainCount} record${exp.plainCount === 1 ? "" : "s"} contain passwords in plaintext. These are usable immediately by anyone holding the dump.`,
    steps: ["Invalidate current passwords server-side — do not rely on a reset email alone.",
      "Push reset via a verified out-of-band channel (registered phone, not the exposed email).",
      "Block the exposed password strings at the reset form so users cannot re-enter them.",
      "Require the new password to differ from the last 10, checked by hash comparison."],
  });
  if (has("session")) push({
    priority: "P0", window: "Within 1 hour", hours: 1, owner: "Platform Engineering", sev: "Critical",
    title: "Revoke active sessions and rotate signing keys",
    why: "A leaked session token bypasses passwords and MFA entirely. A password reset alone does not close this.",
    steps: ["Invalidate every active session for affected accounts server-side.",
      "Rotate the JWT/session signing secret so issued tokens cannot be replayed.",
      "Bind refresh tokens to device fingerprint and IP range, and shorten their lifetime.",
      "Audit access logs from the token's first-seen date for signs of use."],
  });
  if (has("mfa") || has("sec_q")) push({
    priority: "P0", window: "Within 4 hours", hours: 4, owner: "IAM", sev: "Critical",
    title: "Re-enrol MFA and void security answers",
    why: "Recovery codes and security answers let an attacker walk through account recovery without the password.",
    steps: ["Void all existing MFA recovery codes and issue fresh ones.",
      "Force MFA re-enrolment on next login for affected accounts.",
      "Retire knowledge-based security questions — they cannot be rotated once leaked.",
      "Move high-value accounts to phishing-resistant MFA (FIDO2 / passkeys)."],
  });
  if (has("api_key")) push({
    priority: "P0", window: "Within 2 hours", hours: 2, owner: "Engineering", sev: "Critical",
    title: "Rotate exposed API keys and secrets",
    why: "A leaked key grants machine-level access that no user-facing control will catch.",
    steps: ["Revoke the exposed key immediately, then issue a replacement.",
      "Search git history and CI logs for the same secret committed elsewhere.",
      "Move secrets into a managed vault with short-lived, auto-rotating credentials.",
      "Enable per-key rate limiting and IP allowlisting."],
  });
  if (exp.records.some(r => r.hash.risk >= 4 && r.hash.algo !== "Plaintext (no hashing)")) push({
    priority: "P1", window: "Within 7 days", hours: 168, owner: "Engineering", sev: "High",
    title: "Migrate password storage to a modern KDF",
    why: "Passwords under MD5, SHA-1 or unsalted SHA-256 are recoverable on commodity GPUs in hours or less.",
    steps: ["Adopt Argon2id (or bcrypt cost ≥ 12) for all new and changed passwords.",
      "Rehash transparently on next successful login — no user-visible change.",
      "Set a cutoff date after which un-migrated accounts are force-reset.",
      "Add a peppered secret held outside the database."],
  });
  if (exp.records.some(r => r.reuseCount >= 3)) push({
    priority: "P1", window: "Within 14 days", hours: 336, owner: "Security Awareness", sev: "High",
    title: "Address password reuse across services",
    why: "Reused passwords mean a breach anywhere becomes a breach here. Several records show the same credential across multiple sources.",
    steps: ["Screen new passwords against a breached-password corpus at set time.",
      "Roll out a managed password manager, with enrolment tracked.",
      "Run a targeted briefing for the business units with heaviest exposure.",
      "Measure repeat-offender rate quarterly rather than relying on annual training."],
  });
  if (exp.activeCount > 0) push({
    priority: "P1", window: "Within 7 days", hours: 168, owner: "Threat Intelligence", sev: "High",
    title: "Pursue takedown of live listings",
    why: `${exp.activeCount} listing${exp.activeCount === 1 ? " is" : "s are"} still live and being redistributed.`,
    steps: ["File takedown requests with the hosting platform and channel operator.",
      "Report to the relevant national CERT and, in the UK, Action Fraud.",
      "Preserve evidence (hashes, timestamps, screenshots) before requesting removal.",
      "Set a standing monitor so re-uploads are caught rather than rediscovered."],
  });
  if (has("phone")) push({
    priority: "P2", window: "Within 30 days", hours: 720, owner: "Fraud Operations", sev: "Medium",
    title: "Harden against SIM-swap and vishing",
    why: "Exposed phone numbers paired with names make SIM-swap and voice phishing materially easier.",
    steps: ["Stop using SMS as a primary second factor for high-value accounts.",
      "Add a carrier port-out check before phone-based recovery.",
      "Brief the call centre on verification steps that do not rely on leaked data."],
  });
  push({
    priority: "P2", window: "Ongoing", hours: 720, owner: "Security Operations", sev: "Medium",
    title: "Put continuous monitoring in place",
    why: "This exposure was found retrospectively. Continuous checks shorten the window between leak and response.",
    steps: ["Enable domain-level monitoring so new listings alert within minutes.",
      "Wire the credential-check API into the login path so exposure is caught at authentication.",
      "Route critical findings to the on-call channel, not a shared inbox.",
      "Review detection-to-remediation time monthly and drive it down."],
  });
  if (exp.isDomain) push({
    priority: "P3", window: "This quarter", hours: 2160, owner: "CISO", sev: "Low",
    title: "Close the reporting and governance loop",
    why: "Regulators expect evidence of process, not just a one-off fix.",
    steps: ["Assess whether the exposure is notifiable under UK GDPR Article 33 (72-hour clock).",
      "Record the incident, decisions and rationale in the risk register.",
      "Report residual risk to the board with a dated remediation plan.",
      "Schedule follow-up scans at 30 and 90 days to confirm closure."],
  });
  return tasks;
}

// ─── compliance ──────────────────────────────────────────────
const COMPLIANCE_RULES = [
  { framework: "UK GDPR", ref: "Article 33", sev: "Critical", hours: 72,
    title: "Notify the ICO of a personal data breach",
    trigger: e => e.records.length > 0, clock: "72 hours from awareness",
    detail: "Exposure of personal data creates a notification assessment. If the breach is likely to result in a risk to individuals' rights and freedoms, the ICO must be notified within 72 hours. Document the reasoning either way — the assessment itself is the evidence.",
    evidence: "Breach register entry, risk assessment, ICO reference if notified" },
  { framework: "UK GDPR", ref: "Article 34", sev: "High", hours: 72,
    title: "Communicate the breach to data subjects",
    trigger: e => e.plainCount > 0 || e.records.some(r => r.classes.some(c => ["card_bin", "dob", "address"].includes(c.id))),
    clock: "Without undue delay",
    detail: "Where a breach is likely to result in a high risk to individuals, affected people must be told directly. Plaintext credentials or financial identifiers generally meet the high-risk threshold.",
    evidence: "Customer notification copy, distribution list, send timestamps" },
  { framework: "PCI-DSS v4.0", ref: "Req. 8.3.6", sev: "Medium", hours: 720,
    title: "Authentication factor storage strength",
    trigger: e => e.records.some(r => r.hash.risk >= 4), clock: "Continuous control",
    detail: "Weakly hashed or plaintext credentials indicate the authentication factor storage requirement is not met. Requirement 8 mandates strong cryptography for credentials in storage and transit.",
    evidence: "Hashing configuration, KDF migration plan, QSA sign-off" },
  { framework: "PCI-DSS v4.0", ref: "Req. 3.3", sev: "Medium", hours: 720,
    title: "Sensitive authentication data storage",
    trigger: e => e.records.some(r => r.classes.some(c => c.id === "card_bin")), clock: "Continuous control",
    detail: "Card data appearing in circulating dumps requires assessment of whether cardholder data environment controls held. Even BIN-only exposure warrants scope review.",
    evidence: "CDE scope diagram, segmentation test results, incident report" },
  { framework: "DORA", ref: "Article 19", sev: "Critical", hours: 4,
    title: "Report major ICT-related incidents",
    trigger: e => e.score >= 60, clock: "Initial report within 4 hours of classification",
    detail: "EU financial entities must report major ICT incidents to their competent authority. Credential exposure affecting customer-facing authentication is generally in scope where materiality thresholds are met.",
    evidence: "Initial, intermediate and final DORA reports; classification rationale" },
  { framework: "DORA", ref: "Articles 5–15", sev: "High", hours: 720,
    title: "ICT risk management framework",
    trigger: e => e.activeCount > 0, clock: "Continuous control",
    detail: "Live listings that remained undetected indicate a gap in the detection component of the ICT risk management framework. DORA requires mechanisms to promptly detect anomalous activity.",
    evidence: "Detection control inventory, coverage map, MTTD metrics" },
  { framework: "FCA", ref: "SYSC 13 / PRIN 3", sev: "High", hours: 720,
    title: "Adequate systems and controls for operational risk",
    trigger: e => e.score >= 35, clock: "Continuous obligation",
    detail: "UK regulated firms must organise their affairs responsibly with adequate risk management systems. Unmonitored credential exposure is a recognised operational risk the FCA expects firms to manage.",
    evidence: "Board risk report, control testing results, remediation tracker" },
  { framework: "NIS2", ref: "Article 23", sev: "Critical", hours: 24,
    title: "Significant incident early warning",
    trigger: e => e.score >= 70, clock: "Early warning within 24 hours",
    detail: "Essential and important entities must give an early warning of significant incidents within 24 hours, then a full notification within 72 hours, where the entity falls in NIS2 scope.",
    evidence: "CSIRT early warning, incident notification, final report" },
];
const mapCompliance = exp => COMPLIANCE_RULES.filter(r => r.trigger(exp));

function diffScans(prev, next) {
  if (!prev) return null;
  const pIds = new Set(prev.records.map(r => r.id)), nIds = new Set(next.records.map(r => r.id));
  return {
    added: next.records.filter(r => !pIds.has(r.id)),
    removed: prev.records.filter(r => !nIds.has(r.id)),
    scoreDelta: next.score - prev.score, since: prev.scannedAt,
  };
}

// ─── primitives ──────────────────────────────────────────────
const Chip = ({ children, tone = "var(--dim)", icon }) => (
  <span className="chip" style={{ color: tone, borderColor: tone + "4D", background: tone + "14" }}>
    {icon}{children}
  </span>
);

const SevChip = ({ level }) => {
  const m = SEV[level] || SEV.Low;
  return (
    <span className="chip" style={{ color: `var(--${m.v})`, borderColor: `var(--${m.v})`, background: `var(--${m.v})14` }}>
      <span className="sev-glyph" aria-hidden="true">{m.glyph}</span>
      {level}
    </span>
  );
};

const Pulse = ({ tone = "var(--s4)", size = 7 }) => (
  <span style={{ position: "relative", display: "inline-flex", width: size + 4, height: size + 4, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    <span style={{ position: "absolute", width: size + 4, height: size + 4, borderRadius: "50%", background: tone, opacity: .3, animation: "cs-pulse 2s ease-out infinite" }} />
    <span style={{ width: size, height: size, borderRadius: "50%", background: tone }} />
  </span>
);

const Meter = ({ value, tone, h = 5 }) => (
  <div style={{ width: "100%", height: h, background: "var(--line)", borderRadius: h }}>
    <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: tone, borderRadius: h, transition: "width .7s cubic-bezier(.4,0,.2,1)" }} />
  </div>
);

// SIGNATURE ELEMENT — the age spine
function AgeSpine({ days, max = 900, tone, label = true }) {
  const pct = Math.min(100, (days / max) * 100);
  return (
    <div>
      <div className="spine">
        <div className="spine-track" />
        {[0, 25, 50, 75, 100].map(t => <div key={t} className="spine-tick" style={{ left: `${t}%` }} />)}
        <div className="spine-fill" style={{ width: `${pct}%`, background: tone }} />
        <div className="spine-now" style={{ left: `calc(${pct}% - 4.5px)`, background: tone }} />
      </div>
      {label && (
        <div className="row" style={{ justifyContent: "space-between", marginTop: 2 }}>
          <span className="t-xs mute num">exposed {days}d</span>
          <span className="t-xs mute">today</span>
        </div>
      )}
    </div>
  );
}

// countdown ring for regulatory clocks
function ClockRing({ hours, tone, size = 46 }) {
  const frac = Math.max(.08, Math.min(1, 1 - Math.log10(hours + 1) / 3.4));
  const r = size / 2 - 4, circ = 2 * Math.PI * r;
  const txt = hours >= 720 ? "ONG" : hours >= 24 ? `${Math.round(hours / 24)}d` : `${hours}h`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-hi)" strokeWidth="3" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="3"
        strokeDasharray={`${circ * frac} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill={tone}
        fontSize="12" fontWeight="600" fontFamily="'IBM Plex Mono',monospace">{txt}</text>
    </svg>
  );
}

function Dial({ score, size = 112 }) {
  const g = grade(score), tone = sevVar(g.sev);
  const r = size / 2 - 10, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`Risk score ${score} of 100, ${g.label}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="8"
          strokeDasharray={`${circ * score / 100} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * 2 * Math.PI - Math.PI / 2;
          const R1 = r - 9, R2 = r - 12;
          return <line key={i} x1={size / 2 + Math.cos(a) * R1} y1={size / 2 + Math.sin(a) * R1}
            x2={size / 2 + Math.cos(a) * R2} y2={size / 2 + Math.sin(a) * R2}
            stroke={i * 5 < score ? tone : "var(--line-hi)"} strokeWidth="1.5" />;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span className="num" style={{ fontSize: size > 90 ? 30 : 22, fontWeight: 700, color: tone, lineHeight: 1 }}>{score}</span>
        <span className="t-xs" style={{ color: "var(--dim)", marginTop: 3 }}>{g.label}</span>
      </div>
    </div>
  );
}

function Select({ label, value, options, onChange, width = 180 }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", width, minWidth: 130 }}>
      {label && <div className="t-xs dim" style={{ marginBottom: 5 }}>{label}</div>}
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox"
        style={{
          width: "100%", background: "var(--ink-700)", border: `1px solid ${open ? "var(--brand)" : "var(--line-hi)"}`,
          borderRadius: "var(--r-ctl)", padding: "10px 12px", color: "var(--text)", fontSize: 13,
          cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left",
        }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
        <I.chev size={14} stroke="var(--dim)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <ul role="listbox" style={{
            position: "absolute", top: "100%", left: 0, right: 0, marginTop: 5, zIndex: 61,
            background: "var(--ink-600)", border: "1px solid var(--line-hi)", borderRadius: 10,
            maxHeight: 270, overflowY: "auto", boxShadow: "0 16px 40px #000B", listStyle: "none", padding: 4, margin: "5px 0 0",
          }}>
            {options.map(o => {
              const l = typeof o === "string" ? o : o.label;
              const sel = l === value;
              return (
                <li key={l} role="option" aria-selected={sel} tabIndex={0}
                  onClick={() => { onChange(o); setOpen(false); }}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(o); setOpen(false); } }}
                  style={{
                    padding: "9px 11px", fontSize: 13, cursor: "pointer", borderRadius: 7,
                    color: sel ? "#B7A4FF" : "var(--text)", background: sel ? "var(--brand-soft)" : "transparent",
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                  {sel && <I.check size={13} stroke="#B7A4FF" />}
                  <span style={{ marginLeft: sel ? 0 : 21 }}>{l}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

function Spark({ seed, tone, w = 66, h = 28 }) {
  const pts = useMemo(() => {
    const r = rng(seed), n = 18;
    return Array.from({ length: n }, (_, i) => ({ x: (i / (n - 1)) * w, y: h - (.15 + r() * .8) * h }));
  }, [seed, w, h]);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={tone} opacity=".14" />
      <path d={d} fill="none" stroke={tone} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function TimelineChart({ events, days }) {
  const buckets = useMemo(() => {
    const n = days <= 1 ? 24 : days <= 7 ? 14 : days <= 30 ? 15 : 12;
    const span = days * 86400000 / n, now = Date.now();
    const arr = Array.from({ length: n }, (_, i) => ({ i, crit: 0, high: 0, other: 0, start: now - (n - i) * span }));
    events.forEach(e => {
      const idx = Math.min(n - 1, Math.max(0, Math.floor((e.ts - (now - days * 86400000)) / span)));
      if (e.severity === "Critical") arr[idx].crit++;
      else if (e.severity === "High") arr[idx].high++;
      else arr[idx].other++;
    });
    return arr;
  }, [events, days]);
  const max = Math.max(...buckets.map(b => b.crit + b.high + b.other), 1);
  const label = ts => days <= 1
    ? new Date(ts).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 118 }}>
        {buckets.map(b => {
          const tot = b.crit + b.high + b.other;
          return (
            <div key={b.i} title={`${label(b.start)} — ${tot} events`}
              style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", height: "100%", gap: 1.5 }}>
              {b.crit > 0 && <div style={{ height: `${(b.crit / max) * 100}%`, background: "var(--s1)", borderRadius: "3px 3px 0 0", minHeight: 3 }} />}
              {b.high > 0 && <div style={{ height: `${(b.high / max) * 100}%`, background: "var(--s2)", minHeight: 3 }} />}
              {b.other > 0 && <div style={{ height: `${(b.other / max) * 100}%`, background: "var(--s3)", opacity: .55, borderRadius: tot === b.other ? "3px 3px 0 0" : 0, minHeight: 3 }} />}
              {tot === 0 && <div style={{ height: 2, background: "var(--line-hi)" }} />}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 8, paddingTop: 7, borderTop: "1px solid var(--line)" }}>
        <span className="t-xs mute num">{label(buckets[0].start)}</span>
        <span className="t-xs mute num">now</span>
      </div>
      <div className="row" style={{ gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        {[["Critical", "var(--s1)", "████"], ["High", "var(--s2)", "███"], ["Medium / Low", "var(--s3)", "██"]].map(([l, c, g]) => (
          <span key={l} className="row" style={{ gap: 6 }}>
            <span className="sev-glyph" style={{ color: c }} aria-hidden="true">{g}</span>
            <span className="t-xs dim">{l}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── report export ───────────────────────────────────────────
function buildReportHTML(exp, tasks, compliance) {
  const g = grade(exp.score);
  const hex = { Critical: "#D3341F", High: "#C25A00", Medium: "#9A7500", Low: "#0F7D5C" }[g.sev];
  const esc = s => String(s).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const date = new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" });
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CredShield Exposure Report — ${esc(exp.identity)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
@page{margin:16mm}
:root{--ink:#141821;--dim:#5A6678;--line:#DCE1E8;--accent:#5B3FD9}
*{box-sizing:border-box}
body{font-family:'IBM Plex Sans',system-ui,sans-serif;color:var(--ink);line-height:1.6;max-width:840px;margin:0 auto;padding:28px 24px;font-size:14px}
h1,h2,h3{font-family:'Space Grotesk',sans-serif;margin:0;letter-spacing:-.02em}
h1{font-size:29px}
h2{font-size:18px;margin:34px 0 12px;padding-bottom:7px;border-bottom:2px solid var(--ink)}
h3{font-size:15px;margin:0 0 6px}
.mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}
.meta{color:var(--dim);font-size:13px;margin:6px 0 24px}
.band{display:flex;align-items:center;gap:20px;border:1px solid var(--line);border-left:6px solid ${hex};border-radius:10px;padding:18px 22px;margin-bottom:22px}
.band .score{font-family:'IBM Plex Mono',monospace;font-size:44px;font-weight:600;color:${hex};line-height:1}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:16px 0}
.stat{border:1px solid var(--line);border-radius:8px;padding:12px;text-align:center}
.stat b{display:block;font-family:'IBM Plex Mono',monospace;font-size:22px}
.stat span{font-size:12px;color:var(--dim)}
table{width:100%;border-collapse:collapse;margin:10px 0;font-size:12.5px}
th,td{border:1px solid var(--line);padding:7px 9px;text-align:left;vertical-align:top}
th{background:#F4F6F9;font-weight:600}
.task{border:1px solid var(--line);border-left:5px solid #999;border-radius:9px;padding:14px 16px;margin-bottom:11px;page-break-inside:avoid}
.p0{border-left-color:#D3341F}.p1{border-left-color:#C25A00}.p2{border-left-color:#9A7500}.p3{border-left-color:#3C5BC7}
.tag{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:4px;padding:2px 7px;margin:0 5px 5px 0;color:var(--dim)}
.why{font-size:13px;color:#41505F;margin:7px 0}
ol{margin:9px 0 0 19px;padding:0}li{margin-bottom:5px;font-size:13px}
.foot{margin-top:36px;padding-top:14px;border-top:1px solid var(--line);font-size:12px;color:var(--dim)}
@media print{body{padding:0}}
</style></head><body>
<h1>Credential exposure report</h1>
<div class="meta"><span class="mono">${esc(exp.identity)}</span> &nbsp;·&nbsp; generated ${esc(date)} &nbsp;·&nbsp; CredShield by UltEnterprise</div>

<div class="band">
  <div><div class="score">${exp.score}</div><div style="font-size:12px;color:var(--dim)">of 100</div></div>
  <div><h3>${g.label} risk — ${esc(g.action)}</h3>
  <div style="font-size:13px;color:var(--dim)">Oldest finding has been circulating for <strong class="mono">${exp.oldestDays}</strong> days.</div></div>
</div>

<div class="grid">
<div class="stat"><b>${exp.records.length}</b><span>Exposure records</span></div>
<div class="stat"><b>${exp.plainCount}</b><span>Plaintext passwords</span></div>
<div class="stat"><b>${exp.sessionCount}</b><span>Session tokens</span></div>
<div class="stat"><b>${exp.activeCount}</b><span>Live listings</span></div>
</div>

<h2>1 · Exposure records</h2>
<table><thead><tr><th>ID</th><th>Account</th><th>Source</th><th>First seen</th><th>Days exposed</th><th>Storage</th><th>Status</th></tr></thead><tbody>
${exp.records.map(r => `<tr><td class="mono">${esc(r.id)}</td><td class="mono">${esc(r.account)}</td>
<td>${esc(r.breach.name)}</td><td>${esc(r.firstSeen)}</td><td class="mono">${r.daysExposed}</td>
<td>${esc(r.hash.algo)}<br><small>Crack: ${esc(r.hash.crackable)}</small></td>
<td>${r.stillListed ? "<strong>LIVE</strong>" : "Archived"}</td></tr>`).join("")}
</tbody></table>

<h3>Data classes exposed</h3>
<table><thead><tr><th>Record</th><th>Classes</th><th>Distribution</th><th>Reuse</th></tr></thead><tbody>
${exp.records.map(r => `<tr><td class="mono">${esc(r.id)}</td><td>${r.classes.map(c => esc(c.label)).join(", ")}</td>
<td>${esc(r.channel)}</td><td class="mono">${r.reuseCount}×</td></tr>`).join("")}
</tbody></table>

<h2>2 · Remediation plan</h2>
${tasks.map(t => `<div class="task ${t.priority.toLowerCase()}">
<h3>${esc(t.priority)} — ${esc(t.title)}</h3>
<div><span class="tag">${esc(t.window)}</span><span class="tag">${esc(t.owner)}</span><span class="tag mono">${esc(t.id)}</span></div>
<p class="why">${esc(t.why)}</p><ol>${t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>`).join("")}

<h2>3 · Regulatory mapping</h2>
<table><thead><tr><th>Framework</th><th>Reference</th><th>Obligation</th><th>Clock</th></tr></thead><tbody>
${compliance.map(c => `<tr><td>${esc(c.framework)}</td><td class="mono">${esc(c.ref)}</td>
<td><strong>${esc(c.title)}</strong><br><small>${esc(c.detail)}</small><br><small><em>Evidence: ${esc(c.evidence)}</em></small></td>
<td>${esc(c.clock)}</td></tr>`).join("")}
</tbody></table>

<div class="foot"><strong>Demonstration build.</strong> Exposure records in this report are generated locally for demonstration
and do not represent real breach data. Passwords are never displayed in full — only the storage method and structural pattern.
Regulatory references are a starting point for assessment, not legal advice; confirm applicability with your compliance function.
<br><br>Report ID <span class="mono">CS-${seedOf(exp.identity + exp.scannedAt).toString(36).slice(0, 8).toUpperCase()}</span></div>
</body></html>`;
}
function downloadReport(exp, tasks, compliance) {
  const blob = new Blob([buildReportHTML(exp, tasks, compliance)], { type: "text/html" });
  const url = URL.createObjectURL(blob), a = document.createElement("a");
  a.href = url; a.download = `CredShield-${exp.identity.replace(/[^a-z0-9]/gi, "-")}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function printReport(exp, tasks, compliance) {
  const w = window.open("", "_blank"); if (!w) return false;
  w.document.write(buildReportHTML(exp, tasks, compliance)); w.document.close();
  setTimeout(() => w.print(), 500); return true;
}

// ══ record card ══════════════════════════════════════════════
function RecordCard({ rec, open, onToggle, isNew }) {
  const lvl = rec.severity >= 5 ? "Critical" : rec.severity >= 4 ? "High" : rec.severity >= 3 ? "Medium" : "Low";
  const tone = sevVar(lvl);
  return (
    <div className={`panel sev sev-${lvl.toLowerCase()}`} style={{ padding: 0, marginBottom: 9, overflow: "hidden" }}>
      <button onClick={onToggle} aria-expanded={open}
        style={{ width: "100%", background: "transparent", border: "none", padding: "14px 16px", cursor: "pointer", textAlign: "left", color: "inherit" }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
              <span className="mono t-sm" style={{ fontWeight: 600, wordBreak: "break-all" }}>{rec.account}</span>
              {isNew && <Chip tone="var(--brand)">NEW</Chip>}
              {rec.stillListed
                ? <Chip tone="var(--s1)" icon={<I.alert size={11} />}>Live listing</Chip>
                : <Chip tone="var(--dim)">Archived</Chip>}
            </div>
            <div className="t-xs dim" style={{ marginBottom: 8 }}>
              {rec.breach.name} · first seen {rec.firstSeen} · {rec.classes.length} data classes
            </div>
            <AgeSpine days={rec.daysExposed} tone={tone} label={false} />
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <SevChip level={lvl} />
            <div className="t-xs mute num" style={{ marginTop: 6 }}>{rec.confidence}% conf</div>
            <div className="t-xs" style={{ color: tone, marginTop: 4 }}>{open ? "Hide" : "Detail"}</div>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--line)" }}>
          <div className="row" style={{ gap: 10, marginTop: 13, marginBottom: 13, padding: "10px 13px", background: "var(--ink-900)", borderRadius: 10 }}>
            <I.clock size={17} stroke={tone} />
            <div style={{ flex: 1 }}>
              <div className="t-sm" style={{ fontWeight: 600 }}>
                Circulating for <span className="num" style={{ color: tone }}>{rec.daysExposed}</span> days
              </div>
              <div className="t-xs dim">Every day this stays live is another day the credential can be bought.</div>
            </div>
          </div>

          <div className="g2" style={{ gap: 16 }}>
            <div>
              <div className="t-xs dim" style={{ marginBottom: 8, fontWeight: 600 }}>DATA EXPOSED</div>
              {rec.classes.map(cl => {
                const l = cl.severity >= 5 ? "Critical" : cl.severity >= 4 ? "High" : cl.severity >= 3 ? "Medium" : "Low";
                return (
                  <div key={cl.id} className="row" style={{ gap: 9, padding: "7px 10px", marginBottom: 5, background: "var(--ink-900)", borderRadius: 7 }}>
                    <span className="sev-glyph" style={{ color: sevVar(l) }} aria-hidden="true">{SEV[l].glyph}</span>
                    <span className="t-xs" style={{ flex: 1 }}>{cl.label}</span>
                    <span className="t-xs" style={{ color: sevVar(l) }}>{l}</span>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="t-xs dim" style={{ marginBottom: 8, fontWeight: 600 }}>TECHNICAL DETAIL</div>
              {[["Record ID", rec.id], ["Breach vector", rec.breach.vector], ["Breach scale", rec.breach.records],
              ["Distribution", rec.channel], ["Password storage", rec.hash.algo], ["Time to crack", rec.hash.crackable],
              ["Password pattern", rec.pwPattern.pattern], ["Masked preview", rec.pwPattern.example],
              ["Reuse across sources", `${rec.reuseCount}×`], ["Business unit", rec.department]].map(([k, v]) => (
                <div key={k} className="row" style={{ justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid var(--line)", gap: 10 }}>
                  <span className="t-xs dim">{k}</span>
                  <span className="t-xs mono" style={{ textAlign: "right" }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "11px 14px", background: `${tone}12`, border: `1px solid ${tone}38`, borderRadius: 10 }}>
            <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
              <I.alert size={15} stroke={tone} style={{ marginTop: 2 }} />
              <div>
                <div className="t-xs" style={{ color: tone, fontWeight: 700, marginBottom: 3 }}>IMMEDIATE ACTION</div>
                <div className="t-sm">
                  {rec.classes.some(c => c.id === "session")
                    ? "Revoke sessions and rotate the signing key — a password reset alone will not close this."
                    : rec.classes.some(c => c.id === "pw_plain")
                      ? "Reset this password out-of-band and block the leaked string at the reset form."
                      : rec.hash.risk >= 4
                        ? "Treat the hash as recoverable. Reset the password and migrate storage to Argon2id."
                        : "Monitor for reuse and enforce a unique password at next rotation."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══ remediation ══════════════════════════════════════════════
function RemediationReport({ exp, tasks }) {
  const [done, setDone] = useState({});
  const completed = Object.values(done).filter(Boolean).length;
  const pct = Math.round((completed / tasks.length) * 100);
  const groups = ["P0", "P1", "P2", "P3"].map(p => ({ p, items: tasks.filter(t => t.priority === p) })).filter(g => g.items.length);
  const legend = { P0: "Same day — exploitation is possible right now", P1: "This week — closes the underlying weakness", P2: "This month — reduces recurrence", P3: "This quarter — governance and assurance" };

  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <div className="row stack-sm" style={{ justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
          <div>
            <h3 className="t-md">Remediation plan</h3>
            <div className="t-xs dim" style={{ marginTop: 3 }}>
              {tasks.length} actions for <span className="mono">{exp.identity}</span>, ordered by how fast each closes real risk
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 26, fontWeight: 700, color: pct === 100 ? "var(--s4)" : "var(--brand)" }}>{pct}%</div>
            <div className="t-xs dim">{completed} of {tasks.length} done</div>
          </div>
        </div>
        <Meter value={pct} tone={pct === 100 ? "var(--s4)" : "var(--brand)"} h={6} />
      </div>

      {groups.map(g => {
        const tone = sevVar(g.items[0].sev);
        return (
          <div key={g.p} style={{ marginBottom: 20 }}>
            <div className="row" style={{ gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span className="chip num" style={{ color: tone, borderColor: tone, background: tone + "16", fontWeight: 700, padding: "4px 10px" }}>{g.p}</span>
              <span className="t-sm dim">{legend[g.p]}</span>
            </div>
            {g.items.map(t => (
              <div key={t.id} className={`panel sev sev-${t.sev.toLowerCase()}`} style={{ marginBottom: 9 }}>
                <div className="row" style={{ gap: 13, alignItems: "flex-start" }}>
                  <button onClick={() => setDone(d => ({ ...d, [t.id]: !d[t.id] }))}
                    aria-pressed={!!done[t.id]} aria-label={`Mark ${t.title} complete`}
                    style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 2, cursor: "pointer",
                      border: `1.5px solid ${done[t.id] ? "var(--s4)" : "var(--line-hi)"}`,
                      background: done[t.id] ? "var(--s4)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                    }}>
                    {done[t.id] && <I.check size={13} stroke="#06120D" />}
                  </button>

                  <div style={{ flex: 1, minWidth: 0, opacity: done[t.id] ? .45 : 1, transition: "opacity .2s" }}>
                    <div className="row" style={{ gap: 12, alignItems: "flex-start", marginBottom: 8 }}>
                      <div style={{ flex: 1 }}>
                        <h3 className="t-base" style={{ textDecoration: done[t.id] ? "line-through" : "none", marginBottom: 6 }}>{t.title}</h3>
                        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                          <Chip tone={tone} icon={<I.clock size={11} />}>{t.window}</Chip>
                          <Chip tone="var(--dim)">{t.owner}</Chip>
                          <Chip tone="var(--mute)">{t.id}</Chip>
                        </div>
                      </div>
                      <ClockRing hours={t.hours} tone={tone} size={44} />
                    </div>
                    <p className="t-sm dim" style={{ margin: "0 0 11px" }}>{t.why}</p>
                    <ol className="panel-sunk" style={{ margin: 0, paddingLeft: 32, listStyle: "none", counterReset: "s" }}>
                      {t.steps.map((s, i) => (
                        <li key={i} style={{ position: "relative", marginBottom: i === t.steps.length - 1 ? 0 : 7 }}>
                          <span className="num t-xs" style={{ position: "absolute", left: -22, top: 1, color: tone }}>{String(i + 1).padStart(2, "0")}</span>
                          <span className="t-sm">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ══ compliance view ══════════════════════════════════════════
function ComplianceView({ items }) {
  if (!items.length) return (
    <div className="panel" style={{ textAlign: "center", padding: "40px 24px" }}>
      <I.scale size={26} stroke="var(--dim)" style={{ margin: "0 auto 12px" }} />
      <h3 className="t-base">No regulatory obligations triggered</h3>
      <p className="t-sm dim" style={{ margin: "5px 0 0" }}>This exposure level does not meet the thresholds mapped here.</p>
    </div>
  );
  const byFw = items.reduce((m, i) => { (m[i.framework] ||= []).push(i); return m; }, {});

  return (
    <div>
      <div className="panel" style={{ marginBottom: 16 }}>
        <h3 className="t-md" style={{ marginBottom: 5 }}>Regulatory clocks now running</h3>
        <p className="t-sm dim" style={{ margin: 0 }}>
          {items.length} obligation{items.length === 1 ? "" : "s"} across {Object.keys(byFw).length} frameworks, derived from what
          actually leaked. A starting point for assessment, not legal advice — confirm applicability with your compliance function.
        </p>
      </div>
      {Object.entries(byFw).map(([fw, list]) => (
        <div key={fw} style={{ marginBottom: 20 }}>
          <div className="row" style={{ gap: 10, marginBottom: 10 }}>
            <h3 className="t-sm" style={{ letterSpacing: ".04em" }}>{fw}</h3>
            <span className="t-xs mute">{list.length} obligation{list.length === 1 ? "" : "s"}</span>
            <span style={{ flex: 1, height: 1, background: "var(--line)" }} />
          </div>
          {list.map(c => {
            const tone = sevVar(c.sev);
            return (
              <div key={c.ref + c.title} className={`panel sev sev-${c.sev.toLowerCase()}`} style={{ marginBottom: 9 }}>
                <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
                  <ClockRing hours={c.hours} tone={tone} size={50} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="t-base" style={{ marginBottom: 4 }}>{c.title}</h3>
                    <div className="row" style={{ gap: 6, flexWrap: "wrap", marginBottom: 9 }}>
                      <Chip tone={tone} icon={<I.clock size={11} />}>{c.clock}</Chip>
                      <Chip tone="var(--dim)">{c.ref}</Chip>
                    </div>
                    <p className="t-sm dim" style={{ margin: "0 0 10px" }}>{c.detail}</p>
                    <div className="panel-sunk">
                      <span className="t-xs" style={{ color: tone, fontWeight: 700 }}>EVIDENCE TO RETAIN · </span>
                      <span className="t-xs">{c.evidence}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ══ overview ═════════════════════════════════════════════════
function Overview({ exp, diff }) {
  const g = grade(exp.score), tone = sevVar(g.sev);
  const classTally = useMemo(() => {
    const m = new Map();
    exp.records.forEach(r => r.classes.forEach(c => m.set(c.label, { n: (m.get(c.label)?.n || 0) + 1, sev: c.severity })));
    return [...m.entries()].sort((a, b) => b[1].sev - a[1].sev || b[1].n - a[1].n);
  }, [exp]);
  const deptTally = useMemo(() => {
    const m = new Map();
    exp.records.forEach(r => m.set(r.department, (m.get(r.department) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [exp]);
  const maxDept = Math.max(...deptTally.map(d => d[1]), 1);

  return (
    <div>
      {diff && (
        <div className="panel anim-in" style={{ marginBottom: 16, borderColor: diff.scoreDelta > 0 ? "var(--s1)55" : diff.scoreDelta < 0 ? "var(--s4)55" : "var(--line)" }}>
          <div className="row stack-sm" style={{ gap: 14, flexWrap: "wrap" }}>
            <div>
              <h3 className="t-sm">Change since last scan</h3>
              <div className="t-xs dim" style={{ marginTop: 2 }}>Compared with {fullDate(diff.since)}</div>
            </div>
            <div className="row" style={{ gap: 10, marginLeft: "auto", flexWrap: "wrap" }}>
              {[{ n: `${diff.scoreDelta > 0 ? "+" : ""}${diff.scoreDelta}`, l: "Risk score", t: diff.scoreDelta > 0 ? "var(--s1)" : diff.scoreDelta < 0 ? "var(--s4)" : "var(--dim)", ic: diff.scoreDelta > 0 ? I.up : diff.scoreDelta < 0 ? I.dn : null },
              { n: diff.added.length, l: "New findings", t: diff.added.length ? "var(--s1)" : "var(--dim)" },
              { n: diff.removed.length, l: "Cleared", t: diff.removed.length ? "var(--s4)" : "var(--dim)" }].map(s => (
                <div key={s.l} className="panel-sunk" style={{ textAlign: "center", minWidth: 92 }}>
                  <div className="row num" style={{ justifyContent: "center", gap: 3, fontSize: 19, fontWeight: 700, color: s.t }}>
                    {s.ic && <s.ic size={14} stroke={s.t} />}{s.n}
                  </div>
                  <div className="t-xs dim" style={{ marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="panel" style={{ marginBottom: 16, borderColor: tone + "55" }}>
        <div className="row stack-sm" style={{ gap: 24, alignItems: "center" }}>
          <Dial score={exp.score} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="row" style={{ gap: 9, flexWrap: "wrap", marginBottom: 8 }}>
              <span className="mono t-md" style={{ fontWeight: 600, wordBreak: "break-all" }}>{exp.identity}</span>
              <Chip tone="var(--brand)">{exp.isDomain ? "Domain" : "Identity"}</Chip>
              <SevChip level={g.sev} />
            </div>
            <p className="t-sm dim" style={{ margin: "0 0 12px" }}>
              {exp.records.length} record{exp.records.length === 1 ? "" : "s"} across {new Set(exp.records.map(r => r.breach.name)).size} sources.
              Recommended action: <strong style={{ color: tone }}>{g.action}</strong>.
            </p>

            <div className="panel-sunk" style={{ marginBottom: 12 }}>
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                <span className="t-xs dim">Oldest finding — time in circulation</span>
                <span className="t-sm num" style={{ color: tone, fontWeight: 600 }}>{exp.oldestDays} days</span>
              </div>
              <AgeSpine days={exp.oldestDays} tone={tone} label={false} />
            </div>

            <div className="g4">
              {[{ n: exp.records.length, l: "Records", t: "var(--brand)" },
              { n: exp.plainCount, l: "Plaintext passwords", t: "var(--s1)" },
              { n: exp.sessionCount, l: "Session tokens", t: "var(--s2)" },
              { n: exp.recentCount, l: "Seen in 6 months", t: "var(--s3)" }].map(s => (
                <div key={s.l} className="panel-sunk" style={{ textAlign: "center" }}>
                  <div className="num" style={{ fontSize: 22, fontWeight: 700, color: s.t }}>{s.n}</div>
                  <div className="t-xs dim" style={{ marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="g2">
        <div className="panel">
          <h3 className="t-sm" style={{ marginBottom: 3 }}>What was exposed</h3>
          <p className="t-xs dim" style={{ margin: "0 0 14px" }}>Data classes across all records, most damaging first</p>
          {classTally.map(([label, { n, sev }]) => {
            const l = sev >= 5 ? "Critical" : sev >= 4 ? "High" : sev >= 3 ? "Medium" : "Low";
            return (
              <div key={label} style={{ marginBottom: 11 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
                  <span className="row t-xs" style={{ gap: 7 }}>
                    <span className="sev-glyph" style={{ color: sevVar(l) }} aria-hidden="true">{SEV[l].glyph}</span>
                    {label}
                  </span>
                  <span className="t-xs num" style={{ color: sevVar(l) }}>{n}×</span>
                </div>
                <Meter value={(n / exp.records.length) * 100} tone={sevVar(l)} h={3} />
              </div>
            );
          })}
        </div>

        <div className="panel">
          <h3 className="t-sm" style={{ marginBottom: 3 }}>Where it sits</h3>
          <p className="t-xs dim" style={{ margin: "0 0 14px" }}>Affected accounts by business unit</p>
          {deptTally.map(([dept, n]) => {
            const priv = dept === "Executive" || dept === "IT Admin";
            return (
              <div key={dept} style={{ marginBottom: 11 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 4 }}>
                  <span className="row t-xs" style={{ gap: 6 }}>
                    {priv && <I.lock size={11} stroke="var(--s1)" />}
                    {dept}
                  </span>
                  <span className="t-xs num" style={{ color: priv ? "var(--s1)" : "var(--brand)" }}>{n}</span>
                </div>
                <Meter value={(n / maxDept) * 100} tone={priv ? "var(--s1)" : "var(--brand)"} h={3} />
              </div>
            );
          })}
          <div className="panel-sunk" style={{ marginTop: 14 }}>
            <p className="t-xs dim" style={{ margin: 0 }}>
              Executive and IT Admin exposure is weighted higher — those accounts carry privilege that turns
              a single credential into lateral movement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ public scan ══════════════════════════════════════════════
function PublicScan({ onLead, leads }) {
  const [domain, setDomain] = useState("");
  const [phase, setPhase] = useState("idle");
  const [exp, setExp] = useState(null);
  const [email, setEmail] = useState(""); const [org, setOrg] = useState(""); const [err, setErr] = useState("");

  const run = () => {
    if (!domain.trim()) return;
    setPhase("scanning"); setExp(null); setErr("");
    setTimeout(() => { setExp(buildExposure(domain.trim())); setPhase("teaser"); }, 1500);
  };
  const unlock = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setErr("Enter a valid work email address.");
    if (["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com"].includes(email.split("@")[1]?.toLowerCase()))
      return setErr("Please use your work email — results go to the domain owner.");
    setErr(""); onLead({ email, org, domain: exp.identity, score: exp.score, at: Date.now() }); setPhase("unlocked");
  };

  const g = exp ? grade(exp.score) : null, tone = exp ? sevVar(g.sev) : "var(--brand)";

  return (
    <div>
      <div className="hero" style={{ marginBottom: 20 }}>
        <div className="row" style={{ gap: 8, marginBottom: 16, position: "relative", zIndex: 1 }}>
          <Pulse tone="var(--s4)" size={6} />
          <span className="t-xs" style={{ color: "var(--s4)", fontWeight: 600 }}>Free — no account needed</span>
        </div>
        <h1 style={{ fontSize: "clamp(26px,5vw,44px)", lineHeight: 1.08, maxWidth: 660, marginBottom: 14, position: "relative", zIndex: 1 }}>
          Your credentials have been circulating for a while.
        </h1>
        <p className="dim" style={{ fontSize: 15, maxWidth: 560, margin: "0 0 26px", position: "relative", zIndex: 1 }}>
          Enter your company domain. We check circulating breach dumps, stealer logs and Telegram listings,
          then show you exactly what is out there — and how long it has been.
        </p>

        <div className="row stack-sm" style={{ gap: 10, maxWidth: 600, position: "relative", zIndex: 1 }}>
          <label htmlFor="cs-dom" style={{ position: "absolute", left: -9999 }}>Company domain</label>
          <input id="cs-dom" className="field mono full-sm" value={domain} onChange={e => setDomain(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run()} placeholder="@yourcompany.com"
            style={{ flex: 1, fontSize: 15, padding: "14px 16px" }} />
          <button className="btn btn-primary full-sm" onClick={run} disabled={phase === "scanning"} style={{ padding: "14px 26px", fontSize: 14 }}>
            <I.search size={15} />{phase === "scanning" ? "Scanning…" : "Scan free"}
          </button>
        </div>

        <div className="row" style={{ gap: 26, marginTop: 24, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {[["14.7B", "credentials indexed"], ["48,200", "channels monitored"], ["38ms", "median lookup"]].map(([n, l]) => (
            <div key={l}>
              <div className="num" style={{ fontSize: 21, fontWeight: 700, color: "#B7A4FF" }}>{n}</div>
              <div className="t-xs dim">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {phase === "scanning" && (
        <div className="panel" style={{ textAlign: "center", padding: "44px 24px" }}>
          <I.clock size={26} stroke="var(--brand)" style={{ margin: "0 auto 14px" }} />
          <div className="t-sm mono" style={{ color: "#B7A4FF", marginBottom: 16 }}>Checking circulating sources…</div>
          <div style={{ maxWidth: 300, margin: "0 auto" }}><Meter value={100} tone="var(--brand)" h={3} /></div>
        </div>
      )}

      {exp && (phase === "teaser" || phase === "unlocked") && (
        <div className="panel anim-in" style={{ marginBottom: 16, borderColor: tone + "55" }}>
          <div className="row stack-sm" style={{ gap: 24, alignItems: "center" }}>
            <Dial score={exp.score} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono t-md" style={{ fontWeight: 600, marginBottom: 8, wordBreak: "break-all" }}>{exp.identity}</div>
              <p className="t-base" style={{ margin: "0 0 14px" }}>
                We found <strong style={{ color: tone }}>{exp.records.length} exposure record{exp.records.length === 1 ? "" : "s"}</strong> across{" "}
                {new Set(exp.records.map(r => r.breach.name)).size} sources. The oldest has been circulating for{" "}
                <strong className="num" style={{ color: tone }}>{exp.oldestDays} days</strong>
                {exp.activeCount > 0 && <>, and <strong style={{ color: "var(--s1)" }}>{exp.activeCount}</strong> {exp.activeCount === 1 ? "listing is" : "listings are"} still live</>}.
              </p>
              <div className="panel-sunk" style={{ marginBottom: 13 }}>
                <AgeSpine days={exp.oldestDays} tone={tone} />
              </div>
              <div className="g4">
                {[{ n: exp.records.length, l: "Records", t: "var(--brand)" },
                { n: phase === "unlocked" ? exp.plainCount : "—", l: "Plaintext passwords", t: "var(--s1)" },
                { n: phase === "unlocked" ? exp.sessionCount : "—", l: "Session tokens", t: "var(--s2)" },
                { n: phase === "unlocked" ? exp.recentCount : "—", l: "Seen in 6 months", t: "var(--s3)" }].map(s => (
                  <div key={s.l} className="panel-sunk" style={{ textAlign: "center" }}>
                    <div className="num" style={{ fontSize: 22, fontWeight: 700, color: s.n === "—" ? "var(--mute)" : s.t }}>{s.n}</div>
                    <div className="t-xs dim" style={{ marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "teaser" && (
        <div className="panel" style={{ borderColor: "var(--brand-line)", background: "linear-gradient(150deg,#7C5CFF0F,var(--ink-800))" }}>
          <div style={{ maxWidth: 500 }}>
            <div className="row" style={{ gap: 9, marginBottom: 8 }}>
              <I.lock size={17} stroke="#B7A4FF" />
              <h3 className="t-md">See the full breakdown</h3>
            </div>
            <p className="t-sm dim" style={{ margin: "0 0 18px" }}>
              The detailed report shows which accounts are affected, exactly what leaked in each record,
              how the passwords were stored, a prioritised remediation plan, and the regulatory clocks
              already running. Enter your work email to unlock it.
            </p>
            <div className="stack" style={{ gap: 10 }}>
              <input className="field mono" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@yourcompany.com" aria-label="Work email"
                style={err ? { borderColor: "var(--s1)" } : undefined} />
              <input className="field" value={org} onChange={e => setOrg(e.target.value)}
                placeholder="Company name (optional)" aria-label="Company name" />
              {err && <div className="row t-xs" style={{ gap: 6, color: "var(--s1)" }}><I.alert size={12} />{err}</div>}
              <button className="btn btn-primary" onClick={unlock} style={{ padding: "13px" }}>Unlock full report</button>
              <p className="t-xs mute" style={{ margin: 0 }}>
                Used to send your report and follow up once. Never shared. Unsubscribe in one click.
              </p>
            </div>
          </div>
        </div>
      )}

      {phase === "unlocked" && exp && <Unlocked exp={exp} />}

      {leads.length > 0 && (
        <div className="panel" style={{ marginTop: 20 }}>
          <h3 className="t-sm" style={{ marginBottom: 3 }}>Captured this session</h3>
          <p className="t-xs dim" style={{ margin: "0 0 12px" }}>
            Every unlock is a named person at a company that just saw its own exposure.
          </p>
          {leads.map((l, i) => (
            <div key={i} className="row panel-sunk" style={{ justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="t-xs mono" style={{ wordBreak: "break-all" }}>{l.email}</div>
                <div className="t-xs mute">{l.org || "—"} · {l.domain}</div>
              </div>
              <SevChip level={grade(l.score).sev} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Unlocked({ exp }) {
  const tasks = useMemo(() => buildRemediation(exp), [exp]);
  const compliance = useMemo(() => mapCompliance(exp), [exp]);
  const [tab, setTab] = useState("records");
  const [openRec, setOpenRec] = useState(null);
  const [warn, setWarn] = useState("");

  return (
    <div className="anim-in">
      <div className="row" style={{ gap: 9, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => downloadReport(exp, tasks, compliance)}><I.down size={15} />Download report</button>
        <button className="btn btn-ghost" onClick={() => setWarn(printReport(exp, tasks, compliance) ? "" : "Pop-up blocked — download the report, then print that file to PDF.")}>
          <I.print size={15} />Save as PDF
        </button>
      </div>
      {warn && <div className="row t-xs" style={{ gap: 6, color: "var(--s3)", marginBottom: 12 }}><I.alert size={12} />{warn}</div>}
      <Tabs tabs={[["records", `Records (${exp.records.length})`], ["remediate", `Remediation (${tasks.length})`], ["compliance", `Compliance (${compliance.length})`]]} value={tab} onChange={setTab} />
      {tab === "records" && exp.records.map(r => <RecordCard key={r.id} rec={r} open={openRec === r.id} onToggle={() => setOpenRec(openRec === r.id ? null : r.id)} />)}
      {tab === "remediate" && <RemediationReport exp={exp} tasks={tasks} />}
      {tab === "compliance" && <ComplianceView items={compliance} />}
    </div>
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" className="navscroll" style={{ background: "var(--ink-800)", padding: 4, borderRadius: 12, border: "1px solid var(--line)", marginBottom: 18 }}>
      {tabs.map(([id, label]) => (
        <button key={id} role="tab" aria-selected={value === id} onClick={() => onChange(id)}
          style={{
            flex: 1, minWidth: 110, background: value === id ? "var(--ink-600)" : "transparent",
            border: `1px solid ${value === id ? "var(--line-hi)" : "transparent"}`, borderRadius: 9,
            padding: "10px 12px", fontSize: 13, fontWeight: 600,
            color: value === id ? "#B7A4FF" : "var(--dim)", cursor: "pointer",
          }}>{label}</button>
      ))}
    </div>
  );
}

// ══ institution monitor ══════════════════════════════════════
function MonitorScreen() {
  const [region, setRegion] = useState("All regions");
  const [range, setRange] = useState(DATE_RANGES[2]);
  const [severity, setSeverity] = useState("All severities");
  const [selected, setSelected] = useState(null);
  const [live, setLive] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => { if (!live) return; const id = setInterval(() => setTick(t => t + 1), 6000); return () => clearInterval(id); }, [live]);

  const banks = useMemo(() => region === "All regions" ? INSTITUTIONS : INSTITUTIONS.filter(i => i.region === region), [region]);
  const profiles = useMemo(() => banks.map(b => ({ inst: b, ...bankProfile(b, range.days) })).sort((a, b) => b.risk - a.risk), [banks, range]);
  const events = useMemo(() => {
    const all = makeEvents(banks, range.days, 40 + tick);
    return severity === "All severities" ? all : all.filter(e => e.severity === severity);
  }, [banks, range, severity, tick]);

  const totals = useMemo(() => ({
    exposed: profiles.reduce((s, p) => s + p.exposedAccounts, 0),
    listings: profiles.reduce((s, p) => s + p.activeListings, 0),
    blocked: profiles.reduce((s, p) => s + p.blockedLogins, 0),
    critical: events.filter(e => e.severity === "Critical").length,
  }), [profiles, events]);

  const detail = selected ? profiles.find(p => p.inst.id === selected) : null;
  const detailEvents = selected ? events.filter(e => e.inst.id === selected) : [];

  return (
    <div>
      <div className="row" style={{ gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <Select label="Region" value={region} options={REGIONS} onChange={setRegion} width={150} />
        <Select label="Date range" value={range.label} options={DATE_RANGES} onChange={setRange} width={170} />
        <Select label="Severity" value={severity} options={SEVERITIES} onChange={setSeverity} width={155} />
        <Select label="Institution" width={215}
          value={selected ? INSTITUTIONS.find(i => i.id === selected).name : "All institutions"}
          options={["All institutions", ...banks.map(b => b.name)]}
          onChange={v => setSelected(v === "All institutions" ? null : INSTITUTIONS.find(i => i.name === v)?.id)} />
        <button className="btn btn-ghost" onClick={() => setLive(!live)} aria-pressed={live}
          style={{ borderColor: live ? "var(--s4)66" : "var(--line-hi)", color: live ? "var(--s4)" : "var(--dim)" }}>
          {live ? <Pulse tone="var(--s4)" size={6} /> : <I.clock size={14} />}
          {live ? "Live" : "Paused"}
        </button>
      </div>

      <div className="g4" style={{ marginBottom: 16 }}>
        {[{ l: "Accounts exposed", v: totals.exposed.toLocaleString(), t: "var(--s1)", s: `${profiles.length} institutions` },
        { l: "Live listings", v: totals.listings.toLocaleString(), t: "var(--s2)", s: "still circulating" },
        { l: "Logins blocked", v: totals.blocked.toLocaleString(), t: "var(--s4)", s: "by exposure check" },
        { l: "Critical events", v: totals.critical, t: "var(--brand)", s: range.label.toLowerCase() }].map(s => (
          <div key={s.l} className="panel" style={{ padding: "15px 16px" }}>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div className="num" style={{ fontSize: 23, fontWeight: 700, color: s.t, lineHeight: 1.1 }}>{s.v}</div>
                <div className="t-xs" style={{ marginTop: 5 }}>{s.l}</div>
                <div className="t-xs mute">{s.s}</div>
              </div>
              <div className="hide-sm"><Spark seed={seedOf(s.l + range.days)} tone={s.t} /></div>
            </div>
          </div>
        ))}
      </div>

      <div className="panel" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h3 className="t-md">Threat activity over time</h3>
          <p className="t-xs dim" style={{ margin: "3px 0 0" }}>{events.length} events · {region} · {range.label.toLowerCase()}</p>
        </div>
        <TimelineChart events={events} days={range.days} />
      </div>

      <div className="g2">
        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)" }}>
            <h3 className="t-md">Institutions by risk</h3>
            <p className="t-xs dim" style={{ margin: "3px 0 0" }}>Select one to open its profile</p>
          </div>
          <div style={{ maxHeight: 470, overflowY: "auto" }}>
            {profiles.map(p => (
              <button key={p.inst.id} className="rowitem" aria-selected={selected === p.inst.id}
                onClick={() => setSelected(selected === p.inst.id ? null : p.inst.id)}>
                <span style={{
                  width: 36, height: 36, borderRadius: 9, background: p.inst.brand + "22",
                  border: `1px solid ${p.inst.brand}55`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color: p.inst.brand, flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace",
                }}>{p.inst.id}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="t-sm" style={{ fontWeight: 600, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text)" }}>{p.inst.name}</span>
                  <span className="t-xs dim" style={{ display: "block" }}>{p.inst.region} · {p.exposedAccounts.toLocaleString()} exposed · dwell {p.dwellDays}d</span>
                </span>
                <span style={{ width: 54, flexShrink: 0 }} className="hide-sm"><Meter value={p.risk} tone={riskVar(p.risk)} h={4} /></span>
                <span className="num t-sm" style={{ width: 26, textAlign: "right", color: riskVar(p.risk), fontWeight: 700, flexShrink: 0 }}>{p.risk}</span>
                <span className="row num t-xs" style={{ width: 46, justifyContent: "flex-end", gap: 2, color: p.trend === "up" ? "var(--s1)" : "var(--s4)", flexShrink: 0 }}>
                  {p.trend === "up" ? <I.up size={11} /> : <I.dn size={11} />}{p.trendPct}%
                </span>
              </button>
            ))}
          </div>
        </div>

        <div>
          {detail ? (
            <div className="panel anim-in" style={{ marginBottom: 14, borderColor: detail.inst.brand + "4D" }}>
              <div className="row" style={{ gap: 14, alignItems: "flex-start", marginBottom: 16 }}>
                <span style={{
                  width: 48, height: 48, borderRadius: 11, background: detail.inst.brand + "22",
                  border: `1px solid ${detail.inst.brand}66`, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: detail.inst.brand, flexShrink: 0, fontFamily: "'IBM Plex Mono',monospace",
                }}>{detail.inst.id}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="t-md">{detail.inst.name}</h3>
                  <div className="t-xs dim" style={{ marginTop: 2 }}>{detail.inst.region} · {detail.inst.tier} · {detail.inst.accounts} accounts</div>
                  <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                    {detail.inst.domains.map(d => <Chip key={d} tone="var(--brand)">{d}</Chip>)}
                  </div>
                </div>
                <Dial score={detail.risk} size={78} />
              </div>

              <div className="panel-sunk" style={{ marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
                  <span className="t-xs dim">Mean dwell time before detection</span>
                  <span className="t-sm num" style={{ color: riskVar(detail.risk), fontWeight: 600 }}>{detail.dwellDays} days</span>
                </div>
                <AgeSpine days={detail.dwellDays} max={120} tone={riskVar(detail.risk)} label={false} />
              </div>

              <div className="g3">
                {[{ n: detail.exposedAccounts.toLocaleString(), l: "Exposed", t: "var(--s1)" },
                { n: detail.activeListings, l: "Live listings", t: "var(--s2)" },
                { n: detail.execTargeted, l: "Execs targeted", t: "var(--s2)" },
                { n: detail.blockedLogins.toLocaleString(), l: "Blocked", t: "var(--s4)" },
                { n: detail.iocsShared.toLocaleString(), l: "IOCs shared", t: "var(--brand)" },
                { n: `${detail.trend === "up" ? "+" : "−"}${detail.trendPct}%`, l: "Trend", t: detail.trend === "up" ? "var(--s1)" : "var(--s4)" }].map(s => (
                  <div key={s.l} className="panel-sunk" style={{ textAlign: "center" }}>
                    <div className="num" style={{ fontSize: 16, fontWeight: 700, color: s.t }}>{s.n}</div>
                    <div className="t-xs dim" style={{ marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="panel" style={{ marginBottom: 14, textAlign: "center", padding: "30px 22px" }}>
              <I.bank size={24} stroke="var(--dim)" style={{ margin: "0 auto 10px" }} />
              <h3 className="t-sm">No institution selected</h3>
              <p className="t-xs dim" style={{ margin: "4px 0 0" }}>Pick one from the table or the dropdown.</p>
            </div>
          )}

          <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
            <div className="row" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
              <div>
                <h3 className="t-sm">{detail ? `${detail.inst.name} events` : "All events"}</h3>
                <p className="t-xs dim" style={{ margin: "2px 0 0" }}>{(detail ? detailEvents : events).length} in {range.label.toLowerCase()}</p>
              </div>
              {live && <Pulse tone="var(--s1)" size={6} />}
            </div>
            <div style={{ maxHeight: detail ? 260 : 470, overflowY: "auto" }}>
              {(detail ? detailEvents : events).slice(0, 30).map(e => (
                <div key={e.id} className={`sev sev-${e.severity.toLowerCase()}`} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
                  <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t-sm" style={{ fontWeight: 600 }}>{e.type}</div>
                      <div className="t-xs dim" style={{ marginTop: 3 }}>{e.inst.name} · {e.accounts.toLocaleString()} accounts · {e.iocs} IOCs</div>
                      <div className="t-xs mute mono" style={{ marginTop: 2 }}>{e.id} · {fullDate(e.ts)}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <SevChip level={e.severity} />
                      <div className="t-xs" style={{ marginTop: 5, color: e.status === "Active" ? "var(--s1)" : e.status === "Investigating" ? "var(--s3)" : "var(--s4)" }}>{e.status}</div>
                      <div className="t-xs mute num" style={{ marginTop: 2 }}>{timeAgo(e.ts)} ago</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ══ lookup ═══════════════════════════════════════════════════
function LookupScreen({ history, setHistory, alertRules, onAlert }) {
  const [query, setQuery] = useState(""); const [exp, setExp] = useState(null);
  const [diff, setDiff] = useState(null); const [tasks, setTasks] = useState([]);
  const [compliance, setCompliance] = useState([]); const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(""); const [tab, setTab] = useState("overview");
  const [openRec, setOpenRec] = useState(null); const [warn, setWarn] = useState("");

  const run = useCallback((v, rescan) => {
    const target = (v ?? query).trim(); if (!target) return;
    setLoading(true); setExp(null); setDiff(null); setTab("overview"); setOpenRec(null); setWarn("");
    ["Querying breach index…", "Scanning dark web listings…", "Checking Telegram channels…", "Correlating stealer logs…", "Building remediation plan…"]
      .forEach((s, i) => setTimeout(() => setStage(s), i * 300));
    setTimeout(() => {
      const prior = history.filter(h => h.identity.toLowerCase() === target.toLowerCase());
      const e = buildExposure(target, rescan ? prior.length + 1 : 0);
      const d = diffScans(prior[prior.length - 1], e);
      setExp(e); setDiff(d); setTasks(buildRemediation(e)); setCompliance(mapCompliance(e));
      setHistory(h => [...h, e].slice(-20)); setLoading(false); setStage("");
      const fired = alertRules.filter(r => r.enabled && e.score >= r.threshold);
      if (fired.length) onAlert({ identity: target, score: e.score, rules: fired.map(f => f.channel), at: Date.now() });
    }, 1600);
  }, [query, history, setHistory, alertRules, onAlert]);

  const priorCount = exp ? history.filter(h => h.identity.toLowerCase() === exp.identity.toLowerCase()).length : 0;

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 className="t-lg" style={{ marginBottom: 6 }}>Check an email or domain</h2>
        <p className="t-sm dim" style={{ margin: "0 0 16px", maxWidth: 620 }}>
          Every record held for that identity — what leaked, how long it has been circulating, how it was stored —
          then a plan that closes each finding.
        </p>
        <div className="row stack-sm" style={{ gap: 10 }}>
          <label htmlFor="cs-q" style={{ position: "absolute", left: -9999 }}>Email or domain</label>
          <input id="cs-q" className="field mono full-sm" value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run()} placeholder="name@company.com  ·  @company.com" style={{ flex: 1 }} />
          <button className="btn btn-primary full-sm" onClick={() => run()} disabled={loading}>
            <I.search size={15} />{loading ? "Scanning…" : "Scan"}
          </button>
        </div>
        <div className="row" style={{ gap: 7, marginTop: 12, flexWrap: "wrap" }}>
          <span className="t-xs mute">Try:</span>
          {["@barclays.co.uk", "@aexp.com", "@gtbank.com", "@jpmchase.com"].map(s => (
            <button key={s} className="chip mono" onClick={() => { setQuery(s); run(s); }}
              style={{ color: "var(--dim)", borderColor: "var(--line-hi)", background: "transparent", cursor: "pointer", padding: "4px 9px" }}>{s}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="panel" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div className="t-sm mono" style={{ color: "#B7A4FF", marginBottom: 16 }}>{stage}</div>
          <div style={{ maxWidth: 300, margin: "0 auto" }}><Meter value={100} tone="var(--brand)" h={3} /></div>
        </div>
      )}

      {exp && !loading && (
        <>
          <div className="row" style={{ gap: 9, marginBottom: 16, flexWrap: "wrap" }}>
            <button className="btn btn-primary" onClick={() => downloadReport(exp, tasks, compliance)}><I.down size={15} />Download report</button>
            <button className="btn btn-ghost" onClick={() => setWarn(printReport(exp, tasks, compliance) ? "" : "Pop-up blocked — download the report, then print that file to PDF.")}>
              <I.print size={15} />Save as PDF
            </button>
            <button className="btn btn-ghost" onClick={() => run(exp.identity, true)}><I.refresh size={15} />Re-scan</button>
            {priorCount > 1 && <span className="t-xs mute num">{priorCount} scans on record</span>}
          </div>
          {warn && <div className="row t-xs" style={{ gap: 6, color: "var(--s3)", marginBottom: 12 }}><I.alert size={12} />{warn}</div>}

          <Tabs value={tab} onChange={setTab} tabs={[
            ["overview", "Overview"], ["records", `Records (${exp.records.length})`],
            ["remediate", `Remediation (${tasks.length})`], ["compliance", `Compliance (${compliance.length})`],
          ]} />

          {tab === "overview" && <Overview exp={exp} diff={diff} />}
          {tab === "records" && (
            <div>
              <p className="t-xs dim" style={{ margin: "0 0 14px" }}>
                Open any record for the full breakdown. Findings marked NEW appeared since your last scan.
              </p>
              {exp.records.map(r => (
                <RecordCard key={r.id} rec={r} open={openRec === r.id} isNew={diff?.added.some(a => a.id === r.id)}
                  onToggle={() => setOpenRec(openRec === r.id ? null : r.id)} />
              ))}
            </div>
          )}
          {tab === "remediate" && <RemediationReport exp={exp} tasks={tasks} />}
          {tab === "compliance" && <ComplianceView items={compliance} />}
        </>
      )}

      {!exp && !loading && (
        <div className="panel" style={{ textAlign: "center", padding: "48px 30px" }}>
          <I.search size={28} stroke="var(--dim)" style={{ margin: "0 auto 14px" }} />
          <h3 className="t-base">Nothing scanned yet</h3>
          <p className="t-sm dim" style={{ margin: "6px auto 0", maxWidth: 400 }}>
            Enter a single address to check one person, or a domain to see exposure across a whole organisation.
          </p>
        </div>
      )}
    </div>
  );
}

// ══ integrations ═════════════════════════════════════════════
const DATA_SOURCES = [
  { name: "Have I Been Pwned", status: "Ready to connect", tone: "var(--s4)", cost: "£3.50/mo",
    what: "Breach corpus covering 14bn+ accounts. Domain search requires ownership verification, which also keeps you on the right side of the law.",
    code: `// Server-side only — never expose the key to the browser
const res = await fetch(
  \`https://haveibeenpwned.com/api/v3/breacheddomain/\${domain}\`,
  { headers: {
      "hibp-api-key": process.env.HIBP_KEY,
      "user-agent": "CredShield"
  }}
);
const breaches = await res.json();` },
  { name: "HIBP Pwned Passwords", status: "Ready to connect", tone: "var(--s4)", cost: "Free",
    what: "k-anonymity range API. Send the first five characters of a SHA-1 hash, get back matching suffixes. The password never leaves your server.",
    code: `const sha1 = hashSHA1(password).toUpperCase();
const prefix = sha1.slice(0, 5), suffix = sha1.slice(5);
const res = await fetch(
  \`https://api.pwnedpasswords.com/range/\${prefix}\`
);
const found = (await res.text())
  .split("\\n")
  .some(line => line.startsWith(suffix));` },
  { name: "Intelligence X", status: "Evaluate", tone: "var(--s3)", cost: "From €30/mo",
    what: "Paste sites, leaks and darknet index with a documented API. Useful as a corroborating second source once HIBP is live.",
    code: `POST https://2.intelx.io/intelligent/search
x-key: <API_KEY>
{ "term": "@company.com", "maxresults": 100,
  "media": 0, "sort": 4 }` },
  { name: "Your own collection", status: "Long term", tone: "var(--brand)", cost: "Engineering time",
    what: "Only worth building once you have paying customers. Collect only what is lawful where you operate, keep provenance for every record, and take legal advice before touching closed sources.",
    code: `// Store provenance with every record so findings
// stand up in an audit:
{ identity_hash, source_type, first_seen,
  collection_method, legal_basis, retention_until }` },
];

function IntegrationsScreen({ alertRules, setAlertRules, alertLog, leads }) {
  const [openSrc, setOpenSrc] = useState(null);
  const [webhook, setWebhook] = useState("https://hooks.slack.com/services/…");
  const toggle = i => setAlertRules(rs => rs.map((r, x) => x === i ? { ...r, enabled: !r.enabled } : r));
  const setTh = (i, v) => setAlertRules(rs => rs.map((r, x) => x === i ? { ...r, threshold: v } : r));

  return (
    <div>
      <h2 className="t-lg" style={{ marginBottom: 6 }}>Integrations and alerting</h2>
      <p className="t-sm dim" style={{ margin: "0 0 22px", maxWidth: 640 }}>
        Where real breach data plugs in, and how findings reach the people who act on them.
      </p>

      <div className="g2" style={{ marginBottom: 20 }}>
        <div className="panel">
          <h3 className="t-md" style={{ marginBottom: 3 }}>Alert rules</h3>
          <p className="t-xs dim" style={{ margin: "0 0 16px" }}>
            Fires when a scan crosses the threshold. Run a scan on Exposure Lookup to see it trigger.
          </p>
          {alertRules.map((r, i) => (
            <div key={r.channel} style={{ padding: "13px 0", borderBottom: "1px solid var(--line)" }}>
              <div className="row" style={{ justifyContent: "space-between", gap: 12, marginBottom: r.enabled ? 10 : 0 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="t-sm" style={{ fontWeight: 600 }}>{r.channel}</div>
                  <div className="t-xs dim">{r.detail}</div>
                </div>
                <button onClick={() => toggle(i)} role="switch" aria-checked={r.enabled} aria-label={`Toggle ${r.channel}`}
                  style={{
                    width: 44, height: 24, borderRadius: 12, cursor: "pointer", flexShrink: 0, padding: 0,
                    background: r.enabled ? "var(--s4)" : "var(--line-hi)", position: "relative",
                    border: "none", transition: "background .25s",
                  }}>
                  <span style={{
                    position: "absolute", top: 3, left: r.enabled ? 23 : 3, width: 18, height: 18,
                    borderRadius: 9, background: "#fff", transition: "left .25s", boxShadow: "0 1px 3px #0007",
                  }} />
                </button>
              </div>
              {r.enabled && (
                <div className="row" style={{ gap: 11 }}>
                  <span className="t-xs dim" style={{ whiteSpace: "nowrap" }}>Risk ≥</span>
                  <input type="range" min={10} max={95} value={r.threshold} aria-label={`${r.channel} threshold`}
                    onChange={e => setTh(i, +e.target.value)} style={{ flex: 1, accentColor: "#7C5CFF" }} />
                  <span className="num t-sm" style={{ width: 26, fontWeight: 700, color: sevVar(grade(r.threshold).sev) }}>{r.threshold}</span>
                </div>
              )}
            </div>
          ))}
          <div style={{ marginTop: 14 }}>
            <label className="t-xs dim" htmlFor="cs-wh" style={{ display: "block", marginBottom: 6 }}>Slack webhook URL</label>
            <input id="cs-wh" className="field mono t-xs" value={webhook} onChange={e => setWebhook(e.target.value)} style={{ padding: "9px 12px" }} />
          </div>
        </div>

        <div className="panel" style={{ padding: 0, overflow: "hidden" }}>
          <div className="row" style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", justifyContent: "space-between" }}>
            <div>
              <h3 className="t-md">Alert log</h3>
              <p className="t-xs dim" style={{ margin: "3px 0 0" }}>{alertLog.length} this session</p>
            </div>
            {alertLog.length > 0 && <Pulse tone="var(--s1)" size={6} />}
          </div>
          <div style={{ maxHeight: 340, overflowY: "auto" }}>
            {alertLog.length === 0 && (
              <div style={{ padding: "36px 20px", textAlign: "center" }}>
                <I.bell size={22} stroke="var(--mute)" style={{ margin: "0 auto 10px" }} />
                <p className="t-sm dim" style={{ margin: 0 }}>No alerts yet. Run a scan that crosses a threshold.</p>
              </div>
            )}
            {alertLog.map((a, i) => (
              <div key={i} className={`sev sev-${grade(a.score).sev.toLowerCase()} anim-in`} style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}>
                <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t-sm mono" style={{ fontWeight: 600, wordBreak: "break-all" }}>{a.identity}</div>
                    <div className="t-xs dim" style={{ marginTop: 3 }}>Delivered via {a.rules.join(", ")}</div>
                    <div className="t-xs mute mono" style={{ marginTop: 2 }}>{fullDate(a.at)}</div>
                  </div>
                  <SevChip level={grade(a.score).sev} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h3 className="t-md" style={{ marginBottom: 4 }}>Breach data sources</h3>
      <p className="t-sm dim" style={{ margin: "0 0 14px", maxWidth: 640 }}>
        The demonstration build generates records locally. These are the real sources that replace that generator,
        in the order worth adding them.
      </p>
      {DATA_SOURCES.map(s => (
        <div key={s.name} className="panel" style={{ marginBottom: 9, borderLeft: `3px solid ${s.tone}` }}>
          <button onClick={() => setOpenSrc(openSrc === s.name ? null : s.name)} aria-expanded={openSrc === s.name}
            style={{ width: "100%", background: "transparent", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "inherit" }}>
            <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 5 }}>
                  <span className="t-base" style={{ fontWeight: 700 }}>{s.name}</span>
                  <Chip tone={s.tone}>{s.status}</Chip>
                  <Chip tone="var(--dim)">{s.cost}</Chip>
                </div>
                <p className="t-sm dim" style={{ margin: 0 }}>{s.what}</p>
              </div>
              <span className="row t-xs" style={{ gap: 5, color: s.tone, flexShrink: 0 }}>
                <I.code size={13} stroke={s.tone} />{openSrc === s.name ? "Hide" : "Code"}
              </span>
            </div>
          </button>
          {openSrc === s.name && (
            <pre className="mono" style={{
              margin: "14px 0 0", background: "var(--ink-900)", border: "1px solid var(--line)", borderRadius: 10,
              padding: "14px", fontSize: 12, color: "#B7A4FF", overflowX: "auto", lineHeight: 1.75,
            }}>{s.code}</pre>
          )}
        </div>
      ))}

      {leads.length > 0 && (
        <div className="panel" style={{ marginTop: 18 }}>
          <h3 className="t-sm" style={{ marginBottom: 3 }}>Pipeline from the free scanner</h3>
          <p className="t-xs dim" style={{ margin: "0 0 12px" }}>{leads.length} captured this session</p>
          {leads.map((l, i) => (
            <div key={i} className="row panel-sunk" style={{ justifyContent: "space-between", marginBottom: 6, gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div className="t-xs mono" style={{ wordBreak: "break-all" }}>{l.email}</div>
                <div className="t-xs mute">{l.org || "—"} · {l.domain} · {timeAgo(l.at)} ago</div>
              </div>
              <SevChip level={grade(l.score).sev} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══ root ═════════════════════════════════════════════════════
const TABS = [
  { id: "public", label: "Free Scan", icon: I.search },
  { id: "monitor", label: "Institutions", icon: I.bank },
  { id: "lookup", label: "Exposure Lookup", icon: I.shield },
  { id: "integrations", label: "Integrations", icon: I.plug },
];

export default function App() {
  const [tab, setTab] = useState("public");
  const [now, setNow] = useState(new Date());
  const [history, setHistory] = useState([]);
  const [leads, setLeads] = useState([]);
  const [alertLog, setAlertLog] = useState([]);
  const [alertRules, setAlertRules] = useState([
    { channel: "Slack #security-alerts", detail: "Posts to your incident channel", enabled: true, threshold: 70 },
    { channel: "Email to security team", detail: "Sends the full report attached", enabled: true, threshold: 50 },
    { channel: "PagerDuty incident", detail: "Raises a P1 for on-call", enabled: false, threshold: 85 },
    { channel: "Generic webhook", detail: "POSTs JSON to your own endpoint", enabled: false, threshold: 60 },
  ]);

  useEffect(() => { const i = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(i); }, []);

  return (
    <div className="cs">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <header className="topbar">
        <div className="row" style={{ gap: 9, flexShrink: 0 }}>
          <span style={{
            width: 30, height: 30, borderRadius: 8, background: "linear-gradient(140deg,#7C5CFF,#4A2FD0)",
            display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px #7C5CFF44",
          }}><I.shield size={16} stroke="#fff" w={2} /></span>
          <span style={{ fontFamily: "'Space Grotesk',sans-serif", fontSize: 17, fontWeight: 700, letterSpacing: "-.02em" }}>CredShield</span>
          <span className="chip hide-sm" style={{ color: "#B7A4FF", borderColor: "var(--brand-line)", background: "var(--brand-soft)" }}>v6</span>
        </div>

        <nav className="navscroll" style={{ marginLeft: 8, flex: 1 }} aria-label="Main">
          {TABS.map(t => (
            <button key={t.id} className="navbtn" aria-current={tab === t.id} onClick={() => setTab(t.id)}>
              <span className="row" style={{ gap: 7 }}>
                <t.icon size={14} />
                {t.label}
                {t.id === "integrations" && alertLog.length > 0 && (
                  <span className="num" style={{
                    background: "var(--s1)", color: "#fff", borderRadius: 9, minWidth: 17, height: 17,
                    fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center",
                    justifyContent: "center", padding: "0 4px",
                  }}>{alertLog.length}</span>
                )}
              </span>
            </button>
          ))}
        </nav>

        <div className="row hide-sm" style={{ gap: 12, flexShrink: 0 }}>
          <span className="t-xs mute num">{now.toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="row" style={{ gap: 7 }}>
            <Pulse tone="var(--s4)" size={6} />
            <span className="t-xs dim">20 institutions</span>
          </span>
        </div>
      </header>

      <main className="wrap">
        {tab === "public" && <PublicScan onLead={l => setLeads(ls => [l, ...ls])} leads={leads} />}
        {tab === "monitor" && <MonitorScreen />}
        {tab === "lookup" && <LookupScreen history={history} setHistory={setHistory} alertRules={alertRules} onAlert={a => setAlertLog(l => [a, ...l])} />}
        {tab === "integrations" && <IntegrationsScreen alertRules={alertRules} setAlertRules={setAlertRules} alertLog={alertLog} leads={leads} />}

        <div className="panel-flat" style={{ marginTop: 34 }}>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <I.alert size={15} stroke="var(--dim)" style={{ marginTop: 2 }} />
            <p className="t-xs dim" style={{ margin: 0 }}>
              <strong style={{ color: "var(--text)" }}>Demonstration build.</strong> Every figure, event and exposure record is
              generated locally from the text entered and the range selected. CredShield has no connection to any bank's systems,
              and the institutions named are realistic examples only. Passwords are never displayed — only the storage method and
              structural pattern. In production, monitoring runs against publicly circulating breach data, only for domains whose
              ownership has been verified. See Integrations for where real sources connect.
              <br /><br />CredShield · UltEnterprise
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
