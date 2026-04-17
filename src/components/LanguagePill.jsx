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

// OMDb's Country string → ISO 3166 alpha-2.
// Historical / alternative names (Soviet Union, West Germany, UK) map to
// the closest living equivalent.
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

export default function LanguagePill({ movie }) {
  const info = LANGUAGES[movie.id];
  if (!info) return null;
  const cc = COUNTRY_TO_CC[info.country];
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
