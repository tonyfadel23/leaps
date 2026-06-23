// Shared view helpers — status meta, evidence segments, escaping.
window.H = (() => {
  const STATUS = {
    pursue: { label:'Pursue',     color:'var(--pursue)', weak:'var(--pursue-weak)' },
    needs:  { label:'Needs more', color:'var(--needs)',  weak:'var(--needs-weak)'  },
    kill:   { label:'Killed',     color:'var(--kill)',   weak:'var(--kill-weak)'   },
    draft:  { label:'Draft',      color:'var(--ink-3)',  weak:'var(--surface-3)'   },
  };
  const status = (v) => STATUS[v] || STATUS.needs;

  // 5-segment evidence strength bar (0–5)
  const segs = (n, onColor = 'var(--ink-1)') =>
    [0,1,2,3,4].map(i =>
      `<i class="${i < n ? 'on' : ''}"${i < n && onColor !== 'var(--ink-1)' ? ` style="background:${onColor}"` : ''}></i>`
    ).join('');

  const strengthColor = (n) => n >= 4 ? 'var(--pursue)' : (n >= 3 ? 'var(--accent)' : 'var(--needs)');

  // Em/en-dashes are the #1 AI design tell. Normalize them out of ALL rendered
  // text (LEAPs' own copy and the user's pipeline data alike): numeric ranges
  // collapse to a tight hyphen (5-10), pause-dashes become a spaced hyphen.
  const normDash = (s) => String(s == null ? '' : s)
    .replace(/(\d)\s*[—–]\s*(\d)/g, '$1-$2')
    .replace(/\s*[—–]\s*/g, ' - ');

  const esc = (s) => normDash(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  return { STATUS, status, segs, strengthColor, esc, normDash };
})();
