# CredShield

Credential exposure intelligence for banks, fintechs and SMEs.

**Live:** https://credshield.ultenterprise.com

Check a company domain, an email address or a password against the public
breach record. Every finding comes back with how long it has been circulating,
what it means, and what to do about it.

## What is real

All breach records come from the [Have I Been Pwned](https://haveibeenpwned.com)
API, called server-side. Nothing is generated or simulated.

CredShield adds the analysis layer on top:

- **Risk scoring** weighted by data-class severity, password storage strength,
  recency, and whether the source is an infostealer log
- **Password storage detection** parsed from the breach description, mapped to
  realistic crack times
- **Remediation planning** generated from the data classes actually exposed.
  Auth tokens produce a key-rotation task; weak hashes produce a KDF migration
  task; infostealer sources produce device-rebuild guidance
- **Regulatory mapping** to UK GDPR Articles 33 and 34, PCI-DSS 3.3 and 8.3.6,
  DORA Article 19, NIS2 Article 23 and FCA SYSC 13, with reporting clocks

## Endpoints

| Route | Auth | Notes |
|---|---|---|
| `/api/domain-breaches` | none | Breaches recorded against a company domain |
| `/api/account-breaches` | HIBP key | Breaches an individual account appears in |
| `/api/password-check` | none | k-anonymity range check |

Domain search returns breaches **of a company**. Enumerating individual
employee accounts on a domain requires verified ownership of that domain
through HIBP's domain search dashboard, and is intended for client engagements
rather than public use.

## Password handling

Passwords are hashed with SHA-1 in the browser. Only the first five characters
of the hash are sent to the server. Neither the password nor the full hash
leaves the device. This is the k-anonymity model Pwned Passwords is built on.

## Running locally

```bash
npm install
npm run dev
```

Domain and password checks work with no configuration. For email lookup, set
`HIBP_API_KEY` — a key costs a few pounds a month from
[haveibeenpwned.com/API/Key](https://haveibeenpwned.com/API/Key).

## Deployment

Vercel. The `api/` directory deploys as serverless functions automatically.
Set `HIBP_API_KEY` in project environment variables.

## Attribution

Breach data © Have I Been Pwned, licensed CC BY 4.0. Attribution is displayed
in the application.

---

Built by [Bolaji Uthman Edu](https://github.com/BolajiEdu) —
[UltEnterprise](https://ultenterprise.com), independent penetration testing and
red team consultancy.
