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

PUBLIC_DIR = Path(__file__).parent / "public"
CANONICAL_RE = re.compile(r'\n?\s*<link rel="canonical"[^>]*>')
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


def set_canonical(paths):
  """Point every page at its own URL, replacing any earlier tag."""
  for path in paths:
    relative = "index.html" if path == "/" else f"{path.strip('/')}/index.html"
    file = PUBLIC_DIR / relative
    html = CANONICAL_RE.sub("", file.read_text(encoding="utf-8"))
    tag = f'\n    <link rel="canonical" href="{SITE_BASE_URL}{path}" />'
    html = html.replace(HEAD_ANCHOR, HEAD_ANCHOR + tag, 1)
    file.write_text(html, encoding="utf-8")


def main():
  paths = page_paths()
  write_sitemap(paths)
  write_robots()
  set_canonical(paths)
  print(f"build: {len(paths)} page(s)")
  for path in paths:
    print(f"  {SITE_BASE_URL}{path}")


if __name__ == "__main__":
  main()
