# Security

## Reporting a vulnerability
Email **datakrdo@disroot.org** (Spanish or English). Please include steps to reproduce. I aim to answer within 7 days. No bug bounty.
Machine-readable: `/.well-known/security.txt`.

## Controls in place
Scope: a personal portfolio (static site on GitHub Pages, one Cloudflare Worker with D1, Formspree for the contact form). Mapping is indicative, not a certification.

| Control | ISO 27001 / 27701 | SOC 2 | Where |
|---|---|---|---|
| Content Security Policy, strict referrer policy, no third-party scripts or fonts | A.8.26, A.8.28 | CC6.6 | `index.html`, `privacy.html` |
| Fonts self-hosted (no visitor IP sent to Google) | 27701 7.4.x | P6 | `data/fonts/` |
| Privacy notice, opt-out (DNT, GPC, `?notrack`), no IP and no persistent visitor ID stored | 27701 7.2.x, 7.3.x | P1, P2, P5 | `privacy.html`, `app.js` |
| 12-month retention, deletion on request | 27701 7.4.7, 7.3.x | P4, P5 | `analytics/worker.js` (`scheduled`), `analytics/README.md` |
| Origin allowlist, event-type allowlist, size limit, rate limit, server-side timestamps | A.8.16, A.8.20 | CC6.1, CC6.6 | `analytics/worker.js` |
| Worker logs | A.8.15, A.8.16 | CC7.2 | `analytics/wrangler.toml` (`observability`) |
| Actions pinned to commit SHAs, weekly Dependabot updates, read-only workflow token | A.8.30, A.8.32 | CC8.1 | `.github/` |
| Secret scanning and push protection, branch ruleset blocking force-push and deletion | A.8.4, A.8.9 | CC6.1, CC8.1 | GitHub repo settings |
| Vulnerability disclosure | A.5.5, A.5.6 | CC2.3 | this file, `security.txt` |

## Out of scope
Organisational controls (ISMS and policies, risk register, HR, supplier reviews, access reviews, incident drills, audit) do not apply to a one-person portfolio and are not implemented. The CSP keeps `'unsafe-inline'` for styles because the page's CSS is inline.
