// ──────────────────────────────────────────────────────────────
// Analysis layer. Operates entirely on real HIBP breach records.
// Nothing here invents data: every input is a field returned by the API.
// ──────────────────────────────────────────────────────────────

// Severity weighting for HIBP's own DataClasses vocabulary.
const CLASS_SEVERITY = {
  'Passwords': 5, 'Auth tokens': 5, 'Credit cards': 5, 'Bank account numbers': 5,
  'Social security numbers': 5, 'Government issued IDs': 5, 'Credit card CVV': 5,
  'Security questions and answers': 4, 'Password hints': 4,
  'Partial credit card data': 4, 'Partial government issued IDs': 4,
  'Credit status information': 4, 'Credit scores': 4, 'Historical passwords': 4,
  'Dates of birth': 3, 'Physical addresses': 3, 'Health insurance information': 3,
  'Mothers maiden names': 3, 'Income levels': 3, 'Private messages': 3,
  'Payment histories': 3, 'Financial transactions': 3, 'Bank account balances': 3,
  'Account balances': 3, 'Passport numbers': 5, "Driver's licenses": 4,
  'Phone numbers': 2, 'IP addresses': 2, 'Employers': 2, 'Job titles': 2,
  'Usernames': 2, 'Device information': 2, 'Geographic locations': 2,
  'Email addresses': 1, 'Names': 1, 'Genders': 1, 'Avatars': 1, 'Bios': 1,
};
export const classSeverity = c => CLASS_SEVERITY[c] ?? 2;

// Password storage is described in prose by HIBP. Read it rather than guess.
const STORAGE = [
  { re: /plain ?text/i,            algo: 'Plaintext',            crack: 'Immediate',   risk: 5 },
  { re: /unsalted md5|md5 hash/i,  algo: 'MD5',                  crack: 'Seconds',     risk: 5 },
  { re: /salted md5/i,             algo: 'Salted MD5',           crack: 'Minutes',     risk: 4 },
  { re: /unsalted sha-?1|sha-?1 hash/i, algo: 'SHA-1',           crack: 'Minutes',     risk: 5 },
  { re: /salted sha-?1/i,          algo: 'Salted SHA-1',         crack: 'Hours',       risk: 4 },
  { re: /sha-?256|sha-?512/i,      algo: 'SHA-2 family',         crack: 'Hours',       risk: 4 },
  { re: /pbkdf2/i,                 algo: 'PBKDF2',               crack: 'Years',       risk: 2 },
  { re: /bcrypt/i,                 algo: 'bcrypt',               crack: 'Years',       risk: 2 },
  { re: /argon2/i,                 algo: 'Argon2',               crack: 'Impractical', risk: 1 },
];

export function storageOf(breach) {
  if (!(breach.DataClasses || []).includes('Passwords')) return null;
  const text = (breach.Description || '').replace(/<[^>]+>/g, ' ');
  for (const s of STORAGE) if (s.re.test(text)) return s;
  return { algo: 'Not stated', crack: 'Unknown', risk: 3 };
}

// Severity of a single breach: worst data class present, moderated by how the
// passwords were actually stored. A bcrypt breach and a plaintext breach are
// not the same finding, even though both expose "Passwords".
export function breachSeverity(b) {
  const classes = b.DataClasses || [];
  let worst = Math.max(...classes.map(classSeverity), 1);
  const st = storageOf(b);
  if (st && classes.includes('Passwords')) {
    // Strong storage pulls a password finding down; weak storage keeps it at the top.
    if (st.risk <= 2) worst = Math.min(worst, 3);
    else if (st.risk === 3) worst = Math.min(worst, 4);
  }
  if (b.IsStealerLog) worst = 5;
  return worst;
}

export const daysSince = iso =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

export const stripHtml = h => (h || '').replace(/<[^>]+>/g, '').trim();

// ─── scoring ───────────────────────────────────────────────────
export function score(breaches) {
  if (!breaches.length) return 0;
  const classes = new Set(breaches.flatMap(b => b.DataClasses || []));
  const maxSev = Math.max(...[...classes].map(classSeverity), 0);
  const worstStorage = Math.max(0, ...breaches.map(b => storageOf(b)?.risk || 0));
  const recent = breaches.filter(b => daysSince(b.BreachDate) <= 730).length;
  const stealer = breaches.filter(b => b.IsStealerLog).length;
  const sensitive = breaches.filter(b => b.IsSensitive).length;

  return Math.min(99, Math.round(
    maxSev * 10 + worstStorage * 6 + recent * 5 +
    stealer * 10 + sensitive * 4 + Math.min(breaches.length, 8) * 2
  ));
}

export function grade(s) {
  if (s >= 80) return { label: 'Critical', sev: 'Critical', action: 'Act today' };
  if (s >= 60) return { label: 'High',     sev: 'High',     action: 'Act this week' };
  if (s >= 35) return { label: 'Medium',   sev: 'Medium',   action: 'Plan remediation' };
  if (s > 0)   return { label: 'Low',      sev: 'Low',      action: 'Monitor' };
  return            { label: 'None',     sev: 'Low',      action: 'No findings' };
}

// ─── remediation, derived from the real data classes present ───
export function remediation(breaches) {
  const t = []; const push = x => t.push({ ...x, id: `R${String(t.length + 1).padStart(2, '0')}` });
  const classes = new Set(breaches.flatMap(b => b.DataClasses || []));
  const has = c => classes.has(c);
  const weakStore = breaches.filter(b => (storageOf(b)?.risk || 0) >= 4);
  const stealer = breaches.filter(b => b.IsStealerLog);

  if (has('Passwords')) {
    const worst = weakStore.length ? storageOf(weakStore[0]) : null;
    push({
      priority: 'P0', window: 'Within 24 hours', hours: 24, owner: 'IAM', sev: 'Critical',
      title: 'Reset passwords for accounts reused from these services',
      why: worst
        ? `Passwords were exposed and stored using ${worst.algo}. Recovery time for that algorithm is realistically ${worst.crack.toLowerCase()}, so treat every exposed password as known.`
        : 'Passwords were exposed in at least one of these breaches. Anyone who reused one elsewhere is exposed there too.',
      steps: [
        'Identify staff who may have reused a password from the affected services.',
        'Force a reset through a verified out-of-band channel, not the exposed email.',
        'Screen the new password against a breached-password corpus at set time.',
        'Require the new password to differ from the previous ten.',
      ],
    });
  }
  if (stealer.length) {
    push({
      priority: 'P0', window: 'Within 24 hours', hours: 24, owner: 'Security Operations', sev: 'Critical',
      title: 'Treat affected devices as compromised',
      why: `${stealer.length} finding${stealer.length === 1 ? ' is' : 's are'} from infostealer logs. Malware captured credentials directly from a device, so the exposure is not limited to one service.`,
      steps: [
        'Isolate and rebuild any device suspected of infection rather than cleaning it.',
        'Revoke all active sessions and rotate session signing keys.',
        'Reset every credential entered on that device, not just the one that leaked.',
        'Hunt for persistence and lateral movement from the first-seen date.',
      ],
    });
  }
  if (has('Auth tokens')) {
    push({
      priority: 'P0', window: 'Within 1 hour', hours: 1, owner: 'Platform Engineering', sev: 'Critical',
      title: 'Revoke sessions and rotate signing keys',
      why: 'Authentication tokens were exposed. A token bypasses both the password and MFA, so a password reset alone does not close this.',
      steps: [
        'Invalidate every active session server-side.',
        'Rotate the session or JWT signing secret so issued tokens cannot be replayed.',
        'Bind refresh tokens to device fingerprint and shorten their lifetime.',
        'Audit access logs from the breach date forward.',
      ],
    });
  }
  if (has('Security questions and answers') || has('Password hints')) {
    push({
      priority: 'P1', window: 'Within 7 days', hours: 168, owner: 'IAM', sev: 'High',
      title: 'Retire knowledge-based recovery',
      why: 'Security answers or password hints were exposed. Unlike a password, these cannot be rotated once public, and they let an attacker walk through account recovery.',
      steps: [
        'Remove security questions from the account recovery flow entirely.',
        'Void existing answers rather than asking users to change them.',
        'Move high-value accounts to phishing-resistant MFA such as FIDO2 or passkeys.',
      ],
    });
  }
  if (weakStore.length) {
    const algos = [...new Set(weakStore.map(b => storageOf(b).algo))].join(', ');
    push({
      priority: 'P2', window: 'Within 30 days', hours: 720, owner: 'Engineering', sev: 'Medium',
      advisory: true,
      title: 'Advisory — verify your own password storage',
      why: `Not a finding against this subject. The breaches above stored passwords using ${algos}, which is why the exposure is as severe as it is. Treat this as a prompt to confirm your own systems do not use the same approach.`,
      steps: [
        'Adopt Argon2id, or bcrypt at cost 12 or above, for all new and changed passwords.',
        'Rehash transparently on next successful login.',
        'Add a pepper held outside the database.',
      ],
    });
  }
  if (has('Credit cards') || has('Partial credit card data') || has('Bank account numbers')) {
    push({
      priority: 'P0', window: 'Within 24 hours', hours: 24, owner: 'Finance / Fraud', sev: 'Critical',
      title: 'Handle exposed payment data',
      why: 'Payment card or bank account data appears in these breaches.',
      steps: [
        'Notify the card issuer or acquiring bank and request monitoring.',
        'Reissue affected cards rather than relying on monitoring alone.',
        'Review PCI-DSS scope if the data touched your own environment.',
      ],
    });
  }
  if (has('Phone numbers')) {
    push({
      priority: 'P2', window: 'Within 30 days', hours: 720, owner: 'Fraud Operations', sev: 'Medium',
      title: 'Harden against SIM-swap and vishing',
      why: 'Phone numbers paired with names make SIM-swap and voice phishing materially easier.',
      steps: [
        'Stop using SMS as a primary second factor for high-value accounts.',
        'Add a carrier port-out check before phone-based recovery.',
        'Brief the service desk on verification that does not rely on leaked data.',
      ],
    });
  }
  push({
    priority: 'P2', window: 'Ongoing', hours: 720, owner: 'Security Operations', sev: 'Medium',
    title: 'Monitor continuously rather than retrospectively',
    why: 'These findings were discovered by looking. Continuous checks shorten the gap between a leak appearing and anyone noticing.',
    steps: [
      'Check credentials against a breach corpus at authentication, not just at onboarding.',
      'Subscribe the domain to breach notifications.',
      'Route critical findings to the on-call channel rather than a shared inbox.',
    ],
  });
  return t;
}

// ─── regulatory obligations, triggered by real findings ────────
export function compliance(breaches) {
  if (!breaches.length) return [];
  const classes = new Set(breaches.flatMap(b => b.DataClasses || []));
  const has = c => classes.has(c);
  const s = score(breaches);
  const out = [];

  out.push({
    framework: 'UK GDPR', ref: 'Article 33', sev: 'Critical', hours: 72,
    clock: '72 hours from awareness',
    title: 'Assess whether the ICO must be notified',
    detail: 'Personal data has been exposed. Where a breach is likely to result in a risk to individuals, the ICO must be notified within 72 hours of awareness. Document the assessment either way, because the reasoning is itself the evidence.',
    evidence: 'Breach register entry, risk assessment, ICO reference if notified',
  });
  if (has('Passwords') || has('Credit cards') || has('Dates of birth') ||
      has('Government issued IDs') || has('Social security numbers')) {
    out.push({
      framework: 'UK GDPR', ref: 'Article 34', sev: 'High', hours: 72,
      clock: 'Without undue delay',
      title: 'Assess whether affected individuals must be told directly',
      detail: 'Where a breach is likely to result in a high risk to individuals, they must be informed directly and not only the regulator. Exposure of credentials or identity data will often meet that threshold, but it remains an assessment for the controller to make and record.',
      evidence: 'Notification copy, distribution list, send timestamps',
    });
  }
  if (has('Passwords')) {
    out.push({
      framework: 'PCI-DSS v4.0', ref: 'Requirement 8.3.6', sev: 'Medium', hours: 720,
      clock: 'Continuous control',
      title: 'Authentication factor storage strength',
      detail: 'Where cardholder data is in scope, Requirement 8 mandates strong cryptography for stored authentication credentials. These findings are a prompt to verify your own storage meets it.',
      evidence: 'Hashing configuration, KDF migration plan, QSA sign-off',
    });
  }
  if (has('Credit cards') || has('Partial credit card data')) {
    out.push({
      framework: 'PCI-DSS v4.0', ref: 'Requirement 3.3', sev: 'High', hours: 720,
      clock: 'Continuous control',
      title: 'Sensitive authentication data storage',
      detail: 'Card data appearing in circulating breach data requires an assessment of whether cardholder data environment controls held.',
      evidence: 'CDE scope diagram, segmentation test results, incident report',
    });
  }
  if (s >= 60) {
    out.push({
      framework: 'DORA', ref: 'Article 19', sev: 'Critical', hours: 4,
      clock: 'Initial report within 4 hours of classification',
      title: 'Major ICT-related incident reporting',
      detail: 'EU financial entities must report major ICT incidents to their competent authority. Credential exposure affecting customer-facing authentication is generally in scope where materiality thresholds are met.',
      evidence: 'Initial, intermediate and final DORA reports; classification rationale',
    });
  }
  if (s >= 70) {
    out.push({
      framework: 'NIS2', ref: 'Article 23', sev: 'Critical', hours: 24,
      clock: 'Early warning within 24 hours',
      title: 'Significant incident early warning',
      detail: 'Essential and important entities must give an early warning within 24 hours and a full notification within 72, where the entity falls within NIS2 scope.',
      evidence: 'CSIRT early warning, incident notification, final report',
    });
  }
  if (s >= 35) {
    out.push({
      framework: 'FCA', ref: 'SYSC 13 / Principle 3', sev: 'High', hours: 720,
      clock: 'Continuous obligation',
      title: 'Adequate systems and controls for operational risk',
      detail: 'UK regulated firms must organise their affairs responsibly with adequate risk management systems. Unmonitored credential exposure is a recognised operational risk the FCA expects firms to manage.',
      evidence: 'Board risk report, control testing results, remediation tracker',
    });
  }
  return out;
}
