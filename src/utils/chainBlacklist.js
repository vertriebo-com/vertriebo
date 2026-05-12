/**
 * ============================================================
 * Chain Blacklist — 100+ bekannte Filialketten
 * ============================================================
 * Wird verwendet von isBadFit() in leadSearchEngine.js
 * um Franchises und Kettenbetriebe zu erkennen und auszusortieren.
 * 
 * WICHTIG: Diese Liste ist statisch für Phase 1.
 * Phase 2: KI-gestützte Erkennung (Bewertungsanzahl, Website-Muster, etc.)
 */

export const CHAIN_KEYWORDS = [
  // ── Lebensmittelhandel / Discounter ──
  'aldi', 'aldisüd', 'aldinord', 'lidl', 'penny', 'netto', 'rewe', 'edeka', 'kaufland',
  'real', 'marktkauf', 'selgros', 'metro', 'makro', 'costco', 'sam\'s club',
  'aldi talk', 'aldi nord', 'aldi süd', 'kaufland express',

  // ── Drogerien / Apotheken ──
  'dm', 'rossmann', 'müller', 'apotheke am markt', 'apotheke zur post',

  // ── Bekleidung / Mode ──
  'h&m', 'zara', 'primark', 'c&a', 'next', 'gap', 'mango', 'esprit', 'tommy hilfiger',
  'calvin klein', 'guess', 'diesel', 'tommy jeans', 'united colors',

  // ── Schuhe / Sportartikel ──
  'deichmann', 'schuh shop', 'foot locker', 'intersport', 'decathlon', 'nike store',
  'adidas store', 'puma store', 'birkenstock', 'office shoes',

  // ── Paketdienste / Logistik ──
  'deutsche post', 'dhl', 'ups store', 'fedex', 'hermes', 'dpd', 'gls',
  'postamt', 'postfiliale', 'post partner', 'parcelshop',

  // ── Banken / Finanzdienstleistungen ──
  'sparkasse', 'deutsche bank', 'commerzbank', 'comdirect', 'ing-diba',
  'ing diba', 'volkswagen bank', 'hypovereinsbank', 'unicredit', 'santander',
  'postbank', 'targobank', 'consorsbank', 'deutsche börse', 'fiducia',
  'easybank', 'comdirect bank', 'ing', 'dkb',

  // ── Versicherungen ──
  'allianz', 'axa', 'zurich', 'huk-coburg', 'gothaer', 'provinzial',
  'ergo', 'generali', 'swiss life', 'münchener rück', 'debeka',

  // ── Gastronomie / Fast Food ──
  'mcdonalds', 'burger king', 'subway', 'kfc', 'pizza hut', 'dominos',
  'vapiano', 'maredo', 'segafredo', 'starbucks', 'costa coffee',
  'caffè nero', 'nespresso', 'dallmayr', 'wörwag', 'filialen', 'restaurant kette',

  // ── Hotels / Unterkünfte ──
  'hilton', 'marriott', 'accor', 'ibis', 'novotel', 'mercure', 'sofitel',
  'holiday inn', 'hyatt', 'sheraton', 'radisson', 'best western', 'motel one',
  'hotel chain', 'hotelkette',

  // ── Einzelhandel / Department Store ──
  'karstadt', 'kaufhof', 'galeria', 'peek & cloppenburg', 'breuninger',
  'engelhorn', 'mode fischer', 'sportarena', 'herrenmode fischer',

  // ── Autovermietung / Autowerkstätten ──
  'sixt', 'hertz', 'avis', 'enterprise', 'europcar', 'budget',
  'foxcar', 'rentalcars', 'goldcar', 'autovermietung chain',

  // ── Fitnessstudios / Wellness ──
  'fitx', 'mcfit', 'easyfit', 'fitness first', 'john reed', 'sportstadt',
  'fitline', 'gyms', 'fitnessstudio kette',

  // ── Beauty / Friseure ──
  'david garrett', 'klier', 'haar und farbe', 'mueller friseur', 'friseursalon kette',

  // ── Optikergeschäfte ──
  'fielmann', 'apollo optik', 'optiker klauer', 'visilab', 'kramer optik',

  // ── Telekommunikation ──
  'telekom', 't-mobile', 'vodafone', 'o2', 'telefonica', 'telefónica',
  'e-plus', 'fonic', 'mobilcom', 'congstar', 'aldi talk', 'berlin telekom',

  // ── Energieversorger ──
  'vattenfall', 'eon', 'rwe', 'envia', 'stadtwerke', 'grundversorgung',

  // ── Kino / Freizeit ──
  'cinemaxx', 'uci', 'cinemaxx junior', 'cinestar', 'multiplex',

  // ── Möbelhandel ──
  'ikea', 'hoffner', 'segmuller', 'mobel martin', 'poco', 'roller',
  'xxxlutz', 'conforama', 'moebel kraft',

  // ── Baumarkt ──
  'obi', 'bauhaus', 'hornbach', 'hagebau', 'baumarkt held', 'hellweg',
  'praktiker', 'gamma', 'baumärkte kette',

  // ── Gartencenter ──
  'dehner', 'gartencenter müller', 'flora toskana', 'gartencenter kette',

  // ── Spielzeug ──
  'toys r us', 'smyths', 'galeria toys', 'spielzeugladen kette',

  // ── Rechtsanwälte / Steuerberater (bekannte Netzwerke) ──
  'flick gocke schaumburg', 'cms', 'clifford chance', 'taylor wessing',
  'linklaters', 'linklaters law firm', 'dentons', 'dechert llp',

  // ── Wirtschaftsprüfer ──
  'big four', 'deloitte', 'ey', 'kpmg', 'pwc', 'pricewaterhousecoopers',

  // ── Managementberatung ──
  'mckinsey', 'bcg', 'bain', 'accenture', 'capgemini', 'ibm consulting',

  // ── Buchhandel ──
  'hugendubel', 'thalia', 'waterstones', 'osiander', 'buchhandlung kette',

  // ── Sonstige ──
  'franchise', 'kette', 'filiale', 'niederlassung', 'zentrale', 'konzern',
  'holding', 'group headquarters', 'corporate', 'multinational',
];

/**
 * Prüfe, ob ein Unternehmensname auf einen Kettenbetrieb hindeutet
 * @param {string} name
 * @returns {boolean}
 */
export function isChainByName(name) {
  if (!name) return false;
  const nameLower = name.toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();

  for (const keyword of CHAIN_KEYWORDS) {
    // Exakter Match oder als ganzes Wort
    if (nameLower === keyword || nameLower.includes(` ${keyword} `) || nameLower.startsWith(`${keyword} `) || nameLower.endsWith(` ${keyword}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Prüfe, ob Bewertungsanzahl auf Kette hindeutet
 * @param {number} reviewCount
 * @returns {number} Wahrscheinlichkeit 0-1
 */
export function chainProbabilityByReviews(reviewCount) {
  if (!reviewCount) return 0;
  // >500 Reviews = 90% Wahrscheinlichkeit Kette
  if (reviewCount > 500) return 0.9;
  // 200-500 Reviews = 40% Wahrscheinlichkeit
  if (reviewCount > 200) return 0.4;
  // <200 Reviews = 5% Wahrscheinlichkeit (Ausnahme: sehr beliebter Lokalbetrieb)
  if (reviewCount > 50) return 0.05;
  return 0;
}

/**
 * Kombinierter Chain-Score
 * @param {object} candidate - Google Place Candidate
 * @returns {object} { isLikelyChain: boolean, probability: 0-1, signals: string[] }
 */
export function assessChainProbability(candidate) {
  const signals = [];
  let probability = 0;

  // Signal 1: Name-Match
  const nameMatches = isChainByName(candidate.name);
  if (nameMatches) {
    signals.push('Kettenbegriff im Namen');
    probability += 0.6;
  }

  // Signal 2: Bewertungsanzahl
  const reviewCount = candidate.user_ratings_total || candidate.userRatingCount || 0;
  const reviewProb = chainProbabilityByReviews(reviewCount);
  if (reviewProb > 0) {
    signals.push(`${reviewCount} Bewertungen`);
    probability += reviewProb * 0.4;
  }

  probability = Math.min(1, probability);

  return {
    isLikelyChain: probability >= 0.5,
    probability: Math.round(probability * 100) / 100,
    signals,
  };
}