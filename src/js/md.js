// Minimal, dependency-free Markdown → HTML renderer for pipeline docs.
// Handles: headings, paragraphs, bold/italic/code/links, ul/ol, blockquotes,
// hr, fenced code, and pipe tables. All text is escaped first (XSS-safe).
window.MD = (() => {
  // Strip em/en-dashes (the #1 AI tell) from rendered markdown too — numeric
  // ranges to a tight hyphen, pause-dashes to a spaced hyphen.
  const esc = (s) => String(s == null ? '' : s)
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1-$2').replace(/\s*[—–]\s*/g, ' - ')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // inline: code → bold → italic → links. Operates on already-escaped text.
  function inline(t) {
    t = t.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    t = t.replace(/\*\*([^*]+)\*\*/g, (_, c) => `<strong>${c}</strong>`);
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, (_, p, c) => `${p}<em>${c}</em>`);
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, txt, href) =>
      `<a href="${href}" target="_blank" rel="noopener">${txt}</a>`);
    return t;
  }

  function render(src) {
    if (!src) return '';
    const lines = esc(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;

    const flushTable = (rows) => {
      if (rows.length < 2) { rows.forEach(r => out.push(`<p>${inline(r)}</p>`)); return; }
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push('<table class="md-table"><thead><tr>' +
        head.map(h => `<th>${inline(h)}</th>`).join('') + '</tr></thead><tbody>' +
        body.map(r => '<tr>' + r.map(c => `<td>${inline(c)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>');
    };

    while (i < lines.length) {
      let line = lines[i];

      if (!line.trim()) { i++; continue; }

      // fenced code
      if (/^```/.test(line)) {
        const buf = []; i++;
        while (i < lines.length && !/^```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(`<pre class="md-pre"><code>${buf.join('\n')}</code></pre>`);
        continue;
      }
      // hr
      if (/^(\s*[-*_]){3,}\s*$/.test(line)) { out.push('<hr class="md-hr">'); i++; continue; }
      // heading
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { const n = h[1].length; out.push(`<h${n} class="md-h md-h${n}">${inline(h[2])}</h${n}>`); i++; continue; }
      // blockquote
      if (/^>\s?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push(`<blockquote class="md-quote">${inline(buf.join(' '))}</blockquote>`);
        continue;
      }
      // table (line contains | and next line is a separator)
      if (line.includes('|') && i + 1 < lines.length && /^[\s|:-]+$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        const rows = [];
        while (i < lines.length && lines[i].includes('|')) { rows.push(lines[i]); i++; }
        flushTable(rows);
        continue;
      }
      // unordered list
      if (/^\s*[-*+]\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*[-*+]\s+/, '')); i++; }
        out.push('<ul class="md-ul">' + buf.map(b => `<li>${inline(b)}</li>`).join('') + '</ul>');
        continue;
      }
      // ordered list
      if (/^\s*\d+\.\s+/.test(line)) {
        const buf = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) { buf.push(lines[i].replace(/^\s*\d+\.\s+/, '')); i++; }
        out.push('<ol class="md-ol">' + buf.map(b => `<li>${inline(b)}</li>`).join('') + '</ol>');
        continue;
      }
      // paragraph (gather until blank)
      const buf = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|>\s?|\s*[-*+]\s|\s*\d+\.\s|```)/.test(lines[i])) {
        buf.push(lines[i]); i++;
      }
      out.push(`<p>${inline(buf.join(' '))}</p>`);
    }
    return out.join('\n');
  }

  return { render };
})();
