# CredShield

Credential exposure intelligence for banks, fintechs and SMEs.

**Live:** https://credshield.ultenterprise.com

Most breaches begin with a login that already works. By the time an
organisation discovers its credentials are circulating, they have often
been on sale for months — the average breach involving stolen credentials
takes 292 days to identify and contain.

CredShield is built around that gap. It answers three questions: what has
leaked, how long it has been available to buy, and what to do about it.

---

## What it does

**Exposure lookup**
Enter an email address or a company domain and see every record held for
it — the source, the data classes exposed, how the password was stored and
the realistic time to crack that algorithm, whether the listing is still
live, and how many days it has been circulating.

**Remediation planning**
Generates a prioritised plan from what actually leaked rather than a
template. A leaked session token produces a key-rotation task; weak hashes
produce a KDF migration task. Each action carries an owner, a deadline and
numbered technical steps.

**Regulatory mapping**
Maps findings to the obligations they trigger — UK GDPR Articles 33 and 34,
DORA Article 19, NIS2 Article 23, PCI-DSS Requirements 3.3 and 8.3.6, and
FCA SYSC 13 — with the reporting clock and the evidence to retain.

**Institution monitoring**
Portfolio view across 20 financial institutions in the UK, US, EU and
Africa, filterable by region, severity and date range, with a live
threat-activity timeline.

**Reporting**
Exports a standalone client-ready report covering the record table, the
full remediation plan and the regulatory mapping.

---

## Design principles

Passwords are never displayed, only the storage algorithm and the
structural pattern. A tool that echoes back plaintext credentials becomes a
liability the moment it is itself breached.

Monitoring reads only publicly circulating breach data, never an
organisation's internal systems, and only for domains whose ownership has
been verified.

---

## Stack

React · Vite · deployed on Vercel. No runtime dependencies beyond React;
all visualisation is hand-built SVG.

## Local development

```bash
npm install
npm run dev
```

## Status

Demonstration build. Exposure records are generated locally from the input
so the interface can be evaluated without handling real breach data.
Integration with live breach corpora is documented in the Integrations
view.

---

Built by [Bolaji Uthman Edu](https://github.com/BolajiEdu) —
[UltEnterprise](https://ultenterprise.com), independent penetration testing
and red team consultancy.
