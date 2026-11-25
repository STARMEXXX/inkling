// Inky — the Inkling mascot, as an inline SVG string.
export function inky(mood = 'happy', size = 48) {
  const ink = '#1b1340';
  let eyes;
  if (mood === 'sleep') {
    eyes = `<path d="M19.5 40q4.5 3.5 9 0M35.5 40q4.5 3.5 9 0" stroke="${ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  } else {
    const py = mood === 'think' ? 37.5 : 41;
    const px = mood === 'think' ? 1.2 : 0.6;
    eyes = `<ellipse cx="24" cy="40" rx="6.2" ry="6.8" fill="#fff"/><ellipse cx="40" cy="40" rx="6.2" ry="6.8" fill="#fff"/>
      <g class="pupils"><circle cx="${24 + px}" cy="${py}" r="3.3" fill="${ink}"/><circle cx="${40 + px}" cy="${py}" r="3.3" fill="${ink}"/>
      <circle cx="${25.6 + px}" cy="${py - 1.4}" r="1.1" fill="#fff"/><circle cx="${41.6 + px}" cy="${py - 1.4}" r="1.1" fill="#fff"/></g>`;
  }
  const mouth = {
    happy: `<path d="M27.5 50.5q4.5 4.2 9 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
    alert: `<ellipse cx="32" cy="52" rx="2.6" ry="3" fill="${ink}"/>`,
    think: `<path d="M28.5 52h7" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`,
    sleep: `<path d="M29 51.5q3 2.2 6 0" stroke="${ink}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`,
    sad: `<path d="M27.5 53.5q4.5-4 9 0" stroke="${ink}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  }[mood] || '';
  return `<svg class="inky inky-${mood}" width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
    <defs><linearGradient id="inkyG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9F8CFF"/><stop offset="1" stop-color="#5B3DF5"/></linearGradient></defs>
    <path d="M32 4.5C32 4.5 10.5 28.5 10.5 42.5C10.5 54.2 20.1 61.5 32 61.5C43.9 61.5 53.5 54.2 53.5 42.5C53.5 28.5 32 4.5 32 4.5Z" fill="url(#inkyG)"/>
    <ellipse cx="21" cy="28" rx="3.2" ry="6" transform="rotate(28 21 28)" fill="#fff" opacity=".35"/>
    <ellipse cx="16.5" cy="49" rx="3.6" ry="2.2" fill="#FF8FB1" opacity=".55"/><ellipse cx="47.5" cy="49" rx="3.6" ry="2.2" fill="#FF8FB1" opacity=".55"/>
    ${eyes}${mouth}</svg>`;
}
