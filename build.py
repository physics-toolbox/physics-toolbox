"""Regenerate the files that must list every page.

Kept as a script rather than hand-edited files because a sitemap that
silently misses a new tool is worse than none: it tells a crawler the
site has been fully described when it has not.
"""

import re
from pathlib import Path

# Absolute URLs are required in canonical links and the sitemap. Change
# this in one place if the site ever moves to its own domain.
SITE_BASE_URL = "https://physics-toolbox.ptbx.workers.dev"

# Search Console ownership. Emitted on every page rather than kept
# as a single uploaded file, so a new tool proves ownership without
# anyone remembering to, and no one file can be lost and take the
# verification with it.
GOOGLE_SITE_VERIFICATION = "dS_4E3Jhi096r8VXrxyd1PcpG0NzPhnYGtcGjtiQ7X8"

PUBLIC_DIR = Path(__file__).parent / "public"
CANONICAL_RE = re.compile(r'\n?\s*<link rel="canonical"[^>]*>')
VERIFY_RE = re.compile(
    r'\n?\s*<meta name="google-site-verification"[^>]*>')
HEAD_ANCHOR = "</title>"


def page_paths():
  """Every published page, index first, then tools in name order."""
  paths = ["/"]
  for tool in sorted((PUBLIC_DIR / "tools").iterdir()):
    if (tool / "index.html").is_file():
      paths.append(f"/tools/{tool.name}/")
  return paths


def write_sitemap(paths):
  urls = "\n".join(
      f"  <url><loc>{SITE_BASE_URL}{p}</loc></url>" for p in paths)
  (PUBLIC_DIR / "sitemap.xml").write_text(
      '<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
      f"{urls}\n</urlset>\n", encoding="utf-8")


def write_robots():
  # Replaces the managed robots.txt Cloudflare serves by default, which
  # carries content signals but names no sitemap.
  (PUBLIC_DIR / "robots.txt").write_text(
      "User-agent: *\nAllow: /\n"
      f"Sitemap: {SITE_BASE_URL}/sitemap.xml\n", encoding="utf-8")


def set_head_tags(paths):
  """Give every page its canonical URL and the ownership tag."""
  for path in paths:
    relative = ("index.html" if path == "/"
                else f"{path.strip('/')}/index.html")
    file = PUBLIC_DIR / relative
    html = file.read_text(encoding="utf-8")
    html = VERIFY_RE.sub("", CANONICAL_RE.sub("", html))
    tags = (
        f'\n    <link rel="canonical" href="{SITE_BASE_URL}{path}" />'
        '\n    <meta name="google-site-verification"'
        f' content="{GOOGLE_SITE_VERIFICATION}" />'
    )
    html = html.replace(HEAD_ANCHOR, HEAD_ANCHOR + tags, 1)
    file.write_text(html, encoding="utf-8")


def main():
  paths = page_paths()
  write_sitemap(paths)
  write_robots()
  set_head_tags(paths)
  print(f"build: {len(paths)} page(s)")
  for path in paths:
    print(f"  {SITE_BASE_URL}{path}")


if __name__ == "__main__":
  main()
