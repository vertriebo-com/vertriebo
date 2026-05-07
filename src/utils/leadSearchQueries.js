// ─── Search Query Variants für jede Zielgruppe ────────────────────────────────
// Jede Zielgruppe hat mehrere Suchvarianten, um mehr Treffer zu generieren

export const SEARCH_VARIANTS = {
  "Hausverwaltungen": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung", "Property Management", "Gebäudeverwaltung"],
  "Immobilienverwaltungen": ["Immobilienverwaltung", "Hausverwaltung", "Property Management", "Immobilienmanagement"],
  "Bürogebäude": ["Bürogebäude", "Gewerbepark", "Business Center", "Firmenpark", "Bürocenter"],
  "Arztpraxen": ["Arztpraxis", "Zahnarztpraxis", "Gemeinschaftspraxis", "Praxiszentrum", "Medizinisches Versorgungszentrum"],
  "Zahnarztpraxen": ["Zahnarztpraxis", "Zahnklinik", "Zahnarzt", "Zahnmedizin"],
  "Kanzleien": ["Anwaltskanzlei", "Rechtskanzlei", "Law Firm", "Rechtsanwalt"],
  "Steuerkanzleien": ["Steuerberatung", "Steuerkanzlei", "Steuerberater", "Tax Consultant"],
  "Autohäuser": ["Autohaus", "Autohandel", "Autohändler", "Autoverkauf", "Automobilhandel"],
  "Werkstätten": ["Autowerkstatt", "KFZ-Werkstatt", "Kfz-Meister", "Autowerkstatt", "Autoreperatur"],
  "Hotels": ["Hotel", "Gasthof", "Pension", "Herberge", "Übernachtung"],
  "Pflegeheime": ["Pflegeheim", "Altenheim", "Seniorenheim", "Pflegeanstalt"],
  "Schulen": ["Schule", "Gymnasium", "Grundschule", "Sekundarschule", "Bildungseinrichtung"],
  "Kitas": ["Kita", "Kindergarten", "Kindertagesstätte", "Vorschule"],
  "Fitnessstudios": ["Fitnessstudio", "Gym", "Fitnessclub", "Trainingscentre"],
  "Einzelhandel": ["Einzelhandel", "Einzelhandelsgeschäft", "Fachhandel"],
  "Supermärkte": ["Supermarkt", "Discounter", "Lebensmittel"],
  "Restaurants": ["Restaurant", "Gastro", "Gastronomie", "Pizzeria", "Gastststätte"],
  "Lagerhallen": ["Lagerhalle", "Lager", "Warehouse", "Logistikhalle", "Lagerbetrieb"],
  "Produktionsbetriebe": ["Produktion", "Fabrik", "Produktionsstätte", "Werk"],
  "Industrieunternehmen": ["Industrie", "Industriebetrieb", "Industrieunternehmen"],
  "Bauunternehmen": ["Bauunternehmen", "Baumeister", "Baufirma", "Bauträger"],
  "Handwerksbetriebe": ["Handwerk", "Handwerksbetrieb", "Handwerker"],
  "Online-Shops": ["Onlineshop", "E-Commerce", "Online-Handel", "Webshop"],
  "Großhändler": ["Großhandel", "Großhändler", "Wholesale", "Distributeur"],
  "Möbelhäuser": ["Möbelhaus", "Möbelhändler", "Möbelhandel", "Küchenstudio"],
  "Apotheken": ["Apotheke", "Pharmazie", "Apotheker"],
  "Logistikzentren": ["Logistik", "Logistikzentrum", "Distributionszentrum", "Logistikunternehmen"],
};

// ─── Search Query Generator ──────────────────────────────────────────────────
export function generateSearchQueries(targetCustomerTypes, city) {
  const queries = [];
  const variants = new Set();

  for (const type of targetCustomerTypes) {
    const typeVariants = SEARCH_VARIANTS[type] || [type];
    for (const variant of typeVariants) {
      const query = `${variant} ${city}`;
      if (!variants.has(query)) {
        variants.add(query);
        queries.push({ query, type, variant });
      }
    }
  }

  return queries;
}

// ─── Lead Matching & Filtering ───────────────────────────────────────────────
export function matchesTargetCustomer(leadName, leadBranche, targetTypes) {
  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  
  for (const type of targetTypes) {
    const variants = SEARCH_VARIANTS[type] || [type.toLowerCase()];
    for (const variant of variants) {
      if (search.includes(variant.toLowerCase())) return type;
    }
  }
  return null;
}

export function matchesExcluded(leadName, leadBranche, excludedTypes) {
  const EXCLUDED_VARIANTS = {
    "Keine Steuerberater": ["steuerberater", "tax advisor", "steuerkanzlei"],
    "Keine IT-Firmen": ["it-", "software", "computer", "informatik"],
    "Keine Restaurants": ["restaurant", "gastro", "pizzeria", "bar"],
    "Keine Ärzte": ["arzt", "zahnarzt", "medizin"],
  };

  const search = `${(leadName || "").toLowerCase()} ${(leadBranche || "").toLowerCase()}`;
  
  for (const type of excludedTypes) {
    const variants = EXCLUDED_VARIANTS[type] || [type.toLowerCase()];
    for (const variant of variants) {
      if (search.includes(variant.toLowerCase())) return type;
    }
  }
  return null;
}