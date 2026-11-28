#!/usr/bin/env python3
"""Show current GitHub star counts as a pill over each app card's screenshot.

Run daily by .github/workflows/stars.yml. Each card carries a marker comment
<!--stars:REPO--> followed by the pill this script writes.
"""
import json, os, re, urllib.request

STAR = ('<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">'
        '<path fill="currentColor" d="M8 .8l2.2 4.6 5 .7-3.6 3.5.9 5L8 12.2l-4.5 2.4.9-5L.8 6.1l5-.7z"/></svg>')
PAGES = {"index.html": ("Sterne auf GitHub", "."), "en/index.html": ("stars on GitHub", ",")}
MARKER = re.compile(r'<!--stars:([a-z0-9-]+)-->(?:<a class="stars"[^>]*>.*?</a>)?')


def stars(repo):
    req = urllib.request.Request(f"https://api.github.com/repos/Speicherstadt/{repo}",
                                 headers={"Accept": "application/vnd.github+json"})
    if os.environ.get("GITHUB_TOKEN"):
        req.add_header("Authorization", f"Bearer {os.environ['GITHUB_TOKEN']}")
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)["stargazers_count"]


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cache = {}
    for page, (label, sep) in PAGES.items():
        path = os.path.join(root, page)
        html = open(path, encoding="utf-8").read()

        def fill(m):
            repo = m.group(1)
            if repo not in cache:
                cache[repo] = stars(repo)
            n = cache[repo]
            marker = f"<!--stars:{repo}-->"
            num = f"{n:,}".replace(",", sep)
            return (f'{marker}<a class="stars" href="https://github.com/Speicherstadt/{repo}/stargazers" '
                    f'title="{num} {label}" aria-label="{num} {label}">{STAR}{num}</a>')

        new = MARKER.sub(fill, html)
        if new != html:
            open(path, "w", encoding="utf-8").write(new)
            print(f"updated {page}")
    print(json.dumps(cache))


if __name__ == "__main__":
    main()
