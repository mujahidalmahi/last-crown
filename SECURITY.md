# Security Policy

## Supported Versions

| Version     | Supported |
| :---------- | :-------- |
| 0.1.x (MVP) | Yes       |

## Security Principles

1. **Zero Client Trust**:
   - Clients never dictate damage, health totals, hit detection confirmation, round wins, or match results.
   - All client inputs are treated as untrusted intents and validated via Zod schemas.
2. **Abuse Mitigation**:
   - Rate limiting on invite code verification prevents code brute forcing.
   - Input message rate limiting per client prevents WebSocket spam or server thread starvation.
3. **No Secrets in Bundles**:
   - Client applications only access environment variables prefixed with `NEXT_PUBLIC_`.
   - Never commit `.env` or credential files to version control.

## Reporting a Vulnerability

To report security vulnerabilities, open a private issue or email security disclosures to `security@lastcrown.example.com`.
