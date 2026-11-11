# Syntech Manufacturing — production game

Responsive production simulation with a connected isometric factory, five decisions, RU/UK/EN localization, campaign attribution, Syntech corporate colour #0B404E, and automatic demo form at completion.

## GitHub Pages

GitHub Pages hosts the game and its assets. Demo requests go to a separately hosted server; GitHub Pages cannot run the Creatio webhook handler or store requests.

Build without installing dependencies:

```
npm run build:pages
npm test
node scripts/check-pages.mjs
```

The `.github/workflows/pages.yml` workflow publishes `_site/` on pushes to `main`. The repository’s Pages source must be set to GitHub Actions. Project repository paths and language directories are supported.

Repository variables:
- `LEAD_API_URL`: HTTPS endpoint for demo requests; defaults to the existing Sites `/api/leads` endpoint.
- `PAGES_SITE_URL`: optional canonical URL, including the project path where needed.
- `PAGES_CUSTOM_DOMAIN`: optional approved custom hostname. DNS must be configured before using it.

## Server and Creatio

The server source in `src/server.js` requires a Cloudflare-compatible Worker runtime and an R2 binding named `BUCKET`. It is not executed by GitHub Pages.

Configure the backend with:
- `CREATIO_WEBHOOK_URL`: the webhook destination, stored as a server-side secret. Never place it in frontend code or GitHub Pages variables.
- `ALLOWED_FORM_ORIGINS`: comma-separated exact HTTPS origins for this GitHub Pages site and any custom domain, for example `https://OWNER.github.io,https://play.syntechmanufacturing.com`. Wildcards are not supported.

The backend must be deployed with that allowlist before launching the Pages form. It validates the request origin and submission URL, handles CORS preflight, saves requests before forwarding, and reports delivery failures. Webhook fields are `name`, `company`, `phone`, `email`, `formType: "consultation"`, and `tracking: {submitted_from, submitted_at}`. UTM attribution and game results are kept in the saved record. Retries reuse the request ID; previously delivered IDs are not resent. Infrastructure failures can still prevent exactly-once delivery.

Tests stub all outbound requests and never contact the live Creatio webhook.

## Editing

- `src/page.html`: page, dialogs and form.
- `src/style.css`: responsive design and corporate palette.
- `src/app.js`, `src/game-data.js`: interactions and game logic.
- `src/i18n/translations.tsv`: complete UK/EN translations of the Russian source.
- `scripts/generate-world.py`: map geometry, vehicle route and occlusion.
- `scripts/build-pages.mjs`: Pages export and path handling.

Syntech logo and product screenshots come from the user-supplied Syntech Manufacturing website. Industrial photos are illustrative Unsplash assets:
https://images.unsplash.com/photo-1581091226825-a6a2a5aee158
https://images.unsplash.com/photo-1581092921461-eab62e97a780

## Language in shared links

Use `/uk/`, `/ru/` or `/en/` for shareable language-specific pages. A valid `?lang=` parameter takes priority over the path. `ua` is accepted as an alias for `uk`, including the `/ua/` redirect. Case and region variants such as `EN` and `en-US` are normalized in the query. With no language in the link, the default is Russian. Browser language and stored preferences do not override an explicit link. Redirects preserve UTM parameters and the hash. The deployed router is covered by `scripts/check-language-router.mjs`.
