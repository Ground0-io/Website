# Website

The public website of Ground0. Owner and legal provider: A & H GmbH (named on the legal pages). Designed, developed and run by Nada Consulting. Plain static HTML, one stylesheet and one script: no build step, no cookies, no tracking, nothing loaded from third parties.

The design follows the Ground0 brand: black and white (`#0A0A0A` / `#FAFAFA`, neutral greys, no accent colour), Space Mono for the wordmark, headings and labels, DM Sans for everything else. The wordmark is `ground0|` everywhere. The only colour on the site is inside the two product windows of the hero, where each company's own colours appear inside its own frame. The fonts are hosted in `fonts/` under the SIL Open Font License; IBM Plex Sans Arabic is a subset that loads only for the one Arabic message in the hero.

- English pages at the root, German pages under `de/`.
- Legal pages: `de/impressum.html`, `de/datenschutz.html` (authoritative) and their translations `legal-notice.html`, `privacy.html`.
- Served by GitHub Pages from the root of the `main` branch, so every file here is public. The privacy policy names GitHub as the host; update it if the hosting changes.
- `og.png` and `og-de.png` are the link-preview images; `favicon.ico`, `icon-192.png` and `apple-touch-icon.png` are the icons.

## Home page

- The hero (`.gzh` in the markup and in `styles.css`, the first part of `site.js`): an engineered grid with a ground line, and two product windows that replay one example conversation each. It plays while it is on screen and the tab is visible, and rests otherwise. With reduced motion it shows the finished state and Replay steps through it; without scripts it shows a finished static frame.
- Below the hero, each `data-demo` plays its `data-step` children once when it comes into view and then offers Replay (second part of `site.js`). Every step keeps its place from the start, so the page does not move while an example plays. Without scripts or with reduced motion every example shows its finished state.
- The conversations and cards are examples and are labelled as such. They only show things the two assistants do today.

Links are relative, so the site also works under the `github.io` project path. The exception is `404.html`, which is served for any missing address and therefore uses absolute paths.
