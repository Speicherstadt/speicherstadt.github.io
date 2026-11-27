# speicherstadt.org

The website of the Speicherstadt organization: <https://speicherstadt.org/> (German) and
<https://speicherstadt.org/en/> (English).

Plain HTML and CSS, no build step. GitHub Pages serves this repository as it is; `CNAME` holds the
custom domain. The projects without a domain of their own (Stellwerk, Fixpunkt, Steuerzentrale) appear below it
as `/stellwerk/`, `/fixpunkt/` and `/steuerzentrale/`.

- `index.html`, `en/index.html`: the two languages; change both together.
- `assets/style.css`: colours as variables at the top, light and dark mode.
- `assets/img/`: project icons and screenshots (960×600 WebP, `-light` and `-dark`), taken from
  the projects' own repositories. Use their unframed screenshots (Haben `docs/ohne-rahmen/`, Belegt
  `docs/assets/ohne-rahmen/`): the framed ones in `docs/` have a transparent margin for GitHub, which
  turns into a white frame here.
- `assets/hero.js`, `assets/sky.js`: the animated night in the hero (windows and reflections; the
  WebGL sky). `assets/vendor/` holds three.js r170 (MIT), served from this site as well.
- `assets/fonts/`: Inter and Fraunces, SIL Open Font License 1.1, served from this site so no
  third-party server is contacted.
