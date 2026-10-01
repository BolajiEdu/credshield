// Breaches an individual account appears in.
// Requires an HIBP API key (Pwned 1 tier or above). The key stays server-side.

const UA = 'CredShield/2.0 (+https://credshield.ultenterprise.com)';

export default async function handler(req, res) {
  const key = process.env.HIBP_API_KEY;
  if (!key) {
    return res.status(503).json({
      error: 'not_configured',
      message: 'Email lookup needs an HIBP API key. Domain search works without one.',
    });
  }

  const account = (req.query.account || '').toString().trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account)) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  try {
    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(account)}?truncateResponse=false`,
      { headers: { 'hibp-api-key': key, 'user-agent': UA } }
    );
    if (r.status === 404) return res.status(200).json({ account, breaches: [] });
    if (r.status === 401) return res.status(502).json({ error: 'API key rejected by HIBP.' });
    if (r.status === 429) return res.status(429).json({ error: 'Rate limited. Try again shortly.' });
    if (!r.ok) return res.status(502).json({ error: `Upstream returned ${r.status}` });

    const breaches = await r.json();
    return res.status(200).json({ account, breaches, source: 'haveibeenpwned.com' });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the breach index.' });
  }
}
