// Pwned Passwords k-anonymity range check.
// The browser sends only the first 5 characters of the SHA-1 hash.
// The password itself, and the full hash, never leave the user's device.

const UA = 'CredShield/2.0 (+https://credshield.ultenterprise.com)';

export default async function handler(req, res) {
  const prefix = (req.query.prefix || '').toString().toUpperCase();
  if (!/^[0-9A-F]{5}$/.test(prefix)) {
    return res.status(400).json({ error: 'prefix must be 5 hex characters' });
  }
  try {
    const r = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'user-agent': UA, 'Add-Padding': 'true' },
    });
    if (!r.ok) return res.status(502).json({ error: `Upstream returned ${r.status}` });
    const text = await r.text();
    res.setHeader('Cache-Control', 's-maxage=86400');
    return res.status(200).json({ prefix, suffixes: text });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach Pwned Passwords.' });
  }
}
