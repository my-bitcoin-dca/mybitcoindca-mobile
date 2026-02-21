/**
 * Country Configuration
 * Defines countries and their exchange availability
 */

// Countries where Binance.com is available
const BINANCE_COUNTRIES = new Set([
  'AL', // Albania
  'DZ', // Algeria
  'AO', // Angola
  'AI', // Anguilla
  'AG', // Antigua and Barbuda
  'AR', // Argentina
  'AM', // Armenia
  'AU', // Australia
  'AT', // Austria
  'AZ', // Azerbaijan
  'BS', // Bahamas
  'BH', // Bahrain
  'BB', // Barbados
  'BY', // Belarus
  'BE', // Belgium
  'BZ', // Belize
  'BJ', // Benin
  'BM', // Bermuda
  'BT', // Bhutan
  'BO', // Bolivia
  'BA', // Bosnia and Herzegovina
  'BW', // Botswana
  'BR', // Brazil
  'BN', // Brunei
  'BG', // Bulgaria
  'BF', // Burkina Faso
  'CV', // Cabo Verde
  'KH', // Cambodia
  'CM', // Cameroon
  'CA', // Canada
  'KY', // Cayman Islands
  'TD', // Chad
  'CL', // Chile
  'CO', // Colombia
  'CD', // Congo (DRC)
  'CG', // Congo
  'CR', // Costa Rica
  'CI', // Cote d'Ivoire
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czechia
  'DK', // Denmark
  'DM', // Dominica
  'DO', // Dominican Republic
  'EC', // Ecuador
  'SV', // El Salvador
  'EE', // Estonia
  'SZ', // Eswatini
  'FJ', // Fiji
  'FI', // Finland
  'FR', // France
  'GA', // Gabon
  'GM', // Gambia
  'GE', // Georgia
  'DE', // Germany
  'GH', // Ghana
  'GR', // Greece
  'GD', // Grenada
  'GT', // Guatemala
  'GW', // Guinea-Bissau
  'GY', // Guyana
  'HN', // Honduras
  'HK', // Hong Kong
  'HU', // Hungary
  'IS', // Iceland
  'ID', // Indonesia
  'IQ', // Iraq
  'IE', // Ireland
  'IL', // Israel
  'IT', // Italy
  'JM', // Jamaica
  'JP', // Japan
  'JO', // Jordan
  'KZ', // Kazakhstan
  'KE', // Kenya
  'KR', // South Korea
  'XK', // Kosovo
  'KW', // Kuwait
  'KG', // Kyrgyzstan
  'LA', // Laos
  'LV', // Latvia
  'LB', // Lebanon
  'LR', // Liberia
  'LY', // Libya
  'LT', // Lithuania
  'LU', // Luxembourg
  'MO', // Macao
  'MG', // Madagascar
  'MW', // Malawi
  'MV', // Maldives
  'ML', // Mali
  'MT', // Malta
  'MR', // Mauritania
  'MU', // Mauritius
  'MX', // Mexico
  'FM', // Micronesia
  'MD', // Moldova
  'MN', // Mongolia
  'ME', // Montenegro
  'MS', // Montserrat
  'MZ', // Mozambique
  'MM', // Myanmar
  'NA', // Namibia
  'NR', // Nauru
  'NP', // Nepal
  'NZ', // New Zealand
  'NI', // Nicaragua
  'NE', // Niger
  'NG', // Nigeria
  'NO', // Norway
  'OM', // Oman
  'PK', // Pakistan
  'PW', // Palau
  'PA', // Panama
  'PG', // Papua New Guinea
  'PY', // Paraguay
  'PE', // Peru
  'PH', // Philippines
  'PL', // Poland
  'PT', // Portugal
  'QA', // Qatar
  'MK', // North Macedonia
  'RO', // Romania
  'RU', // Russia
  'RW', // Rwanda
  'KN', // Saint Kitts and Nevis
  'LC', // Saint Lucia
  'VC', // Saint Vincent and the Grenadines
  'ST', // Sao Tome and Principe
  'SA', // Saudi Arabia
  'SN', // Senegal
  'RS', // Serbia
  'SC', // Seychelles
  'SL', // Sierra Leone
  'SG', // Singapore
  'SK', // Slovakia
  'SI', // Slovenia
  'SB', // Solomon Islands
  'ZA', // South Africa
  'ES', // Spain
  'LK', // Sri Lanka
  'SR', // Suriname
  'SE', // Sweden
  'CH', // Switzerland
  'TW', // Taiwan
  'TJ', // Tajikistan
  'TZ', // Tanzania
  'TH', // Thailand
  'TO', // Tonga
  'TT', // Trinidad and Tobago
  'TN', // Tunisia
  'TR', // Turkey
  'TM', // Turkmenistan
  'TC', // Turks and Caicos Islands
  'UG', // Uganda
  'UA', // Ukraine
  'AE', // United Arab Emirates
  'GB', // United Kingdom
  'UY', // Uruguay
  'UZ', // Uzbekistan
  'VU', // Vanuatu
  'VE', // Venezuela
  'VN', // Vietnam
  'VG', // British Virgin Islands
  'YE', // Yemen
  'ZM', // Zambia
  'ZW', // Zimbabwe
]);

// Countries where Kraken is available
const KRAKEN_COUNTRIES = new Set([
  // Europe - EEA countries
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czechia
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IS', // Iceland
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LI', // Liechtenstein
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'NO', // Norway
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  'GB', // United Kingdom
  // North America
  'CA', // Canada
  'US', // United States
  // Rest of World
  'AR', // Argentina
  'AU', // Australia
  'BM', // Bermuda
  'SG', // Singapore
]);

// Countries where Kraken is explicitly prohibited
const KRAKEN_PROHIBITED = new Set([
  'AF', // Afghanistan
  'BY', // Belarus
  'CU', // Cuba
  'CD', // Democratic Republic of the Congo
  'IR', // Iran
  'IQ', // Iraq
  'JP', // Japan
  'LY', // Libya
  'KP', // North Korea
  'RU', // Russia
  'SD', // Sudan
  'SS', // South Sudan
  'SY', // Syria
]);

// All supported countries with their names
export const COUNTRIES = [
  { code: 'AL', name: 'Albania' },
  { code: 'DZ', name: 'Algeria' },
  { code: 'AO', name: 'Angola' },
  { code: 'AI', name: 'Anguilla' },
  { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaijan' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' },
  { code: 'BE', name: 'Belgium' },
  { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' },
  { code: 'BM', name: 'Bermuda' },
  { code: 'BT', name: 'Bhutan' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' },
  { code: 'BW', name: 'Botswana' },
  { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' },
  { code: 'CA', name: 'Canada' },
  { code: 'KY', name: 'Cayman Islands' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CO', name: 'Colombia' },
  { code: 'CD', name: 'Congo (DRC)' },
  { code: 'CG', name: 'Congo' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'CI', name: "Cote d'Ivoire" },
  { code: 'HR', name: 'Croatia' },
  { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czechia' },
  { code: 'DK', name: 'Denmark' },
  { code: 'DM', name: 'Dominica' },
  { code: 'DO', name: 'Dominican Republic' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'EE', name: 'Estonia' },
  { code: 'SZ', name: 'Eswatini' },
  { code: 'FJ', name: 'Fiji' },
  { code: 'FI', name: 'Finland' },
  { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GW', name: 'Guinea-Bissau' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HK', name: 'Hong Kong' },
  { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IQ', name: 'Iraq' },
  { code: 'IE', name: 'Ireland' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' },
  { code: 'KZ', name: 'Kazakhstan' },
  { code: 'KE', name: 'Kenya' },
  { code: 'KR', name: 'South Korea' },
  { code: 'XK', name: 'Kosovo' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' },
  { code: 'LB', name: 'Lebanon' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' },
  { code: 'LU', name: 'Luxembourg' },
  { code: 'MO', name: 'Macao' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' },
  { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' },
  { code: 'MT', name: 'Malta' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldova' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MS', name: 'Montserrat' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'MK', name: 'North Macedonia' },
  { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' },
  { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' },
  { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' },
  { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'ST', name: 'Sao Tome and Principe' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' },
  { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'TW', name: 'Taiwan' },
  { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'TM', name: 'Turkmenistan' },
  { code: 'TC', name: 'Turks and Caicos Islands' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'VG', name: 'British Virgin Islands' },
  { code: 'YE', name: 'Yemen' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabwe' },
];

/**
 * Check if Binance is available in a country
 */
export function isBinanceAvailable(countryCode) {
  return BINANCE_COUNTRIES.has(countryCode);
}

/**
 * Check if Kraken is available in a country
 */
export function isKrakenAvailable(countryCode) {
  return KRAKEN_COUNTRIES.has(countryCode) && !KRAKEN_PROHIBITED.has(countryCode);
}

/**
 * Get available exchanges for a country
 * Returns array of exchange IDs
 */
export function getAvailableExchanges(countryCode) {
  const exchanges = [];

  if (isBinanceAvailable(countryCode)) {
    exchanges.push('binance');
  }

  if (isKrakenAvailable(countryCode)) {
    exchanges.push('kraken');
  }

  return exchanges;
}

/**
 * Get country name by code
 */
export function getCountryName(countryCode) {
  const country = COUNTRIES.find(c => c.code === countryCode);
  return country ? country.name : countryCode;
}

/**
 * Check if a country has any available exchanges
 */
export function hasAvailableExchanges(countryCode) {
  return getAvailableExchanges(countryCode).length > 0;
}

/**
 * Get flag emoji for a country code
 * Converts country code to regional indicator symbols (flag emoji)
 */
export function getCountryFlag(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '';

  const code = countryCode.toUpperCase();
  const offset = 0x1F1E6 - 65; // Regional Indicator 'A' minus ASCII 'A'

  return String.fromCodePoint(
    code.charCodeAt(0) + offset,
    code.charCodeAt(1) + offset
  );
}
