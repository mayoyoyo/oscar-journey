// Detect user's country code for JustWatch region
function getCountryCode() {
  try {
    // Try Intl API first — most reliable
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    // Map common timezones to country codes
    if (tz.startsWith('America/Toronto') || tz.startsWith('America/Vancouver') || tz.startsWith('America/Edmonton') || tz.startsWith('America/Winnipeg') || tz.startsWith('America/Halifax') || tz.startsWith('America/Montreal')) return 'ca';
    if (tz.startsWith('America/') && !tz.includes('Argentina') && !tz.includes('Mexico') && !tz.includes('Bogota') && !tz.includes('Lima') && !tz.includes('Santiago') && !tz.includes('Sao_Paulo')) return 'us';
    if (tz.startsWith('Europe/London')) return 'uk';
    if (tz.startsWith('Europe/Paris')) return 'fr';
    if (tz.startsWith('Europe/Berlin')) return 'de';
    if (tz.startsWith('Australia/')) return 'au';
    if (tz.startsWith('Asia/Tokyo')) return 'jp';
    if (tz.startsWith('Asia/Seoul')) return 'kr';
  } catch {}

  try {
    // Fallback: navigator.language
    const parts = (navigator.language || '').split('-');
    if (parts[1]) return parts[1].toLowerCase();
  } catch {}

  return 'us';
}

const countryCode = getCountryCode();

export function justWatchUrl(title) {
  return `https://www.justwatch.com/${countryCode}/search?q=${encodeURIComponent(title)}`;
}
