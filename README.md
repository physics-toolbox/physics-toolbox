# Physics Toolbox

Small interactive physics tools: projectile motion, the pendulum
against its small-angle approximation, and coin tosses against the
binomial distribution. Plain HTML, CSS and ES modules, served as static
assets from Cloudflare Workers.

Live at <https://physics-toolbox.ptbx.workers.dev>.

## Layout

```
public/                 everything that is served
  index.html            the tool index
  tools/<name>/         one directory per tool
  js/, css/             shared assets
  sitemap.xml           generated
  robots.txt            generated
build.py                regenerates the files that must list every page
```

## Adding a tool

1. Create `public/tools/<name>/index.html` with a Japanese `<title>`
   and `<meta name="description">`. Both are what a search result
   shows, so write them for a reader, not for the file.
2. Run `python3 build.py`.
3. Commit and push. The deploy runs off the push.

`build.py` rewrites `sitemap.xml`, `robots.txt` and the canonical link
in every page from what is actually in `public/`. Keeping the sitemap
by hand would eventually miss a tool, and a sitemap that omits a page
is worse than none: it tells a crawler the site has been fully
described when it has not.

The generated files are committed rather than built at deploy time, so
the host needs no Python.

## The pre-commit hook

`.githooks/pre-commit` runs `build.py` and refuses the commit if the
generated files no longer match the pages. It only reports; it never
stages anything for you.

Git does not share hooks through a clone, so enable it once:

```sh
git config core.hooksPath .githooks
```

## robots.txt

Cloudflare serves a managed `robots.txt` when the site has none. It
carries AI content signals but names no sitemap, so this repository
ships its own and overrides it. Restoring the signals means adding them
to the template in `build.py`.

## If the site moves

`SITE_BASE_URL` in `build.py` is the single place the domain appears.
Change it, re-run the script, and the canonical links and sitemap
follow. Pointing them at the wrong host is worse than omitting them.
