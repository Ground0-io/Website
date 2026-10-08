# Website

The public website of Ground0. Owner and legal provider: A & H GmbH (named on the legal pages). Designed, developed and run by Nada Consulting. Plain static HTML, one stylesheet and one script: no build step, no cookies, no tracking, nothing loaded from third parties.

The design follows the Ground0 brand: black and white (`#0A0A0A` / `#FAFAFA`, neutral greys, no accent colour), Space Mono for the wordmark, headings and labels, DM Sans for everything else. The wordmark is `ground0|` everywhere. The only colour on the site is inside the two product windows of the hero, where each company's own colours appear inside its own frame. The fonts are hosted in `fonts/` under the SIL Open Font License; IBM Plex Sans Arabic is a subset that loads only for the one Arabic message in the hero.

- English pages at the root, German pages under `de/`.
- Legal pages: `de/impressum.html`, `de/datenschutz.html` (authoritative) and their translations `legal-notice.html`, `privacy.html`.
- Served by GitHub Pages from the root of the `main` branch, so every file here is public. The privacy policy names GitHub as the host; update it if the hosting changes.
- `og.png` and `og-de.png` are the link-preview images; `favicon.ico`, `icon-192.png` and `apple-touch-icon.png` are the icons.

## Home page

- The hero (`.gzh` in the markup and in `styles.css`, the first part of `site.js`): an engineered grid with a ground line, and two product windows that replay one example conversation each. It plays while it is on screen and the tab is visible, and rests otherwise; the pause button holds everything that moves in it, Replay starts both examples again. With reduced motion it shows the finished state and the button steps through it; without scripts it shows a finished static frame. A line under the windows says which language each example is in.
- Under the hero's buttons, "Assistants running today" is a roll (`.gzh-roll`): each company's lockup (mark, assistant, company) drifts past in a strip that fades out at both ends. The markup holds each company once, followed by the dashed open slot. A few lines of script right after the list repeat it to fill the strip (the copies are hidden from screen readers, which hear the label and each company once), and CSS moves the strip by exactly one copy, so the loop has no seam. One entry takes 10 seconds to go by: today's two companies and the slot come round every 30 seconds, and the speed stays the same when a company is added. It rests under the pointer, under keyboard focus, with the hero's pause button, while the strip is off screen and while the tab is hidden. With reduced motion, without scripts or when `site.js` does not arrive it is a still row of the companies on one line; the open slot shows only in the moving strip, because the hero's own dashed window next to it already says the same. It sits in the hero's text column, not in a band below the hero, so that it is on the first screen.
- To add a company to the roll, add one `gzh-lockup` line above the `gzh-open` entry in `index.html` and in `de/index.html`; the comment there says what a line holds. Nothing else changes.
- The first screen does not wait for `site.js`: its entrance is plain CSS. If the script has not started 2.5 seconds after the page began to load, the page drops to its still, finished state (the small script in the `<head>` does this) and stays there.
- Below the hero the same grid runs on behind the page as one sheet (`.field`). Words never stand on it: headings have a calm patch, text panels are solid, and the small examples are open windows onto it.
- Each `data-demo` plays its `data-step` children once when it comes into view and then offers Replay (second part of `site.js`). Every step keeps its place from the start, so the page does not move while an example plays. Without scripts or with reduced motion every example shows its finished state.
- The conversations and cards are examples and are labelled as such. They only show things the two assistants do today.

Links are relative, so the site also works under the `github.io` project path. The exception is `404.html`, which is served for any missing address and therefore uses absolute paths.
