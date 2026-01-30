# AGENTS.md

Repository: Furigana Reader (Chrome extension)

## Purpose
Adds furigana (ruby) annotations to selected Japanese text using an API call,
then injects the HTML back into the page.

## Key structure
- `src/background.js`: MV3 service worker used by the extension.
- `src/content.js`: content script injected into pages.
- `manifest.json`: points to `src/background.js` and `src/content.js`.
- Root-level `background.js`, `content.js`, `popup.js`, etc. are legacy copies;
  do not edit unless explicitly requested.

## Local dev / test
- Load the repository as an unpacked Chrome extension.
- After changes to `src/*`, click "Reload" in `chrome://extensions`.

## API notes
- OpenAI requests are sent to `settings.apiEndpoint` from `src/background.js`.
- Keep the system prompt stable to benefit from prompt caching.
- When changing request params, prefer minimal `reasoning.effort` and a bounded
  `max_output_tokens` to control latency.

## Style
- Prefer small, surgical changes.
- Avoid adding new dependencies unless requested.
