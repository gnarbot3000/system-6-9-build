# Contributing to System 6.9

Thanks for helping. Builds, fixes and clearer docs are all welcome.

## Issues

- Open an issue to report a bug, a broken link, an unclear step, or a safety concern.
- To share a build, open an issue with photos, your span, motor and rope, and what
  worked or didn't. You can also submit it on the site's /builds page.

## Pull requests

- Keep each PR small and focused on one change.
- Describe what you changed and how you checked it (for site pages: load it locally at
  375px wide and check for console errors and sideways scrolling).
- Run `node --test test/*.js` before you open the PR.

## Keep builds safe

- Don't remove or water down safety notes. If a change affects loads, speeds, rope,
  anchors or stopping, say so plainly in the PR.
- System 6.9 is not certified. Don't describe it as certified, rated or guaranteed.

## No credentials

- Never commit tokens, passwords, API keys, `.env` files or `.dev.vars`.
- Don't post personal information about other people.

## Licensing

By contributing, you agree that your code is licensed under the MIT License
(LICENSE) and your docs, guides and images under CC BY 4.0 (LICENSE-docs).
