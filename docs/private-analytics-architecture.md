# Private traffic measurement architecture

Status: not activated.

Feelyng is published as a static GitHub Pages site. The repository has no
server-side endpoint, database, owner authentication, or private dashboard.
A browser-only counter would measure a device or browser, not site-wide
traffic, so this project does not add one.

## Required architecture before activation

Use a privacy-focused, authenticated analytics service or an owner-operated
analytics endpoint. The public site may send only the minimum page-visit event
needed for aggregate reporting. The statistics must remain behind the
provider's owner login or an authenticated dashboard; no raw JSON or admin
page belongs in `frontend/`.

Before choosing a provider, Hamza must confirm its data processing, IP handling,
retention, cookies or local storage, third-party requests, legal basis and any
consent requirement for Germany. These details must come from the selected
provider's current documentation and contract, not from assumptions in this
repository.

## Manual setup still required

1. Select and open an owner account with a privacy-focused provider, or deploy
   an owner-authenticated endpoint outside GitHub Pages.
2. Verify `feelyng.de` in that service and configure the shortest useful
   retention and aggregate reporting available.
3. Decide the legal basis and whether consent is required with legal/technical
   review.
4. If activation is approved, add only the provider's minimal public-site
   integration and update `frontend/datenschutz.html` with verified facts.
5. Keep all credentials, API keys and dashboard access outside this public
   repository.

No analytics script, third-party analytics request, tracking pixel, public
counter, visitor number, analytics cookie or analytics localStorage key was
added in this task. The existing language preference remains the only
`localStorage` value used by the site.
