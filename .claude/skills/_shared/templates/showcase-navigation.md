# Showcase Navigation

Mandatory routing JS for `sketches/index.html` (variation explorer, one phone)
and `sketches/final-showcase.html` (chosen direction). It wires deep-linking via
`?entry=` so a brief or a teammate can open straight to one variation.

## Contract

- Each variation is a standalone file: `variation-a.html`, `variation-b.html`, …
- The explorer loads a variation into an `<iframe id="stage">` inside the phone shell.
- `?entry=variation-b` (or `?entry=b`) opens that variation directly; no param =
  the first/default.
- Switching variations updates the URL with `history.replaceState` so the link
  stays shareable.

## Drop-in script

```html
<iframe id="stage" title="prototype"></iframe>
<nav id="variations">
  <button data-entry="variation-a">A</button>
  <button data-entry="variation-b">B</button>
  <!-- one button per variation -->
</nav>

<script>
  const DEFAULT_ENTRY = 'variation-a';
  const stage = document.getElementById('stage');

  function normalize(v) {
    if (!v) return DEFAULT_ENTRY;
    return /^variation-/.test(v) ? v : 'variation-' + v;   // accept ?entry=b
  }
  function load(entry) {
    const file = normalize(entry) + '.html';
    stage.src = file;
    const url = new URL(location.href);
    url.searchParams.set('entry', normalize(entry).replace('variation-', ''));
    history.replaceState(null, '', url);                   // keep the link shareable
    document.querySelectorAll('#variations [data-entry]').forEach(b =>
      b.setAttribute('aria-current', b.dataset.entry === normalize(entry) ? 'true' : 'false'));
  }

  document.getElementById('variations').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-entry]');
    if (btn) load(btn.dataset.entry);
  });

  load(new URLSearchParams(location.search).get('entry'));  // honor ?entry= on open
</script>
```

`final-showcase.html` uses the same script but with a single fixed entry (the
chosen direction) and no variation nav.
