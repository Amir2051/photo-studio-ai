# Every Frame First production readiness

Updated 2026-11-10 after the GitHub Pages deployment.

## Verified live

- `https://studio.safenestt.com/`, `/video-studio/`, and `/video-studio/guest.html` return HTTP 200 from GitHub Pages.
- The editor's immutable JavaScript and CSS assets load successfully.
- `https://every-frame-guest-signal.onrender.com/health` returns healthy, and the production-origin CORS preflight returns 204.
- The latest application build and tests passed in GitHub Actions.
- The Render static site and Render guest-signaling service both auto-deploy from `fix/photo-studio-core-repair`.

## Release blockers and decisions

### Hosting and authentication

The home app includes Firebase email/password sign-in. GitHub Pages is static hosting and GitHub says Pages sites should not handle sensitive transactions such as sending passwords; its acceptable use also excludes free hosting primarily directed at commercial SaaS. Review [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) before treating this authenticated app as a production Pages site.

Recommended production arrangement: use the Render static site for the authenticated app, keep GitHub Actions for source checks and release artifacts, and only use Pages for a non-authenticated demo or documentation site. If Pages remains the chosen host, resolve this policy concern before inviting real users.

The Render static deployment is currently a duplicate. Once the canonical host is chosen, disable the other site's production auto-deploy so one commit cannot silently publish two different production copies.

### GitHub controls

- Protect `fix/photo-studio-core-repair`: require pull requests and a passing `build` check before merge.
- Protect the `github-pages` environment and allow deployments only from the approved production branch(es). This repository currently uses a manual workflow on `main` that checks out the integration branch, so include both approved paths deliberately.
- Keep production secrets in Actions/Render secret stores. Never expose private provider keys through `VITE_*` variables; browser-prefixed values are shipped to visitors.
- The repository has no Firebase rules file. Verify Firebase Authentication, Firestore, and Storage rules in Firebase Console before launch, including per-user access and abuse limits.

### Guest contribution reliability

- The signaling service is on Render Free and `healthCheckPath` is empty. Configure the HTTP health check as `/health`. Render's Free web services sleep after 15 minutes of inactivity and take about a minute to wake; an HTTP health check does not prevent this. Upgrade to paid compute if guests must connect promptly and reliably. See [Render Free services](https://render.com/docs/free) and [health checks](https://render.com/docs/health-checks).
- Configure a production TURN relay and server-generated, expiring credentials. STUN alone cannot establish every guest connection across NATs and firewalls.
- Test two or more physical devices on independent networks, including guest arrival during recording, mute/unmute, reconnect, and sustained sessions.

### Broadcast, browser, and operations

- Test WHIP against the actual chosen streaming provider with real credentials. Verify CORS exposes the session `Location`, then exercise stop, network loss, and recovery.
- Complete the dedicated Firefox desktop export and media-loaded resize stress test. Repeat recording/export checks with real cameras, microphones, and representative hardware.
- Add external uptime/error alerts and a rollback/runbook. Confirm project export, local media recovery, and privacy/support contact information before opening access to users.
- If cloud AI is part of launch, deploy and configure `server/ai-gateway.mjs` with server-only secrets. The current editor UI still uses its local prompt helper and does not expose the connected cloud AI workflow.

## Automated production smoke check

The Pages workflow runs `scripts/smoke-production.mjs` after a successful deploy. It checks the site routes, editor assets, signaling health, and the exact custom-domain CORS origin. A passing smoke check confirms deploy connectivity; it does not replace the release blockers above.
