// Breaches recorded against a given company domain.
// Uses the FREE unauthenticated HIBP /breaches endpoint. No API key and no
// domain-ownership verification required, so this is safe to expose publicly.
// The upstream Domain filter is unreliable, so we fetch once (heavily cached
// at the edge) and filter here.
// Breach data (c) Have I Been Pwned, licensed CC BY 4.0. The UI carries the
// required visible attribution and link.

const UA = 'CredShield/2.0 (+https://credshield.ultenterprise.com)';

let cache = { at: 0, data: null };
const TTL = 1000 * 60 * 60 * 6; // 6 hours in-process

async function allBreaches() {
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  const r = await fetch('https://haveibeenpwned.com/api/v3/breaches', {
    headers: { 'user-agent': UA },
  });
  if (!r.ok) throw new Error(`upstream ${r.status}`);
  const data = await r.json();
  cache = { at: Date.now(), data };
  return data;
}

export default async function handler(req, res) {
  const raw = (req.query.domain || '').toString().trim().toLowerCase();
  const domain = raw.replace(/^@/, '').replace(/^https?:\/\//, '').split('/')[0];

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    return res.status(400).json({ error: 'Enter a valid domain, for example acme.com' });
  }

  try {
    const all = await allBreaches();
    const breaches = all.filter(b => (b.Domain || '').toLowerCase() === domain);
    res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400');
    return res.status(200).json({
      domain,
      breaches,
      indexSize: all.length,
      source: 'haveibeenpwned.com',
    });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach the breach index. Try again shortly.' });
  }
}
