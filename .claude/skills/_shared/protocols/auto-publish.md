# Auto-Publish

After a skill finishes its synthesis, refresh the brief deterministically.

Run: `node scripts/build-brief.js {slug}` — this rebuilds `.briefdata.json` from the source `.md` files, computes conviction (one engine), and renders `brief.html`. Then `open` it for the PM. No manual step.
