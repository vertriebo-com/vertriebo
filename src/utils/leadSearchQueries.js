// ─── Search Query Generation für Lead-Generierung ──────────────────────────────

// Keyword-Mappings für Zielgruppen → Google Places Suchbegriffe
const CUSTOMER_TYPE_KEYWORDS = {
  "Hausverwaltungen": ["Hausverwaltung"],
  "Immobilienverwaltungen": ["Immobilienverwaltung", "Property Management"],
  "Bürogebäude": ["Büro", "Office", "Geschäftsgebäude"],
  "Arztpraxen": ["Zahnarzt", "Zahnarztpraxis", "Dentist"],
  "Zahnarztpraxen": ["Zahnarzt", "Zahnarztpraxis", "Dentist"],
  "Kanzleien": ["Anwalt", "Rechtsanwalt", "Kanzlei", "Law Office"],
  "Steuerkanzleien": ["Steuerberater", "Tax Advisor"],
  "Autohäuser": ["Autohaus", "Autohändler", "Car Dealer"],
  "Werkstätten": ["Autowerkstatt", "KFZ-Werkstatt", "Auto Repair"],
  "Hotels": ["Hotel", "Gasthof", "Pension"],
  "Pflegeheime": ["Pflegeheim", "Altenheim", "Care Home"],
  "Schulen": ["Grundschule", "Gymnasium", "Schule", "School"],
  "Kitas": ["Kita", "Kindergarten", "Daycare"],
  "Fitnessstudios": ["Fitnessstudio", "Gym", "Fitnesscenter"],
  "Einzelhandel": ["Einzelhandel", "Einzelhandelsladen", "Retail"],
  "Supermärkte": ["Supermarkt", "Lebensmittel", "Grocery Store"],
  "Restaurants": ["Restaurant", "Gastro", "Gastronomie"],
  "Lagerhallen": ["Lagerhalle", "Lager", "Warehouse"],
  "Produktionsbetriebe": ["Produktion", "Manufacturing", "Fabrik"],
  "Industrieunternehmen": ["Industrie", "Industrial", "Manufaktur"],
  "Bauunternehmen": ["Bauleitung", "Baubetrieb", "Construction"],
  "Handwerksbetriebe": ["Handwerk", "Handwerksbetrieb", "Craftsman"],
  "Online-Shops": ["Online Shop", "E-Commerce", "Webshop"],
  "Großhändler": ["Großhandel", "Wholesale", "Distributor"],
  "Möbelhäuser": ["Möbelhaus", "Möbel", "Furniture Store"],
  "Apotheken": ["Apotheke", "Pharmacy"],
  "Logistikzentren": ["Logistik", "Logistikzentrum", "Logistics"],
};

// Keyword-Mappings für Ausschlüsse
const EXCLUDED_TYPE_KEYWORDS = {
  "Keine Privatkunden": ["privat", "privatperson", "residential"],
  "Keine Restaurants": ["restaurant", "gastro", "bar", "café"],
  "Keine Ärzte": ["arzt", "zahnarzt", "doctor", "physician", "dentist"],
  "Keine Steuerberater": ["steuerberater", "tax advisor", "accountant"],
  "Keine IT-Firmen": ["IT", "software", "computer", "tech"],
  "Keine Immobilienfirmen": ["immobilien", "real estate", "makler"],
  "Keine Vereine": ["verein", "club", "association"],
  "Keine Behörden": ["behörde", "government", "amt", "authority"],
  "Keine Kleinstbetriebe": ["einzelperson", "freelancer", "solopreneur"],
};

/**
 * Generiere Suchbegriffe basierend auf Zielkunden und Gebiet
 */
export function generateSearchQueries(targetCustomerTypes, city) {
  const queries = [];
  
  targetCustomerTypes.forEach(customerType => {
    const keywords = CUSTOMER_TYPE_KEYWORDS[customerType] || [customerType];
    keywords.forEach(keyword => {
      queries.push(`${keyword} ${city}`);
    });
  });

  return queries;
}

/**
 * Prüfe ob ein Lead zu Ausschlüssen passt
 */
export function matchesExclusions(leadName, leadBranche, excludedTypes) {
  const searchString = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  
  for (const exclusionType of excludedTypes) {
    const keywords = EXCLUDED_TYPE_KEYWORDS[exclusionType] || [exclusionType.toLowerCase()];
    for (const keyword of keywords) {
      if (searchString.includes(keyword.toLowerCase())) {
        return true; // Lead sollte ausgeschlossen werden
      }
    }
  }
  
  return false; // Lead ist nicht ausgeschlossen
}

/**
 * Prüfe ob ein Lead zu einer Zielgruppe passt
 */
export function matchesTargetCustomer(leadName, leadBranche, targetCustomerTypes) {
  const searchString = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  
  for (const customerType of targetCustomerTypes) {
    const keywords = CUSTOMER_TYPE_KEYWORDS[customerType] || [customerType];
    for (const keyword of keywords) {
      if (searchString.includes(keyword.toLowerCase())) {
        return customerType; // Gefunden
      }
    }
  }
  
  return null; // Kein Match
}