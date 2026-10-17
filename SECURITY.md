# Security Policy

The **Last-Crown** engineering team takes the security, reliability, and integrity of our online gaming platform seriously. We appreciate responsible disclosures from researchers, players, and contributors.

---

## Supported Versions

Only the latest release on the primary production branch receives active security updates and vulnerability patches.

| Version           | Supported              | Release Type       | Maintenance Notes                    |
| :---------------- | :--------------------- | :----------------- | :----------------------------------- |
| `0.1.x` (Current) | :white_check_mark: Yes | Production / Main  | Active security patches and hotfixes |
| `< 0.1.0`         | :x: No                 | Prototype / Legacy | Unsupported                          |

---

## Security Architecture & Principles

Last-Crown operates under a **Zero-Client-Trust** multiplayer architecture:

1. **Server Authoritative State**:
   - Game clients do not dictate attack validation, collision checks, damage calculations, health values, or round winners.
   - All client inputs are treated as untrusted network intents and simulated deterministically inside headless server rooms.
2. **Schema & Protocol Validation**:
   - Every inbound WebSocket message is validated via strict Zod schemas before being passed to room logic.
   - Malformed packets, unauthorized commands, and invalid payloads are dropped immediately.
3. **Abuse Mitigation & Rate Limiting**:
   - **Network Rate Limiting**: Individual client input frequencies are limited with strict rate caps (supporting high-refresh rate displays up to 240Hz while rejecting socket flooding).
   - **Invite Code Brute-Force Protection**: IP-based rate limiting restricts room verification and creation attempts to 10 requests per minute with LRU map eviction.
   - **Process Isolation**: Server rooms execute within isolated exception boundaries so an uncaught exception in one match cannot compromise or crash the global server process.
4. **Credential Isolation**:
   - Production secrets (TURN server auth keys, database credentials, server secrets) reside strictly in server environment variables.
   - Client bundles never contain private tokens or credentials.

---

## Reporting a Vulnerability

If you discover a security vulnerability, **please do not disclose it publicly or open a public GitHub issue**. Instead, follow our responsible disclosure workflow:

### Disclosure Contacts

- **Security Team Email**: [security@last-crown.top](mailto:security@last-crown.top)
- **GitHub Private Advisory**: Open a draft advisory through [GitHub Security Advisories](https://github.com/mujahidalmahi/last-crown/security/advisories/new)

### What to Include in Your Report

To help us investigate and remediate the issue promptly, please provide:

1. **Description**: A clear summary of the vulnerability (e.g. Remote Code Execution, Denial of Service, State Desynchronization Exploit, Authentication Bypass).
2. **Impact**: An assessment of the potential impact on players, servers, or match integrity.
3. **Reproduction Steps**: Step-by-step instructions or Proof of Concept (PoC) code/scripts demonstrating the issue.
4. **Affected Components**: Specific package (`@last-crown/server`, `@last-crown/web`, `@last-crown/game-core`) and file/line references.
5. **Mitigation Suggestions** _(Optional)_: Recommended fixes or defensive patches.

---

## Response Timeline & Service Level Commitments

| Milestone                  | Target Response Time    | Action                                                                                         |
| :------------------------- | :---------------------- | :--------------------------------------------------------------------------------------------- |
| **Initial Acknowledgment** | **< 24 hours**          | A member of the security team confirms receipt of the report.                                  |
| **Triage & Validation**    | **< 72 hours**          | The vulnerability is assessed, reproduced in a staging sandbox, and assigned a severity level. |
| **Remediation & Patch**    | **< 7 business days**   | A secure patch is developed, tested across the test suite, and deployed to production.         |
| **Public Advisory**        | **Coordinated Release** | A detailed security advisory and changelog credit will be published after the patch is live.   |

---

## Scope & Vulnerability Classifications

### In-Scope Vulnerabilities:

- Denial of Service (DoS) attacks crashing Colyseus match rooms or the HTTP server.
- Memory exhaustion or resource leak vectors in server rooms or matchmaking registries.
- Unauthorized access or manipulation of another room's state or voice signaling relay.
- Client impersonation or bypass of room host controls (e.g. unauthorized kick/vibrate triggers).
- Cross-Site Scripting (XSS), Open Redirects, or injection vectors on the web portal.

### Out-of-Scope:

- Theoretical attacks without demonstrable impact or functional PoC.
- Denial of service attacks relying solely on massive volumetric network bandwidth (L3/L4 DDoS).
- Social engineering attacks targeting project maintainers.
- Issues related to outdated or unsupported third-party browser versions.

---

## Security Hall of Fame

We believe in recognizing security researchers who help protect the Last-Crown community. With your permission, credited contributors will be acknowledged in our release notes and Security Hall of Fame.
