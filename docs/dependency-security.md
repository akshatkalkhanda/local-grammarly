# Dependency security maintenance

The November 2026 update uses Electron 43.8.10 and electron-builder 26.18.0.
It keeps the current Electron major version and updates the lockfile to patched
transitive packages. Local Grammarly also updates Vite to 8.3.8.

Two narrow overrides select @electron/universal 3.0.6 and minimatch 11.0.8
inside app-builder-lib. These avoid vulnerable packaging dependencies without
accepting npm audit force suggestions to downgrade electron-builder. Remove
the overrides when the parent package accepts patched versions.

Use Node 22 LTS (22.22.2 or newer), run npm ci, npm audit, tests, lint, and
packaging checks before releasing. A clean npm audit covers known dependency
advisories; it does not establish that an application cannot be exploited.
