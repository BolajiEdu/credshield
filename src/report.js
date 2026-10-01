import { classSeverity, breachSeverity, storageOf, daysSince, stripHtml, score, grade } from "./analysis.js";

// ══════════════════════════════════════════════════════════════
// Report generator.
// Produces a standalone, printable HTML document from live scan
// results. Framed as passive OSINT, not a penetration test —
// nothing here was obtained by touching client systems.
// ══════════════════════════════════════════════════════════════

const esc = s => String(s ?? "").replace(/[&<>"]/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const fmt = n => (n || 0).toLocaleString();

const HEX = { Critical: "#C02A17", High: "#B35309", Medium: "#8A6A00", Low: "#0F7355" };
const sevOf = n => n >= 5 ? "Critical" : n >= 4 ? "High" : n >= 3 ? "Medium" : "Low";

export function buildReport({ subject, kind, breaches, tasks, compliance, meta = {} }) {
  const s = score(breaches);
  const g = grade(s);
  const accent = HEX[g.sev] || HEX.Low;
  const generated = new Date();
  const ref = `CS-${generated.getFullYear()}-${String(generated.getMonth() + 1).padStart(2, "0")}-${
    Math.abs([...subject].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7)).toString(36).slice(0, 5).toUpperCase()}`;

  const oldest = breaches.length ? Math.max(...breaches.map(b => daysSince(b.BreachDate))) : 0;
  const accounts = breaches.reduce((a, b) => a + (b.PwnCount || 0), 0);
  const withPw = breaches.filter(b => (b.DataClasses || []).includes("Passwords")).length;
  const stealers = breaches.filter(b => b.IsStealerLog).length;

  const classTally = (() => {
    const m = new Map();
    breaches.forEach(b => (b.DataClasses || []).forEach(c => m.set(c, (m.get(c) || 0) + 1)));
    return [...m.entries()].sort((a, z) => classSeverity(z[0]) - classSeverity(a[0]) || z[1] - a[1]);
  })();

  const client = meta.client || "";
  const engagement = meta.engagement || "";
  const tester = meta.tester || "Bolaji Uthman Edu";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Credential Exposure Assessment — ${esc(subject)}</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
@page{margin:16mm 14mm;size:A4}
:root{--ink:#14181F;--mid:#49556A;--dim:#6E7B8F;--line:#D9DEE6;--accent:${accent};--brand:#5B3FD9}
*{box-sizing:border-box}
body{font-family:'IBM Plex Sans',system-ui,sans-serif;color:var(--ink);line-height:1.6;
  max-width:860px;margin:0 auto;padding:26px 22px;font-size:13.5px}
h1,h2,h3,h4{font-family:'Space Grotesk',sans-serif;margin:0;letter-spacing:-.015em}
h1{font-size:27px}
h2{font-size:17px;margin:30px 0 12px;padding-bottom:7px;border-bottom:2px solid var(--ink)}
h3{font-size:14.5px;margin:0 0 6px}
h4{font-size:12.5px;margin:16px 0 7px;color:var(--mid)}
.mono{font-family:'IBM Plex Mono',monospace;font-variant-numeric:tabular-nums}
.sub{color:var(--dim);font-size:12.5px}
.cover{border-bottom:3px solid var(--accent);padding-bottom:16px;margin-bottom:18px}
.kv{width:auto;border-collapse:collapse;font-size:12.5px;margin-top:12px}
.kv td{border:0;padding:3px 16px 3px 0;vertical-align:top}
.kv td.k{color:var(--dim);white-space:nowrap}
.band{border:1px solid var(--line);
  border-left:6px solid var(--accent);border-radius:9px;padding:16px 20px;margin:16px 0}
.band table{border-collapse:collapse;width:100%}
.band td{border:0;padding:0;vertical-align:middle}
.band td.s{width:110px}
.score{font-family:'IBM Plex Mono',monospace;font-size:46px;font-weight:600;color:var(--accent);line-height:1}
.grid{width:100%;border-collapse:separate;border-spacing:5px;margin:12px 0}
.stat{border:1px solid var(--line);border-radius:7px;padding:11px;text-align:center;width:25%}
.stat b{display:block;font-family:'IBM Plex Mono',monospace;font-size:19px}
.stat span{font-size:11px;color:var(--dim)}
table{width:100%;border-collapse:collapse;margin:9px 0;font-size:12px}
th,td{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{background:#F2F4F8;font-weight:600}
.task{border:1px solid var(--line);border-left:5px solid #999;border-radius:8px;
  padding:13px 15px;margin-bottom:10px;page-break-inside:avoid}
.p0{border-left-color:${HEX.Critical}}.p1{border-left-color:${HEX.High}}.p2{border-left-color:${HEX.Medium}}
.tag{display:inline-block;font-size:10.5px;border:1px solid var(--line);border-radius:4px;
  padding:2px 7px;margin:0 5px 5px 0;color:var(--mid)}
.why{font-size:12.5px;color:var(--mid);margin:7px 0}
ol{margin:8px 0 0 18px;padding:0}li{margin-bottom:4px;font-size:12.5px}
.note{background:#F6F8FB;border:1px solid var(--line);border-radius:8px;padding:12px 14px;
  font-size:12px;color:var(--mid);margin:14px 0}
.sev{display:inline-block;width:9px;height:9px;border-radius:2px;margin-right:6px;vertical-align:middle}
.foot{margin-top:32px;padding-top:12px;border-top:1px solid var(--line);font-size:11px;color:var(--dim)}
@media print{body{padding:0}h2{page-break-after:avoid}}
</style></head><body>

<div class="cover">
  <div class="mono" style="font-size:11px;color:var(--brand);letter-spacing:.12em">
    CREDSHIELD · ULTENTERPRISE
  </div>
  <h1 style="margin-top:6px">Credential Exposure Assessment</h1>
  <div class="sub" style="margin-top:4px">Passive OSINT review of publicly circulating breach data</div>
  <table class="kv">
    <tr><td class="k">Subject</td><td class="mono">${esc(subject)}</td></tr>
    <tr><td class="k">Subject type</td><td>${esc(kind)}</td></tr>
    ${client ? `<tr><td class="k">Client</td><td>${esc(client)}</td></tr>` : ""}
    ${engagement ? `<tr><td class="k">Engagement</td><td>${esc(engagement)}</td></tr>` : ""}
    <tr><td class="k">Assessed by</td><td>${esc(tester)}</td></tr>
    <tr><td class="k">Date of assessment</td><td>${generated.toLocaleDateString("en-GB", { dateStyle: "long" })}</td></tr>
    <tr><td class="k">Reference</td><td class="mono">${ref}</td></tr>
    <tr><td class="k">Finding window</td><td>${esc(meta.windowLabel || "All time")}${
      meta.excluded ? ` &nbsp;<span class="sub">(${meta.excluded} older finding${meta.excluded === 1 ? "" : "s"} excluded)</span>` : ""
    }</td></tr>
    <tr><td class="k">Classification</td><td>Confidential — client use only</td></tr>
  </table>
</div>

<div class="note">
  <strong>Scope and method.</strong> This assessment is a passive review of breach data already
  circulating in public. No client system was accessed, scanned, probed or tested at any point, and
  no exploitation was attempted. It is not a penetration test and should not be read as one. Findings
  are drawn from the Have I Been Pwned index; the analysis, risk scoring, remediation planning and
  regulatory mapping that follow are produced by CredShield.
</div>

<h2>1 &nbsp;Executive summary</h2>

${breaches.length === 0 ? `
<p>No breach records were found for <span class="mono">${esc(subject)}</span> in the public index at
the date of assessment. This is a positive result, with the caveat that it covers only breaches that
have been publicly catalogued. Absence of a record is not evidence that no exposure exists.</p>
<p>No remediation actions arise from this assessment. We recommend continuous monitoring so that any
future listing is identified promptly rather than retrospectively.</p>
` : `
<div class="band"><table><tr>
  <td class="s"><div class="score">${s}</div><div class="sub">of 100</div></td>
  <td>
    <h3>${g.label} exposure — ${esc(g.action)}</h3>
    <div class="sub">
      ${breaches.length} breach record${breaches.length === 1 ? "" : "s"} associated with this subject.
      The oldest has been in circulation for <strong class="mono">${fmt(oldest)}</strong> days.
    </div>
  </td>
</tr></table></div>

<table class="grid"><tr>
  <td class="stat"><b>${breaches.length}</b><span>Breach records</span></td>
  <td class="stat"><b>${withPw}</b><span>Including passwords</span></td>
  <td class="stat"><b>${stealers}</b><span>Infostealer sources</span></td>
  <td class="stat"><b>${fmt(accounts)}</b><span>Accounts affected</span></td>
</tr></table>

<p>${
  s >= 80 ? "Exposure is at a level that warrants action today. Credentials or equivalent authentication material are in public circulation, and the age of the oldest finding means any password involved should be treated as known rather than merely suspected."
  : s >= 60 ? "Exposure is material and should be addressed this week. The combination of data classes exposed creates a realistic path to account compromise for anyone who has reused an affected credential."
  : s >= 35 ? "Exposure is moderate. No immediate compromise path is evident from the data classes involved, but the findings warrant a planned remediation cycle and ongoing monitoring."
  : "Exposure is limited. The data classes involved do not on their own create a direct compromise path, though the findings should be recorded and monitored."
}</p>

<h2>2 &nbsp;Findings</h2>

<table>
  <thead><tr>
    <th style="width:26%">Breach</th><th style="width:13%">Date</th>
    <th style="width:12%">Accounts</th><th style="width:13%">In circulation</th>
    <th>Data exposed</th>
  </tr></thead>
  <tbody>
  ${breaches.slice().sort((a, b) => new Date(b.BreachDate) - new Date(a.BreachDate)).map(b => {
    const worst = sevOf(breachSeverity(b));
    return `<tr>
      <td><span class="sev" style="background:${HEX[worst]}"></span><strong>${esc(b.Title)}</strong>
        ${b.IsStealerLog ? '<br><span class="sub">Infostealer log</span>' : ""}
        ${!b.IsVerified ? '<br><span class="sub">Unverified by HIBP</span>' : ""}</td>
      <td class="mono">${esc(b.BreachDate)}</td>
      <td class="mono">${fmt(b.PwnCount)}</td>
      <td class="mono">${fmt(daysSince(b.BreachDate))} days</td>
      <td>${(b.DataClasses || []).map(esc).join(", ")}</td>
    </tr>`;
  }).join("")}
  </tbody>
</table>

<h4>Password storage, where disclosed</h4>
<table>
  <thead><tr><th style="width:30%">Breach</th><th style="width:28%">Storage</th>
  <th style="width:22%">Realistic time to recover</th><th>Implication</th></tr></thead>
  <tbody>
  ${breaches.filter(b => storageOf(b)).map(b => {
    const st = storageOf(b);
    return `<tr><td>${esc(b.Title)}</td><td class="mono">${esc(st.algo)}</td>
      <td class="mono">${esc(st.crack)}</td>
      <td>${st.risk >= 4
        ? "Treat exposed passwords as known plaintext."
        : "Recovery is impractical at scale, but reuse remains the risk."}</td></tr>`;
  }).join("") || '<tr><td colspan="4" class="sub">No password storage method disclosed in these records.</td></tr>'}
  </tbody>
</table>

<h4>Data classes across all findings</h4>
<table>
  <thead><tr><th style="width:46%">Data class</th><th style="width:18%">Occurrences</th><th>Severity</th></tr></thead>
  <tbody>
  ${classTally.map(([c, n]) => {
    const l = sevOf(classSeverity(c));
    return `<tr><td>${esc(c)}</td><td class="mono">${n}</td>
      <td><span class="sev" style="background:${HEX[l]}"></span>${l}</td></tr>`;
  }).join("")}
  </tbody>
</table>

<h2>3 &nbsp;Remediation plan</h2>
<p class="sub">Actions are derived from the data classes actually exposed in the findings above, and
ordered by how quickly each one closes real risk.</p>

${tasks.map(t => `<div class="task ${t.priority.toLowerCase()}">
  <h3>${esc(t.priority)} &nbsp;·&nbsp; ${esc(t.title)}</h3>
  <div><span class="tag">${esc(t.window)}</span><span class="tag">Owner: ${esc(t.owner)}</span>
    <span class="tag mono">${esc(t.id)}</span>${t.advisory ? '<span class="tag" style="border-color:#B9C2D0;color:#6E7B8F">Advisory</span>' : ""}</div>
  <p class="why">${esc(t.why)}</p>
  <ol>${t.steps.map(x => `<li>${esc(x)}</li>`).join("")}</ol>
</div>`).join("")}

<h2>4 &nbsp;Regulatory considerations</h2>
<p class="sub">Obligations below are triggered by the data classes present in these findings. This is a
starting point for assessment, not legal advice. Confirm applicability with your compliance function.</p>

<table>
  <thead><tr><th style="width:15%">Framework</th><th style="width:16%">Reference</th>
  <th style="width:17%">Clock</th><th>Obligation and evidence</th></tr></thead>
  <tbody>
  ${compliance.map(c => `<tr>
    <td><strong>${esc(c.framework)}</strong></td>
    <td class="mono">${esc(c.ref)}</td>
    <td>${esc(c.clock)}</td>
    <td><strong>${esc(c.title)}</strong><br>${esc(c.detail)}
      <br><em class="sub">Evidence to retain: ${esc(c.evidence)}</em></td>
  </tr>`).join("") || '<tr><td colspan="4" class="sub">No mapped obligations triggered by these findings.</td></tr>'}
  </tbody>
</table>
`}

<h2>5 &nbsp;Limitations</h2>
<ul style="font-size:12.5px;color:var(--mid);margin-left:18px">
  <li>Coverage is limited to breaches publicly catalogued by Have I Been Pwned at the date above. Undisclosed or uncatalogued breaches will not appear.</li>
  <li>Domain search returns breaches recorded against the organisation. Enumerating individual staff accounts requires verified ownership of the domain and is performed separately, with written authorisation.</li>
  <li>No password values were retrieved, viewed or stored at any point. Storage methods are read from breach disclosures, not from the data itself.</li>
  <li>This assessment reflects a single point in time. Exposure changes as new breaches are catalogued.</li>
  ${meta.excluded ? `<li>This report covers the window stated on the cover page. ${meta.excluded} finding${meta.excluded === 1 ? " falls" : "s fall"} outside it and ${meta.excluded === 1 ? "is" : "are"} not included above. Older exposure remains relevant: a credential that leaked years ago has had longer to circulate, not less time.</li>` : ""}
</ul>

<div class="foot">
  <strong>Confidential.</strong> Prepared for the named client only. Not for redistribution without
  written permission.<br><br>
  Breach data © <a href="https://haveibeenpwned.com">Have I Been Pwned</a>, licensed
  <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Analysis, scoring,
  remediation planning and regulatory mapping produced by CredShield.<br><br>
  CredShield · UltEnterprise · ultenterprise.com · Report ${ref}
</div>
</body></html>`;
}

export function downloadReport(payload) {
  const html = buildReport(payload);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `CredShield-${String(payload.subject).replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.html`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export function printReport(payload) {
  const w = window.open("", "_blank");
  if (!w) return false;
  w.document.write(buildReport(payload));
  w.document.close();
  setTimeout(() => w.print(), 600);
  return true;
}
