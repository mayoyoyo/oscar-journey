import React from 'react';
import LANGUAGES from '../data/languages.json';

// Convert 2-letter ISO country code → regional-indicator flag emoji.
// "US" → 🇺🇸 ; emoji flags are two RIS code points based on the country code.
function flagEmoji(cc) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(
    0x1F1E6 + cc.charCodeAt(0) - 65,
    0x1F1E6 + cc.charCodeAt(1) - 65,
  );
}

// Language → canonical flag. The pill's job is to signal "this film is in
// language X" — flag should reflect the language, not where it was shot.
// Before this was country-based, which meant Incendies (French audio,
// Canadian crew) rendered 🇨🇦 + "French" — the two signals disagreed.
const LANG_TO_CC = {
  'French': 'FR',
  'Spanish': 'ES',
  'Italian': 'IT',
  'German': 'DE',
  'Portuguese': 'PT',
  'Swedish': 'SE',
  'Danish': 'DK',
  'Norwegian': 'NO',
  'Finnish': 'FI',
  'Dutch': 'NL',
  'Russian': 'RU',
  'Polish': 'PL',
  'Czech': 'CZ',
  'Hungarian': 'HU',
  'Romanian': 'RO',
  'Greek': 'GR',
  'Turkish': 'TR',
  'Bosnian': 'BA',
  'Serbian': 'RS',
  'Macedonian': 'MK',
  'Armenian': 'AM',
  'Persian': 'IR',
  'Arabic': 'SA',
  'Hebrew': 'IL',
  'Hindi': 'IN',
  'Bengali': 'IN',    // Bengali films in the catalog are Indian productions
  'Tamil':   'IN',
  'Mandarin': 'CN',
  'Cantonese': 'HK',
  'Japanese': 'JP',
  'Korean':   'KR',
  'Vietnamese': 'VN',
  'Thai': 'TH',
  'Indonesian': 'ID',
  'Zulu': 'ZA',
  'Wolof': 'SN',
  'American Sign': 'US',
};

// Narrow country-based overrides — cases where the country flag is
// genuinely the right cultural read, even though the language has a
// different "homeland":
//   - Brazilian Portuguese films render 🇧🇷 (not 🇵🇹) — cultural context
//     is overwhelmingly Brazilian for City of God, Central Station, etc.
//   - Taiwanese Mandarin films render 🇹🇼 (not 🇨🇳) — Edward Yang /
//     Hou Hsiao-hsien films are Taiwanese cinema, distinct from PRC.
const COUNTRY_OVERRIDE = {
  'Portuguese:Brazil': 'BR',
  'Mandarin:Taiwan':   'TW',
};

// OMDb's Country string → ISO 3166 alpha-2.
// Historical / alternative names (Soviet Union, West Germany, UK) map to
// the closest living equivalent. Kept around as a defensive fallback when
// a language isn't in LANG_TO_CC — shouldn't happen for our catalog.
const COUNTRY_TO_CC = {
  'USA': 'US', 'United States': 'US',
  'UK': 'GB', 'United Kingdom': 'GB', 'England': 'GB', 'Scotland': 'GB',
  'France': 'FR',
  'Germany': 'DE', 'West Germany': 'DE', 'East Germany': 'DE',
  'Italy': 'IT',
  'Japan': 'JP',
  'South Korea': 'KR', 'North Korea': 'KP',
  'Spain': 'ES',
  'Soviet Union': 'RU', 'Russia': 'RU', 'Russian Federation': 'RU',
  'Mexico': 'MX',
  'Canada': 'CA',
  'China': 'CN',
  'Taiwan': 'TW',
  'Hong Kong': 'HK',
  'India': 'IN',
  'Brazil': 'BR',
  'Argentina': 'AR',
  'Chile': 'CL',
  'Colombia': 'CO',
  'Cuba': 'CU',
  'Peru': 'PE',
  'Sweden': 'SE',
  'Denmark': 'DK',
  'Norway': 'NO',
  'Finland': 'FI',
  'Iceland': 'IS',
  'Netherlands': 'NL',
  'Belgium': 'BE',
  'Austria': 'AT',
  'Switzerland': 'CH',
  'Poland': 'PL',
  'Czech Republic': 'CZ', 'Czechoslovakia': 'CZ',
  'Hungary': 'HU',
  'Romania': 'RO',
  'Portugal': 'PT',
  'Greece': 'GR',
  'Iran': 'IR',
  'Israel': 'IL',
  'Lebanon': 'LB',
  'Turkey': 'TR',
  'Saudi Arabia': 'SA',
  'United Arab Emirates': 'AE',
  'Egypt': 'EG',
  'Morocco': 'MA',
  'Algeria': 'DZ',
  'Tunisia': 'TN',
  'Senegal': 'SN',
  'South Africa': 'ZA',
  'Nigeria': 'NG',
  'Kenya': 'KE',
  'Thailand': 'TH',
  'Vietnam': 'VN',
  'Indonesia': 'ID',
  'Philippines': 'PH',
  'Malaysia': 'MY',
  'Australia': 'AU',
  'New Zealand': 'NZ',
  'Ireland': 'IE',
  'Yugoslavia': 'RS', // historical — map to Serbia as rough successor
  'Serbia': 'RS',
  'Croatia': 'HR',
  'Bosnia and Herzegovina': 'BA',
  'Bulgaria': 'BG',
  'Ukraine': 'UA',
  'Kazakhstan': 'KZ',
  'Georgia': 'GE',
  'Armenia': 'AM',
  'Bangladesh': 'BD',
  'Sri Lanka': 'LK',
  'Pakistan': 'PK',
  'Afghanistan': 'AF',
  'Mongolia': 'MN',
  'Nepal': 'NP',
  'Bhutan': 'BT',
};

export function getLanguageInfo(movie) {
  return LANGUAGES[movie.id] || null;
}

// Resolve a movie's representative flag emoji using the same logic as the
// full language pill — country override → language → country → globe.
// Returns null if the film has no language metadata.
function resolveFlag(movie) {
  const info = LANGUAGES[movie.id];
  if (!info) return null;
  const cc =
    COUNTRY_OVERRIDE[`${info.lang}:${info.country}`] ||
    LANG_TO_CC[info.lang] ||
    COUNTRY_TO_CC[info.country] ||
    null;
  return {
    emoji: cc ? flagEmoji(cc) : '🌐',
    title: `${info.lang}${info.country ? ` — ${info.country}` : ''}`,
  };
}

// Bare flag emoji — no pill chrome. Used in the A-Z list row right after
// the Oscar statuette so the language signal is co-located with the
// other film-identity glyphs, and stays visible on mobile where the full
// language pill would be too wide.
export function LanguageFlag({ movie }) {
  const resolved = resolveFlag(movie);
  if (!resolved) return null;
  return (
    <span className="film-row-flag" title={resolved.title} aria-label={resolved.title}>
      {resolved.emoji}
    </span>
  );
}

export default function LanguagePill({ movie }) {
  const info = LANGUAGES[movie.id];
  if (!info) return null;
  // Resolution order: country override (Brazilian Portuguese, Taiwanese
  // Mandarin) → language → country → generic globe.
  const cc =
    COUNTRY_OVERRIDE[`${info.lang}:${info.country}`] ||
    LANG_TO_CC[info.lang] ||
    COUNTRY_TO_CC[info.country] ||
    null;
  const flag = cc ? flagEmoji(cc) : '🌐';
  return (
    <span
      className="badge-lang-sm"
      title={`${info.lang}${info.country ? ` — ${info.country}` : ''}`}
    >
      <span className="badge-lang-flag" aria-hidden="true">{flag}</span>
      <span className="badge-lang-label">{info.lang}</span>
    </span>
  );
}
