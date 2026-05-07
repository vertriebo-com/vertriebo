/**
 * Branchen-Mapping für Lead-Generierung
 * Definiert die exakten Suchbegriffe pro Branche/Zielgruppe
 * Diese Suchbegriffe werden für Google Places API verwendet
 */

export const LEAD_SEARCH_KEYWORDS_BY_INDUSTRY = {
  "Gebäudereinigung": [
    "Hausverwaltung",
    "Bürogebäude",
    "Gewerbeimmobilien",
    "Büroreinigung",
    "Immobilienverwaltung",
    "Fachanwaltskanzlei",
    "Arztpraxis",
    "Zahnarztpraxis",
    "Praxis",
    "Fitnessstudio",
    "Fitnesscenter",
    "Autohaus",
    "Autohändler",
    "Werkstatt",
  ],
  "Sicherheitsdienst": [
    "Gewerbeobjekt",
    "Lagerhalle",
    "Lager",
    "Baustelle",
    "Veranstaltungsstätte",
    "Event-Halle",
    "Industriebetrieb",
    "Fabrik",
    "Objektschutz",
    "Geschäft",
    "Laden",
    "Einzelhandel",
  ],
  "IT-Service": [
    "IT Unternehmen",
    "Büro",
    "Geschäftsbüro",
    "Bürogebäude",
    "Unternehmen",
    "Mittelstand",
    "Kanzlei",
    "Steuerberatung",
    "Praxis",
    "Zahnmedizin",
    "Architekturbüro",
    "Makler",
  ],
  "Gartenbau": [
    "Gartenbau",
    "Landschaftsbau",
    "Grünanlagen",
    "Parks",
    "Hausverwaltung",
    "Immobilienverwaltung",
    "Privathaus",
    "Wohnanlage",
    "Firmengrundstück",
  ],
  "Catering": [
    "Betreuungseinrichtung",
    "Altenheim",
    "Pflegeheim",
    "Krankenhaus",
    "Klinik",
    "Schule",
    "Kindergarten",
    "Unternehmen",
    "Büro",
    "Event-Halle",
    "Hochschule",
    "Universität",
  ],
  "Handwerk": [
    "Hausverwaltung",
    "Immobilienverwaltung",
    "Gewerbekunden",
    "Bauunternehmen",
    "Architekturbüro",
    "Facility Management",
    "Gebäudewirtschaft",
    "Bürogebäude",
    "Wohnanlage",
    "Einzelhandel",
  ],
  "Spedition / Logistik": [
    "Spedition",
    "Logistikunternehmen",
    "Transportfirma",
    "Transportunternehmen",
    "Kurierdienst",
    "Paketdienst",
    "Lagerlogistik",
    "Fulfillment",
    "Fulfillment Dienstleister",
    "Frachtunternehmen",
    "Expressdienst",
    "Lieferdienst",
    "Umzugsunternehmen",
    "Güterverkehr",
    "Versand",
  ],
  "Gesundheit / Medizin": [
    "Arztpraxis",
    "Zahnarztpraxis",
    "Physiotherapie",
    "Krankenhaus",
    "Klinik",
    "Medizinisches Zentrum",
    "Facharzt",
    "Zahnmedizin",
    "Therapie",
    "Wellness",
    "Fitness",
    "Fitnessstudio",
  ],
  "Immobilien": [
    "Immobilienmakler",
    "Immobilienbüro",
    "Immobilienunternehmen",
    "Immobilienverwaltung",
    "Makler",
    "Hausverwaltung",
    "Büro",
    "Gewerbeimmobilien",
  ],
  "Lager / Fulfillment": [
    "Lager",
    "Lagerhalle",
    "Lagerlogistik",
    "Fulfillment",
    "Fulfillment Dienstleister",
    "Logistikzentrum",
    "Verteilzentrum",
    "E-Commerce",
    "Versandzentrum",
  ],
};

/**
 * Relevanzprüfung für generierte Leads
 * Gibt true zurück, wenn der Lead zu der gewählten Branche passt
 */
export function isLeadRelevantForIndustry(companyData, industryName) {
  if (!industryName || !LEAD_SEARCH_KEYWORDS_BY_INDUSTRY[industryName]) {
    return true; // Keine Branche gewählt = alles akzeptieren
  }

  const allowedKeywords = LEAD_SEARCH_KEYWORDS_BY_INDUSTRY[industryName];
  const name = (companyData.name || "").toLowerCase();
  const branche = (companyData.branche || "").toLowerCase();
  const description = (companyData.description || "").toLowerCase();

  // Prüfe ob Name oder Branche einen der erlaubten Suchbegriffe enthält
  return allowedKeywords.some(kw => {
    const kwLower = kw.toLowerCase();
    return name.includes(kwLower) || branche.includes(kwLower) || description.includes(kwLower);
  });
}

/**
 * Gibt die erlaubten Suchbegriffe für eine Branche zurück
 * Wird für die Google Places API verwendet
 */
export function getKeywordsForIndustry(industryName) {
  return LEAD_SEARCH_KEYWORDS_BY_INDUSTRY[industryName] || [];
}