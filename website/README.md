# Firefly homepage

The Jekyll source for <https://firefly.rcs.northwestern.edu/>.

Plain Jekyll: no `Gemfile`, no theme, no plugins, no node/npm step. The
stylesheet is hand-written CSS that Jekyll copies through untouched, and the
whole page is about 40 lines of vanilla JavaScript. `jekyll build` is the entire
toolchain.

The built output, `_site/`, is **committed**, because nginx serves that directory
directly and the server never builds anything. A change that was never built is a
change that never appears.

## Layout

| path | what it is |
|---|---|
| `index.html` | front matter only; the page is assembled from the includes below |
| `_layouts/default.html` | nav → hero → about → gallery → footer |
| `_includes/` | one file per section: `head`, `nav`, `hero`, `about`, `gallery`, `footer` |
| `_gallery/` | one `.md` per gallery entry — the gallery is data-driven, see below |
| `assets/css/main.css` | the whole stylesheet, tokens at the top |
| `assets/js/main.js` | launches and closes the in-page demo; nothing else |
| `assets/img/` | wordmark, hero poster, favicon |
| `assets/img/gallery/` | thumbnails, one `.webp` and one `.png` per entry |
| `_config.yml` | site metadata, and `links:` — the off-site URLs, kept in one place |
| `_site/` | build output. Committed. Never hand-edit. |

## Building

From this directory, with a Jekyll install on `PATH`:

```bash
jekyll build                  # writes _site
jekyll serve --livereload     # preview on http://127.0.0.1:4000
```

Installing Jekyll into a conda environment has one trap worth knowing about; see
*Building the homepage* in the repository-root `README.md`.

Local previews will 404 on `/docs` and `/GaiaDR3`. Those are served by nginx from
elsewhere on the same host and only resolve in production.

## Adding a gallery entry

Drop a `.md` into `_gallery/`. The numeric filename prefix sets the display
order.

```yaml
---
title: Low-res FIRE example
source: https://www.alexbgurvi.ch/Firefly/index.html   # or a local path like /GaiaDR3
img: FIRE-lowres-thumb.png
author: Alex Gurvich
---
The body is the blurb shown on hover.  Markdown, so it may contain links.
```

Exactly one entry may add `featured: true`, which pulls it out of the grid and
into the full-width card at the top. That entry may also set `stat` and
`stat_label` (currently `1.5B` / `points, streamed`).

Thumbnails are served as WebP with the PNG as a fallback. The template derives
the WebP name from `img` by swapping the extension, so **both files must exist**:

```bash
python3 -c "
from PIL import Image
im = Image.open('assets/img/gallery/NEW-thumb.png').convert('RGB')
im.thumbnail((800, 800), Image.LANCZOS)
im.save('assets/img/gallery/NEW-thumb.webp', 'WEBP', quality=82, method=6)"
```

800px is the cap because the widest a grid card ever gets is ~400 CSS px, and
the source images are square while the cards are 4:3 — the top and bottom of
each thumbnail are cropped by `object-fit: cover`.

## The hero demo

*Launch live demo* swaps the hero for an iframe of
`https://ageller.github.io/Firefly/src/firefly/index.html` — GitHub Pages serving
the repo root of `main`, so it really is the current build, and it ships
`FIRESampleData`. Nothing is fetched until the button is pressed, and *Close*
resets the iframe to `about:blank` to release the WebGL context.

Two things to know about it:

- It is cross-origin, so the viewer's keyboard shortcuts only fire while the
  iframe has focus, and if GitHub ever sends `X-Frame-Options` or a CSP
  `frame-ancestors` on Pages responses the embed breaks. *Open in new tab* is the
  fallback. Worth re-checking after any deploy that matters.
- Below 700px wide it opens in a new tab instead of in the page.
