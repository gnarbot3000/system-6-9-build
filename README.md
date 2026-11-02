# System 6.9

System 6.9 is a community DIY endless shuttle for watersports: an endless rope loop
between two towers that pulls a rider back and forth across a lake or pond, so you can
wakeboard, kneeboard, skim or foil without a boat.

It is a hobby project shared in the open. **It is not a commercial product, and it is
not certified** to any standard. Anything you build from these files you build, test
and ride at your own risk.

This repo holds the source for [www.system6point9.com](https://www.system6point9.com):
the build guide, the parts explainer, the community build gallery, the executive summary
and its PDF (`system-6-9-product-summary.pdf`).

## What's here

- Static site: `index.html`, `guide.html`, `parts.html`, `builds.html`,
  `diy-endless-tow.html`, `related.html`, `exec-summary.html`, plus `css/`, `js/`, `media/`
- `functions/`: Cloudflare Pages Functions (`/api/signup`, `/api/builds`, `/api/builds-admin`)
- `store/` and `merch/`: sold-out / coming-soon merch pages (flag off by default)
- `scripts/indexnow.py`: submits the live sitemap to IndexNow after a deploy
- `test/`: Node tests for the merch flag
- Background video: generated placeholder (test asset)

## Run it locally

The pages are plain static HTML, so any static server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000/
```

To run the Pages Functions too (signup and build submissions), use Wrangler, which
simulates the KV binding locally:

```bash
npx wrangler pages dev .
```

The builds moderation endpoint stays off (503) until `BUILDS_ADMIN_TOKEN` is set in the
environment. For local testing, put it in a `.dev.vars` file, which you should never commit.

Run the tests (Node 18+; the browser test expects Chrome at `/usr/bin/google-chrome`):

```bash
node --test test/*.js
```

Screenshots from the browser test go to `$ARTIFACTS_DIR`, or a temp folder if it isn't set.

## Deploy

The maintainer deploys to Cloudflare Pages:

```bash
npx wrangler pages deploy . --project-name=system-6-9
```

## Contribute

Builds, fixes and better docs are welcome. Open an issue to share a build or report a
problem, or open a pull request with a small, focused change. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

- Code: MIT, see [LICENSE](LICENSE).
- Docs, PDFs and build guides: CC BY 4.0, see [LICENSE-docs](LICENSE-docs).
