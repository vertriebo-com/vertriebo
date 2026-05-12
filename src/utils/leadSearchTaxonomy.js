/**
 * ============================================================
 * VERTRIEBO LEAD SEARCH TAXONOMY
 * ============================================================
 * Zentrale Quelle aller Branchenprofile.
 *
 * BEGRIFFE:
 * - searchableBusinessCategories: Echte Firmenkategorien, die
 *   direkt als Google Places / Text Search Queries funktionieren.
 * - targetCustomerTypes: Wirtschaftlich sinnvolle B2B-Zielkunden.
 *   Werden für UI, Scoring und KI-Empfehlungen genutzt, NICHT
 *   blind als rohe Such-Queries.
 * - idealCustomerProfiles: Qualitative Profile (z.B. "mehrere
 *   Standorte", "regelmäßiger Bedarf"). NUR für Scoring + KI,
 *   NIEMALS als rohe Such-Queries.
 * - searchKeywordVariants: Konkrete Suchbegriff-Varianten je
 *   Kategorie, direkt nutzbar für Google Text Search.
 * ============================================================
 */

export const LEAD_SEARCH_TAXONOMY = {

  // ──────────────────────────────────────────────
  // 1. GEBÄUDEREINIGUNG
  // ──────────────────────────────────────────────
  gebaeudereinigung: {
    id: "gebaeudereinigung",
    label: "Gebäudereinigung",

    ownServices: [
      "Büroreinigung", "Treppenhausreinigung", "Praxisreinigung",
      "Fensterreinigung", "Grundreinigung", "Baureinigung",
      "Sonderreinigung", "Hausmeisterdienst", "Winterdienst",
      "Teppichreinigung", "Glasreinigung"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Immobilienverwaltungen", "Bürogebäude",
      "Arztpraxen", "Zahnarztpraxen", "Ärztehäuser", "Kitas",
      "Schulen", "Pflegeheime", "Seniorenheime", "Hotels",
      "Autohäuser", "Fitnessstudios", "Gewerbehallen",
      "Industriebetriebe", "Einzelhandel", "Supermärkte"
    ],

    // NUR direkt suchbare Firmenkategorien
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Bürogebäude",
      "Ärztehaus", "Arztpraxis", "Zahnarztpraxis",
      "Kindertagesstätte", "Schule", "Pflegeheim", "Seniorenheim",
      "Hotel", "Autohaus", "Fitnessstudio", "Gewerbepark",
      "Industrieunternehmen", "Einzelhandel", "Supermarkt"
    ],

    // NUR für Scoring + KI, NICHT für Suche
    idealCustomerProfiles: [
      "regelmäßiger Reinigungsbedarf", "mehrere Standorte",
      "größere Nutzfläche", "laufende Objektbetreuung",
      "wiederkehrende Dienstleistung", "professionelle Verwaltung"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "Einmalige Kleinstaufträge",
      "private Wohnungen", "Kleinanzeigen", "Jobangebote"
    ],

    negativeKeywords: [
      "privat", "job", "karriere", "ausbildung", "stellenangebot",
      "minijob", "kleinanzeigen", "wohnung gesucht", "mietgesuch"
    ],

    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung", "Mietverwaltung"],
      "Arztpraxis": ["Arztpraxis", "Ärztehaus", "Zahnarztpraxis", "Medizinisches Versorgungszentrum"],
      "Pflegeheim": ["Pflegeheim", "Seniorenheim", "Seniorenresidenz", "Altenheim"],
      "Hotel": ["Hotel", "Gasthof", "Pension"],
      "Gewerbe": ["Gewerbepark", "Bürogebäude", "Industrieunternehmen", "Gewerbehalle"],
      "Schule": ["Schule", "Gymnasium", "Grundschule", "Berufsschule"],
      "Kita": ["Kindertagesstätte", "Kita", "Kindergarten", "Krippe"]
    },

    scoringSignals: [
      "verwaltung", "gewerbe", "praxis", "hotel", "pflege",
      "industrie", "facility", "büro", "objekt", "standort",
      "wohnanlage", "immobilien"
    ],

    badFitSignals: [
      "privat", "job", "karriere", "kleinanzeige", "einzelperson",
      "mietgesuch", "gesucht", "ausbildung"
    ],

    googlePlaceTypes: [
      "property_management_company", "doctor", "dentist",
      "hospital", "lodging", "car_dealer", "gym", "school"
    ],

    radiusStrategy: {
      urban: "Standard-Radius, mehrere Kategorien parallel",
      rural: "Radius erhöhen, Nachbarorte einbeziehen",
      priority: ["Hausverwaltung", "Pflegeheim", "Hotel", "Bürogebäude"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "Pflegeheim",
      "Arztpraxis", "Hotel", "Bürogebäude", "Schule", "Kita"
    ],

    minimumBusinessRelevanceRules: [
      "Mindestens ein positives Suchkategorie-Keyword im Firmennamen oder Beschreibung",
      "Kein hartes Ausschluss-Keyword",
      "Keine Privat-Signale"
    ]
  },

  // ──────────────────────────────────────────────
  // 2. SICHERHEITSDIENST
  // ──────────────────────────────────────────────
  sicherheitsdienst: {
    id: "sicherheitsdienst",
    label: "Sicherheitsdienst",

    ownServices: [
      "Objektschutz", "Baustellenbewachung", "Veranstaltungsschutz",
      "Doorman-Service", "Revierdienst", "Alarmverfolgung",
      "Werkschutz", "Empfangsdienst", "Parkplatzüberwachung"
    ],

    targetCustomerTypes: [
      "Baustellen", "Bauunternehmen", "Logistikzentren",
      "Industriebetriebe", "Veranstalter", "Hotels", "Einkaufszentren",
      "Parkhäuser", "Messeveranstalter", "Eventlocations",
      "Gewerbeparks", "Einzelhandel", "Wohnanlagen"
    ],

    searchableBusinessCategories: [
      "Bauunternehmen", "Logistikzentrum", "Industrieunternehmen",
      "Veranstalter", "Eventlocation", "Hotel", "Einkaufszentrum",
      "Parkhaus", "Messeveranstalter", "Gewerbepark",
      "Einzelhandel", "Facility Management"
    ],

    idealCustomerProfiles: [
      "hoher Sicherheitsbedarf", "Publikumsverkehr",
      "wertvolle Güter", "Nachtbetrieb", "Baustellenrisiko",
      "große Flächen", "Zutrittskontrolle"
    ],

    excludedCustomerTypes: [
      "Privatpersonen", "kleine Privatfeiern",
      "Vereine ohne Budget", "Jobsuchende"
    ],

    negativeKeywords: [
      "job", "stellenangebot", "ausbildung", "security job",
      "privat", "ehrenamt", "karriere", "bewerber"
    ],

    searchKeywordVariants: {
      "Baustelle": ["Bauunternehmen", "Bauträger", "Baustelle", "Generalunternehmer"],
      "Event": ["Eventlocation", "Veranstalter", "Messeveranstalter", "Kongresszentrum"],
      "Industrie": ["Industriebetrieb", "Gewerbepark", "Logistikzentrum", "Produktionsbetrieb"],
      "Hotel": ["Hotel", "Tagungshotel", "Kongresshotel"],
      "Einzelhandel": ["Einkaufszentrum", "Shopping Center", "Einzelhandel"]
    },

    scoringSignals: [
      "objektschutz", "baustelle", "logistik", "industrie",
      "veranstaltung", "zugang", "werkschutz", "publikumsverkehr",
      "gewerbe", "lager", "messe"
    ],

    badFitSignals: [
      "job", "karriere", "privat", "ehrenamt", "verein klein",
      "ausbildung", "bewerber"
    ],

    googlePlaceTypes: [
      "shopping_mall", "lodging", "event_venue", "stadium",
      "parking", "storage"
    ],

    radiusStrategy: {
      urban: "Mehrere Bezirke, große Events und Industriegebiete einbeziehen",
      rural: "Baustellensuche, Logistikzentren bevorzugen",
      priority: ["Logistikzentrum", "Industriebetrieb", "Bauunternehmen", "Hotel"]
    },

    queryPriority: [
      "Bauunternehmen", "Logistikzentrum", "Industrieunternehmen",
      "Hotel", "Eventlocation", "Einkaufszentrum"
    ],

    minimumBusinessRelevanceRules: [
      "Gewerblicher Betrieb erkennbar",
      "Kein Job/Karriere-Signal",
      "Keine Privatperson"
    ]
  },

  // ──────────────────────────────────────────────
  // 3. IT-SERVICE
  // ──────────────────────────────────────────────
  it_service: {
    id: "it_service",
    label: "IT-Service",

    ownServices: [
      "IT-Support", "Managed Services", "Serverbetreuung",
      "Netzwerkbetreuung", "Microsoft 365", "Cybersecurity",
      "Cloud-Lösungen", "Backup", "Telefonanlage", "Hardware-Service"
    ],

    targetCustomerTypes: [
      "Arztpraxen", "Zahnarztpraxen", "Steuerberater", "Kanzleien",
      "KMU", "Schulen", "Pflegeeinrichtungen", "Handwerksbetriebe",
      "Büros", "Einzelhandel", "Immobilienverwaltungen",
      "Logistikunternehmen"
    ],

    searchableBusinessCategories: [
      "Arztpraxis", "Zahnarztpraxis", "Steuerberater",
      "Rechtsanwalt", "Kanzlei", "Pflegeheim", "Schule",
      "Handwerksbetrieb", "Büro", "Einzelhandel",
      "Immobilienverwaltung", "Logistikunternehmen",
      "Unternehmensberatung", "Ingenieurbüro"
    ],

    idealCustomerProfiles: [
      "mehrere Arbeitsplätze", "regelmäßiger IT-Bedarf",
      "sensible Daten", "Compliance-Anforderungen",
      "Cloud-Nutzung", "Telefonie-Bedarf", "Backup-Bedarf"
    ],

    excludedCustomerTypes: [
      "Privatpersonen", "Gaming-PC-Anfragen",
      "Einmalige Kleinreparaturen", "Jobsuchende"
    ],

    negativeKeywords: [
      "privat", "gaming", "job", "karriere", "ausbildung",
      "computerhilfe privat", "forum", "blog"
    ],

    searchKeywordVariants: {
      "Praxen": ["Arztpraxis", "Zahnarztpraxis", "Ärztehaus", "Medizinisches Versorgungszentrum"],
      "Kanzleien": ["Rechtsanwalt", "Kanzlei", "Anwaltskanzlei", "Steuerberater", "Steuerberatung"],
      "KMU": ["Handwerksbetrieb", "Unternehmensberatung", "Ingenieurbüro", "Bürogebäude"],
      "Bildung": ["Schule", "Gymnasium", "Bildungszentrum"],
      "Pflege": ["Pflegeheim", "Seniorenheim", "Reha Zentrum"]
    },

    scoringSignals: [
      "praxis", "kanzlei", "steuer", "pflege", "schule",
      "verwaltung", "mehrere standorte", "daten", "büro",
      "handwerk", "logistik"
    ],

    badFitSignals: [
      "privat", "gaming", "job", "forum", "einzelperson",
      "haushaltsgerät", "reparatur privat"
    ],

    googlePlaceTypes: [
      "doctor", "dentist", "lawyer", "accounting",
      "school", "hospital"
    ],

    radiusStrategy: {
      urban: "Dichte Praxen/Kanzlei-Suche, viele KMU",
      rural: "Fokus auf lokale Handwerksbetriebe und Praxen",
      priority: ["Arztpraxis", "Kanzlei", "Steuerberater", "Handwerksbetrieb"]
    },

    queryPriority: [
      "Arztpraxis", "Zahnarztpraxis", "Steuerberater",
      "Rechtsanwalt", "Handwerksbetrieb", "Pflegeheim", "Schule"
    ],

    minimumBusinessRelevanceRules: [
      "Professioneller Betrieb mit Mitarbeitern erkennbar",
      "Kein Privat-Signal",
      "Kein Gaming/Hobby-Signal"
    ]
  },

  // ──────────────────────────────────────────────
  // 4. GARTENBAU
  // ──────────────────────────────────────────────
  gartenbau: {
    id: "gartenbau",
    label: "Gartenbau",

    ownServices: [
      "Gartenpflege", "Grünanlagenpflege", "Rasenpflege",
      "Heckenschnitt", "Baumpflege", "Winterdienst",
      "Außenanlagenpflege", "Pflasterarbeiten", "Objektpflege"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Immobilienverwaltungen", "Wohnanlagen",
      "Hotels", "Gewerbeparks", "Kommunen", "Pflegeheime", "Kitas",
      "Schulen", "Facility Management Firmen", "Bürogebäude",
      "Industriebetriebe"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Wohnanlage",
      "Hotel", "Gewerbepark", "Pflegeheim", "Kindertagesstätte",
      "Schule", "Facility Management", "Bürogebäude",
      "Industrieunternehmen", "Friedhof"
    ],

    idealCustomerProfiles: [
      "regelmäßige Außenpflege", "größere Grünflächen",
      "Wohnanlagenbestand", "laufende Objektpflege",
      "Winterdienstbedarf"
    ],

    excludedCustomerTypes: [
      "Privatgärten", "Einmalige Kleinstaufträge",
      "Kleinanzeigen", "Jobs"
    ],

    negativeKeywords: [
      "privatgarten", "privat", "job", "karriere",
      "kleinanzeigen", "gratis", "selber machen"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnanlage", "WEG Verwaltung"],
      "Gewerbe": ["Gewerbepark", "Bürogebäude", "Industriebetrieb"],
      "Sozial": ["Pflegeheim", "Kita", "Schule", "Altenheim"],
      "Hotel": ["Hotel", "Tagungshotel", "Gasthof"]
    },

    scoringSignals: [
      "anlage", "grünfläche", "verwaltung", "wohnanlage",
      "gewerbe", "hotel", "pflege", "objekt", "außenanlage"
    ],

    badFitSignals: [
      "privat", "kleinanzeige", "job", "einzelgarten",
      "hobby", "selbst"
    ],

    googlePlaceTypes: [
      "property_management_company", "lodging", "school",
      "hospital"
    ],

    radiusStrategy: {
      urban: "Dichte Hausverwaltungs-Suche, Gewerbeparks",
      rural: "Hotels, Wohnanlagen, Pflegeheime bevorzugen",
      priority: ["Hausverwaltung", "Wohnanlage", "Hotel", "Pflegeheim"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "Hotel",
      "Pflegeheim", "Gewerbepark", "Schule", "Kita"
    ],

    minimumBusinessRelevanceRules: [
      "Gewerblicher oder institutioneller Betreiber erkennbar",
      "Kein Privat-Garten-Signal",
      "Mindestens mittlere Grünflächengröße wahrscheinlich"
    ]
  },

  // ──────────────────────────────────────────────
  // 5. CATERING
  // ──────────────────────────────────────────────
  catering: {
    id: "catering",
    label: "Catering",

    ownServices: [
      "Business Catering", "Event Catering", "Messe Catering",
      "Kita Catering", "Schulverpflegung", "Kantinenservice",
      "Fingerfood", "Buffet", "Tagungsverpflegung"
    ],

    targetCustomerTypes: [
      "Eventlocations", "Tagungshotels", "Seminarzentren",
      "Messeveranstalter", "Kongresszentren", "Unternehmen",
      "Bürokomplexe", "Kitas", "Schulen", "Pflegeheime", "Hotels",
      "Coworking Spaces", "Vereine mit Budget"
    ],

    searchableBusinessCategories: [
      "Eventlocation", "Tagungshotel", "Seminarzentrum",
      "Messeveranstalter", "Kongresszentrum", "Bürogebäude",
      "Kindertagesstätte", "Schule", "Pflegeheim", "Hotel",
      "Coworking Space", "Veranstalter", "Unternehmensberatung"
    ],

    idealCustomerProfiles: [
      "regelmäßige Veranstaltungen", "viele Mitarbeitende",
      "Tagungsbetrieb", "Verpflegungspflicht",
      "wiederkehrende Events", "Business-Kunden"
    ],

    excludedCustomerTypes: [
      "Privatfeiern", "Hochzeiten privat", "Geburtstage privat",
      "Kleinanzeigen", "Einmalige Kleinstanfragen"
    ],

    negativeKeywords: [
      "privat", "hochzeit", "geburtstag", "familienfeier",
      "job", "karriere", "kleinanzeigen", "selbst kochen"
    ],

    searchKeywordVariants: {
      "Event": ["Eventlocation", "Veranstalter", "Messeveranstalter", "Kongresszentrum", "Eventhalle"],
      "Business": ["Bürogebäude", "Unternehmensberatung", "Coworking Space", "Business Center"],
      "Bildung": ["Kindertagesstätte", "Schule", "Seminarzentrum", "Bildungszentrum"],
      "Hotel": ["Tagungshotel", "Kongresshotel", "Hotel"]
    },

    scoringSignals: [
      "event", "tagung", "messe", "seminar", "unternehmen",
      "büro", "kita", "schule", "hotel", "kongress", "veranstaltung"
    ],

    badFitSignals: [
      "privat", "hochzeit", "geburtstag", "kleinanzeige",
      "familienfeier", "selbst"
    ],

    googlePlaceTypes: [
      "event_venue", "lodging", "school", "conference_center"
    ],

    radiusStrategy: {
      urban: "Viele Eventlocations, Tagungshotels, Business-Center",
      rural: "Hotels, Schulen, Bildungseinrichtungen bevorzugen",
      priority: ["Eventlocation", "Tagungshotel", "Schule", "Bürogebäude"]
    },

    queryPriority: [
      "Eventlocation", "Tagungshotel", "Kongresszentrum",
      "Seminarzentrum", "Bürogebäude", "Kita", "Schule"
    ],

    minimumBusinessRelevanceRules: [
      "Gewerblicher oder institutioneller Betrieb erkennbar",
      "Kein Privat-Event-Signal",
      "Regelmäßiger Verpflegungsbedarf wahrscheinlich"
    ]
  },

  // ──────────────────────────────────────────────
  // 6. HANDWERK
  // ──────────────────────────────────────────────
  handwerk: {
    id: "handwerk",
    label: "Handwerk",

    ownServices: [
      "Reparaturen", "Instandhaltung", "Renovierung", "Montage",
      "Wartung", "Notdienst", "Objektbetreuung", "Kleinreparaturen"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Immobilienverwaltungen", "Bauunternehmen",
      "Gewerbeimmobilienverwaltungen", "Facility Management Firmen",
      "Hotels", "Praxen", "Bürogebäude", "Einzelhandel",
      "Wohnungsbaugesellschaften"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Bauunternehmen",
      "Facility Management", "Hotel", "Arztpraxis", "Bürogebäude",
      "Einzelhandel", "Wohnungsbaugesellschaft",
      "Gewerbeimmobilienverwaltung"
    ],

    idealCustomerProfiles: [
      "regelmäßiger Instandhaltungsbedarf", "mehrere Objekte",
      "laufende Reparaturen", "Objektbestand",
      "schneller Dienstleisterbedarf"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "Kleinstreparaturen ohne Budget",
      "DIY-Anfragen", "Jobangebote"
    ],

    negativeKeywords: [
      "privat", "selber machen", "diy", "job", "ausbildung",
      "karriere", "kleinanzeigen", "forum"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnungsbaugesellschaft", "WEG Verwaltung"],
      "Gewerbe": ["Bürogebäude", "Einzelhandel", "Hotel", "Gewerbepark"],
      "Bau": ["Bauunternehmen", "Facility Management", "Generalunternehmer"]
    },

    scoringSignals: [
      "verwaltung", "objekt", "instandhaltung", "gewerbe",
      "hotel", "bau", "facility", "wohnanlage"
    ],

    badFitSignals: [
      "privat", "diy", "job", "kleinanzeige", "selbst"
    ],

    googlePlaceTypes: [
      "property_management_company", "lodging", "real_estate_agency"
    ],

    radiusStrategy: {
      urban: "Hausverwaltungen, Gewerbeparks bevorzugen",
      rural: "Lokale Bauunternehmen, Einzelhandel einbeziehen",
      priority: ["Hausverwaltung", "Bauunternehmen", "Hotel", "Bürogebäude"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "Bauunternehmen",
      "Hotel", "Bürogebäude", "Einzelhandel"
    ],

    minimumBusinessRelevanceRules: [
      "Objektbestand oder mehrere Einheiten erkennbar",
      "Kein Privat-Signal",
      "Kein DIY-Signal"
    ]
  },

  // ──────────────────────────────────────────────
  // 7. SPEDITION / LOGISTIK
  // ──────────────────────────────────────────────
  spedition_logistik: {
    id: "spedition_logistik",
    label: "Spedition / Logistik",

    ownServices: [
      "Transport", "Kurierdienst", "Expresslieferung", "Stückgut",
      "Palettentransport", "Möbeltransport", "Lagerlogistik",
      "Auslieferung", "Same-Day Delivery"
    ],

    targetCustomerTypes: [
      "Online-Shops", "Großhändler", "Produktionsbetriebe",
      "Industriebetriebe", "Möbelhäuser", "Baustoffhändler",
      "Maschinenbauunternehmen", "Lebensmittelgroßhandel",
      "Eventfirmen", "Einzelhandel", "E-Commerce-Unternehmen"
    ],

    searchableBusinessCategories: [
      "Großhandel", "Produktionsbetrieb", "Industrieunternehmen",
      "Möbelhaus", "Baustoffhandel", "Maschinenbau",
      "Lebensmittelgroßhandel", "Eventagentur", "Einzelhandel",
      "Versandhandel", "Handelsunternehmen", "Küchenstudio"
    ],

    idealCustomerProfiles: [
      "regelmäßiger Versand", "wiederkehrende Transporte",
      "regionale Auslieferung", "zeitkritische Lieferungen",
      "hohes Sendungsvolumen"
    ],

    excludedCustomerTypes: [
      "Privatumzüge", "Einzelne Privattransporte",
      "Kleinanzeigen", "Jobs"
    ],

    negativeKeywords: [
      "privat", "umzug privat", "job", "fahrer gesucht",
      "karriere", "kleinanzeigen", "führerschein"
    ],

    searchKeywordVariants: {
      "E-Commerce": ["Versandhandel", "Online Händler", "Handelsunternehmen"],
      "Industrie": ["Produktionsbetrieb", "Industrieunternehmen", "Maschinenbau"],
      "Handel": ["Großhandel", "Möbelhaus", "Baustoffhandel", "Lebensmittelgroßhandel"],
      "Event": ["Eventagentur", "Messeveranstalter", "Veranstaltungstechnik"]
    },

    scoringSignals: [
      "versand", "logistik", "lager", "großhandel", "produktion",
      "lieferung", "handel", "import", "export"
    ],

    badFitSignals: [
      "privat", "job", "kleinanzeige", "einzeltransport",
      "möbel privat"
    ],

    googlePlaceTypes: [
      "storage", "moving_company", "wholesale_store"
    ],

    radiusStrategy: {
      urban: "Industrie- und Gewerbeparks, große Händler",
      rural: "Produktionsbetriebe, Maschinenbau bevorzugen",
      priority: ["Großhandel", "Produktionsbetrieb", "Industrieunternehmen", "Möbelhaus"]
    },

    queryPriority: [
      "Großhandel", "Produktionsbetrieb", "Industrieunternehmen",
      "Möbelhaus", "Maschinenbau", "Baustoffhandel"
    ],

    minimumBusinessRelevanceRules: [
      "Regelmäßiger Versandbedarf erkennbar",
      "Kein Privat-Transport-Signal",
      "Gewerblicher Betrieb"
    ]
  },

  // ──────────────────────────────────────────────
  // 8. GESUNDHEIT / MEDIZIN
  // ──────────────────────────────────────────────
  gesundheit_medizin: {
    id: "gesundheit_medizin",
    label: "Gesundheit / Medizin",

    ownServices: [
      "medizinische Dienstleistung", "Therapie",
      "Pflegebezogene Dienstleistung", "Praxisservice",
      "Gesundheitsberatung", "Betriebliches Gesundheitsmanagement"
    ],

    targetCustomerTypes: [
      "Arztpraxen", "Zahnarztpraxen", "Therapiezentren",
      "Pflegeheime", "Seniorenheime", "Apotheken",
      "Reha-Zentren", "Privatkliniken", "Gesundheitszentren",
      "Physiotherapien", "Ergotherapien"
    ],

    searchableBusinessCategories: [
      "Arztpraxis", "Zahnarztpraxis", "Therapiezentrum",
      "Pflegeheim", "Seniorenheim", "Apotheke", "Reha Zentrum",
      "Privatklinik", "Gesundheitszentrum", "Physiotherapie",
      "Ergotherapie", "Ärztehaus"
    ],

    idealCustomerProfiles: [
      "professioneller Gesundheitsbetrieb", "regelmäßiger Bedarf",
      "Patientenverkehr", "mehrere Behandlungsräume",
      "hohe Organisationsanforderung"
    ],

    excludedCustomerTypes: [
      "Privatpersonen", "Foren",
      "Selbsthilfegruppen ohne Budget", "Jobanzeigen"
    ],

    negativeKeywords: [
      "privat", "forum", "job", "karriere", "ausbildung",
      "krankheit erfahrung", "selbsthilfe", "blog"
    ],

    searchKeywordVariants: {
      "Praxis": ["Arztpraxis", "Zahnarztpraxis", "Ärztehaus", "Medizinisches Versorgungszentrum"],
      "Therapie": ["Physiotherapie", "Ergotherapie", "Therapiezentrum", "Logopädie"],
      "Pflege": ["Pflegeheim", "Seniorenheim", "Reha Zentrum", "Klinik"]
    },

    scoringSignals: [
      "praxis", "gesundheit", "pflege", "therapie", "reha",
      "klinik", "zentrum", "apotheke", "medizin"
    ],

    badFitSignals: [
      "forum", "privat", "job", "erfahrung", "selbsthilfe", "blog"
    ],

    googlePlaceTypes: [
      "doctor", "dentist", "hospital", "pharmacy",
      "physiotherapist", "health"
    ],

    radiusStrategy: {
      urban: "Dichte Praxislandschaft, Ärztehäuser",
      rural: "Regionale Praxen, Pflegeheime bevorzugen",
      priority: ["Arztpraxis", "Pflegeheim", "Therapiezentrum"]
    },

    queryPriority: [
      "Arztpraxis", "Zahnarztpraxis", "Pflegeheim",
      "Physiotherapie", "Therapiezentrum", "Ärztehaus"
    ],

    minimumBusinessRelevanceRules: [
      "Professionelle Gesundheitseinrichtung erkennbar",
      "Kein Forum/Blog-Signal",
      "Kein Privat-Signal"
    ]
  },

  // ──────────────────────────────────────────────
  // 9. IMMOBILIEN
  // ──────────────────────────────────────────────
  immobilien: {
    id: "immobilien",
    label: "Immobilien",

    ownServices: [
      "Vermietung", "Verwaltung", "Verkauf", "Gewerbeimmobilien",
      "Projektentwicklung", "Immobilienberatung", "Standortvermittlung"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Immobilienverwaltungen",
      "WEG-Verwaltungen", "Bauträger", "Projektentwickler",
      "Wohnungsbaugesellschaften", "Gewerbeimmobilienverwaltungen",
      "Immobiliengesellschaften", "Property Management Firmen"
    ],

    // NUR direkt suchbare Firmenkategorien
    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung",
      "Bauträger", "Projektentwickler", "Wohnungsbaugesellschaft",
      "Immobiliengesellschaft", "Gewerbeimmobilienverwaltung",
      "Property Management", "Facility Management Immobilien",
      "Mietverwaltung"
    ],

    // NUR für Scoring + KI, NICHT für Suche
    idealCustomerProfiles: [
      "Eigentümer", "Investoren", "Gewerbeimmobilienbesitzer",
      "Erbengemeinschaften", "Unternehmen mit Standortsuche",
      "Bestandshalter", "Objektbestand"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "private Vermieter",
      "Ferienwohnung privat", "Makler ohne Verwaltungsbestand",
      "Wohnung gesucht", "Mietgesuch"
    ],

    negativeKeywords: [
      "privat", "wohnung gesucht", "mietgesuch", "ferienwohnung",
      "airbnb", "job", "karriere", "ausbildung",
      "vermiete privat", "suche wohnung"
    ],

    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung", "WEG Verwaltung", "Immobilienverwaltung", "Mietverwaltung", "Objektverwaltung"],
      "Bauträger": ["Bauträger", "Wohnbaugesellschaft", "Projektentwickler Immobilien", "Immobilienprojektentwicklung"],
      "Gewerbe": ["Gewerbeimmobilienverwaltung", "Property Management", "Facility Management Immobilien", "Gewerbeimmobiliengesellschaft"]
    },

    scoringSignals: [
      "verwaltung", "weg", "gewerbeimmobilien", "bestand",
      "objektverwaltung", "property management",
      "projektentwicklung", "bauträger", "wohnanlage"
    ],

    badFitSignals: [
      "privat", "mietgesuch", "wohnung gesucht",
      "ferienwohnung", "job", "airbnb"
    ],

    googlePlaceTypes: [
      "property_management_company", "real_estate_agency"
    ],

    radiusStrategy: {
      urban: "Großstädte: Viele Hausverwaltungen, Bauträger, Property Management",
      rural: "Lokale Hausverwaltungen, Wohnungsbaugesellschaften",
      priority: ["Hausverwaltung", "Immobilienverwaltung", "Bauträger"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung",
      "Bauträger", "Wohnungsbaugesellschaft", "Property Management"
    ],

    minimumBusinessRelevanceRules: [
      "Professionelle Verwaltungsstruktur erkennbar",
      "Kein Privat-Vermieter-Signal",
      "Kein Mietgesuch/Wohnungsgesuch"
    ]
  },

  // ──────────────────────────────────────────────
  // 10. LAGER / FULFILLMENT
  // ──────────────────────────────────────────────
  lager_fulfillment: {
    id: "lager_fulfillment",
    label: "Lager / Fulfillment",

    ownServices: [
      "Fulfillment", "Lagerung", "Kommissionierung",
      "Versandabwicklung", "Retourenmanagement",
      "E-Commerce Logistik", "Pick & Pack", "B2B-Lagerlogistik"
    ],

    targetCustomerTypes: [
      "Online-Shops", "Shopify-Händler", "Amazon-Händler",
      "Großhändler", "E-Commerce-Unternehmen", "Kosmetikmarken",
      "Lebensmittelmarken", "Textilhändler", "Ersatzteilhändler",
      "Importeure", "Startups mit Versand"
    ],

    searchableBusinessCategories: [
      "Versandhandel", "Großhandel", "Kosmetikmarke",
      "Lebensmittelhersteller", "Textilhandel", "Ersatzteilhandel",
      "Importeur", "Handelsunternehmen", "Modehändler",
      "Online Händler"
    ],

    idealCustomerProfiles: [
      "regelmäßiger Versand", "wachsender Onlinehandel",
      "Retourenbedarf", "mehrere SKUs", "Lagerbedarf",
      "Skalierungsbedarf"
    ],

    excludedCustomerTypes: [
      "Privatverkäufer", "Kleinanzeigen",
      "Dropshipping ohne Bestand", "Jobs"
    ],

    negativeKeywords: [
      "privat", "kleinanzeigen", "job", "karriere",
      "ausbildung", "ebay privat", "zu verschenken"
    ],

    searchKeywordVariants: {
      "E-Commerce": ["Versandhandel", "Online Händler", "Handelsunternehmen"],
      "Handel": ["Großhandel", "Importeur", "Textilhandel", "Modehändler"],
      "Produkte": ["Kosmetikmarke", "Lebensmittelhersteller", "Ersatzteilhandel"]
    },

    scoringSignals: [
      "shop", "versand", "handel", "import", "retouren",
      "lager", "ecommerce", "online"
    ],

    badFitSignals: [
      "privat", "kleinanzeige", "job", "kein bestand",
      "zu verschenken"
    ],

    googlePlaceTypes: [
      "storage", "wholesale_store"
    ],

    radiusStrategy: {
      urban: "Industriegebiete, Gewerbeparks, Online-Händler",
      rural: "Größere Händler und Produzenten bevorzugen",
      priority: ["Großhandel", "Versandhandel", "Importeur"]
    },

    queryPriority: [
      "Großhandel", "Versandhandel", "Importeur",
      "Handelsunternehmen", "Textilhandel"
    ],

    minimumBusinessRelevanceRules: [
      "Regelmäßiger Versand- oder Lagerbedarf erkennbar",
      "Kein Privatverkäufer-Signal",
      "Gewerblicher Betrieb"
    ]
  },

  // ──────────────────────────────────────────────
  // 11. FACILITY SERVICE
  // ──────────────────────────────────────────────
  facility_service: {
    id: "facility_service",
    label: "Facility Service",

    ownServices: [
      "Hausmeisterdienst", "Objektbetreuung", "Gebäudemanagement",
      "Technische Betreuung", "Reinigung", "Winterdienst",
      "Grünpflege", "Kleinreparaturen", "Kontrolldienste"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Gewerbeimmobilien", "Bürogebäude",
      "Hotels", "Pflegeheime", "Industriebetriebe", "Schulen",
      "Kitas", "Kommunen", "Wohnanlagen",
      "Facility Management Kunden"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Gewerbeimmobilie",
      "Bürogebäude", "Hotel", "Pflegeheim", "Industrieunternehmen",
      "Schule", "Kindertagesstätte", "Wohnanlage",
      "Gewerbepark"
    ],

    idealCustomerProfiles: [
      "mehrere Objekte", "laufender Objektbedarf",
      "technische Betreuung", "Außenanlagen",
      "wiederkehrende Dienstleistung"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "Einmalige Kleinstaufträge", "Jobs"
    ],

    negativeKeywords: [
      "privat", "job", "karriere", "ausbildung", "kleinanzeigen"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnanlage", "WEG Verwaltung"],
      "Gewerbe": ["Bürogebäude", "Gewerbeimmobilie", "Industrieunternehmen", "Gewerbepark"],
      "Sozial": ["Pflegeheim", "Schule", "Kita", "Altenheim"]
    },

    scoringSignals: [
      "objekt", "verwaltung", "gewerbe", "facility",
      "wohnanlage", "technisch", "gebäude", "standort"
    ],

    badFitSignals: [
      "privat", "job", "kleinanzeige", "einzelperson"
    ],

    googlePlaceTypes: [
      "property_management_company", "lodging", "school"
    ],

    radiusStrategy: {
      urban: "Dichte Hausverwaltungs- und Gewerbegebäude-Suche",
      rural: "Hotels, Pflegeheime, lokale Verwaltungen",
      priority: ["Hausverwaltung", "Bürogebäude", "Hotel", "Pflegeheim"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "Bürogebäude",
      "Hotel", "Pflegeheim", "Gewerbepark"
    ],

    minimumBusinessRelevanceRules: [
      "Mehrere Objekte oder Einheiten erkennbar",
      "Kein Privat-Signal",
      "Institutioneller oder gewerblicher Betreiber"
    ]
  },

  // ──────────────────────────────────────────────
  // 12. ENTRÜMPELUNG
  // ──────────────────────────────────────────────
  entruempelung: {
    id: "entruempelung",
    label: "Entrümpelung",

    ownServices: [
      "Entrümpelung", "Haushaltsauflösung", "Wohnungsauflösung",
      "Nachlassauflösung", "Kellerentrümpelung", "Gewerbeauflösung",
      "Messie-Wohnung", "Entsorgung", "Räumung"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Nachlassverwalter", "Betreuungsbüros",
      "Immobilienmakler", "Wohnungsbaugesellschaften",
      "Pflegeheime", "Seniorenheime", "Rechtsanwälte Erbrecht",
      "Sozialdienste", "Gerichtliche Betreuer",
      "Immobilienverwaltungen"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung",
      "Nachlassverwaltung", "Betreuungsbüro", "Immobilienmakler",
      "Wohnungsbaugesellschaft", "Pflegeheim", "Seniorenheim",
      "Rechtsanwalt Erbrecht", "Sozialdienst"
    ],

    idealCustomerProfiles: [
      "regelmäßige Wohnungswechsel", "Nachlassfälle",
      "Mietnomadenfälle", "Objektbestand",
      "soziale Betreuung", "Erbfälle"
    ],

    excludedCustomerTypes: [
      "Privathaushalte mit Kleinstauftrag",
      "Sperrmüll Einzelstück", "Kleinanzeigen", "Jobs"
    ],

    negativeKeywords: [
      "privat", "sperrmüll kostenlos", "kleinanzeigen",
      "job", "karriere", "zu verschenken"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnungsbaugesellschaft"],
      "Nachlass": ["Nachlassverwaltung", "Rechtsanwalt Erbrecht", "Betreuungsbüro", "Nachlassverwalter"],
      "Sozial": ["Sozialdienst", "Pflegeheim", "Seniorenheim", "Sozialstation"]
    },

    scoringSignals: [
      "verwaltung", "nachlass", "betreuung", "erbrecht",
      "wohnung", "pflege", "sozialdienst", "objekt"
    ],

    badFitSignals: [
      "privat", "kleinanzeige", "zu verschenken", "job",
      "sperrmüll kostenlos"
    ],

    googlePlaceTypes: [
      "property_management_company", "lawyer"
    ],

    radiusStrategy: {
      urban: "Hausverwaltungen, Sozialdienste, Betreuungsbüros",
      rural: "Lokale Verwaltungen, Pflegeheime",
      priority: ["Hausverwaltung", "Pflegeheim", "Sozialdienst"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "Sozialdienst",
      "Pflegeheim", "Betreuungsbüro", "Rechtsanwalt Erbrecht"
    ],

    minimumBusinessRelevanceRules: [
      "Professionelle Verwaltungs- oder Betreuungsstruktur erkennbar",
      "Kein Sperrmüll/Privat-Signal",
      "Institutioneller Betreiber"
    ]
  },

  // ──────────────────────────────────────────────
  // 13. MALER / RENOVIERUNG
  // ──────────────────────────────────────────────
  maler_renovierung: {
    id: "maler_renovierung",
    label: "Maler / Renovierung",

    ownServices: [
      "Malerarbeiten", "Renovierung", "Tapezieren", "Lackieren",
      "Fassadenanstrich", "Innenausbau", "Wohnungsrenovierung",
      "Gewerberenovierung", "Trockenbau"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Immobilienverwaltungen", "Hotels",
      "Bürogebäude", "Praxen", "Einzelhandel",
      "Wohnungsbaugesellschaften", "Bauunternehmen",
      "Facility Management Firmen", "Gewerbeimmobilienverwaltungen"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Immobilienverwaltung", "Hotel",
      "Bürogebäude", "Arztpraxis", "Einzelhandel",
      "Wohnungsbaugesellschaft", "Bauunternehmen",
      "Facility Management", "Gewerbeimmobilienverwaltung"
    ],

    idealCustomerProfiles: [
      "regelmäßiger Renovierungsbedarf", "Mieterwechsel",
      "Objektbestand", "Gewerbeflächen",
      "laufende Instandhaltung"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "Kleinstreparaturen", "DIY-Anfragen", "Jobs"
    ],

    negativeKeywords: [
      "privat", "selber streichen", "diy", "job", "ausbildung",
      "kleinanzeigen", "forum"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Immobilienverwaltung", "Wohnungsbaugesellschaft"],
      "Gewerbe": ["Hotel", "Bürogebäude", "Einzelhandel", "Gewerbepark"],
      "Bau": ["Bauunternehmen", "Facility Management", "Generalunternehmer"]
    },

    scoringSignals: [
      "verwaltung", "mieterwechsel", "objekt", "hotel",
      "gewerbe", "bau", "renovierung", "wohnanlage"
    ],

    badFitSignals: [
      "privat", "diy", "job", "kleinanzeige", "selbst streichen"
    ],

    googlePlaceTypes: [
      "property_management_company", "lodging", "real_estate_agency"
    ],

    radiusStrategy: {
      urban: "Hausverwaltungen, Gewerbeobjekte bevorzugen",
      rural: "Lokale Hotels, Wohnungsbaugesellschaften",
      priority: ["Hausverwaltung", "Hotel", "Bauunternehmen"]
    },

    queryPriority: [
      "Hausverwaltung", "Immobilienverwaltung", "Hotel",
      "Bauunternehmen", "Bürogebäude", "Einzelhandel"
    ],

    minimumBusinessRelevanceRules: [
      "Objektbestand oder wiederkehrender Renovierungsbedarf erkennbar",
      "Kein Privat-Signal",
      "Kein DIY-Signal"
    ]
  },

  // ──────────────────────────────────────────────
  // 14. ELEKTRO / GEBÄUDETECHNIK
  // ──────────────────────────────────────────────
  elektro_gebaeudetechnik: {
    id: "elektro_gebaeudetechnik",
    label: "Elektro / Gebäudetechnik",

    ownServices: [
      "Elektroinstallation", "Gebäudetechnik", "Wartung", "E-Check",
      "Beleuchtung", "Netzwerktechnik", "Smart Building",
      "Sicherheitstechnik", "Photovoltaik", "Ladestationen"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Gewerbeobjekte", "Industriebetriebe",
      "Hotels", "Bürogebäude", "Bauunternehmen",
      "Facility Management Firmen", "Einzelhandel",
      "Wohnungsbaugesellschaften", "Praxen"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Gewerbeimmobilie", "Industrieunternehmen",
      "Hotel", "Bürogebäude", "Bauunternehmen",
      "Facility Management", "Einzelhandel",
      "Wohnungsbaugesellschaft", "Arztpraxis"
    ],

    idealCustomerProfiles: [
      "technischer Wartungsbedarf", "mehrere Objekte",
      "Gewerbeflächen", "regelmäßige Prüfungen",
      "Modernisierungsbedarf"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "Kleinstreparaturen", "Jobs", "DIY-Anfragen"
    ],

    negativeKeywords: [
      "privat", "diy", "job", "karriere", "ausbildung", "forum"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Wohnungsbaugesellschaft", "Gewerbeimmobilie"],
      "Gewerbe": ["Bürogebäude", "Hotel", "Einzelhandel", "Gewerbepark"],
      "Industrie": ["Industrieunternehmen", "Bauunternehmen", "Facility Management"]
    },

    scoringSignals: [
      "technik", "gebäude", "wartung", "gewerbe", "industrie",
      "verwaltung", "objekt", "anlage"
    ],

    badFitSignals: [
      "privat", "diy", "job", "forum", "hobby"
    ],

    googlePlaceTypes: [
      "property_management_company", "lodging", "electrician"
    ],

    radiusStrategy: {
      urban: "Gewerbeobjekte, Industriebetriebe, Hausverwaltungen",
      rural: "Lokale Hausverwaltungen, Hotels, Einzelhandel",
      priority: ["Hausverwaltung", "Industrieunternehmen", "Hotel"]
    },

    queryPriority: [
      "Hausverwaltung", "Industrieunternehmen", "Hotel",
      "Bürogebäude", "Bauunternehmen", "Facility Management"
    ],

    minimumBusinessRelevanceRules: [
      "Technischer Wartungsbedarf erkennbar",
      "Kein Privat-Signal",
      "Gewerblicher oder institutioneller Betrieb"
    ]
  },

  // ──────────────────────────────────────────────
  // 15. SHK / SANITÄR / HEIZUNG / KLIMA
  // ──────────────────────────────────────────────
  shk: {
    id: "shk",
    label: "SHK / Sanitär / Heizung / Klima",

    ownServices: [
      "Sanitär", "Heizung", "Klima", "Wartung", "Badsanierung",
      "Rohrreinigung", "Notdienst", "Heizungsmodernisierung",
      "Lüftungstechnik"
    ],

    targetCustomerTypes: [
      "Hausverwaltungen", "Hotels", "Pflegeheime",
      "Gewerbeobjekte", "Bürogebäude", "Wohnungsbaugesellschaften",
      "Facility Management Firmen", "Industriebetriebe",
      "Praxen", "Gastronomiebetriebe"
    ],

    searchableBusinessCategories: [
      "Hausverwaltung", "Hotel", "Pflegeheim", "Gewerbeimmobilie",
      "Bürogebäude", "Wohnungsbaugesellschaft",
      "Facility Management", "Industrieunternehmen",
      "Arztpraxis", "Gastronomie"
    ],

    idealCustomerProfiles: [
      "regelmäßiger Wartungsbedarf", "viele sanitäre Anlagen",
      "Heizungsanlagen", "Gewerbeflächen",
      "Objektbestand", "Notdienstbedarf"
    ],

    excludedCustomerTypes: [
      "Privathaushalte", "Kleinstreparaturen", "DIY", "Jobs"
    ],

    negativeKeywords: [
      "privat", "diy", "job", "ausbildung", "forum",
      "selber machen"
    ],

    searchKeywordVariants: {
      "Verwaltung": ["Hausverwaltung", "Wohnungsbaugesellschaft", "Gewerbeimmobilie"],
      "Gewerbe": ["Hotel", "Bürogebäude", "Gastronomie", "Gewerbepark"],
      "Pflege": ["Pflegeheim", "Seniorenheim", "Facility Management"]
    },

    scoringSignals: [
      "wartung", "heizung", "sanitär", "gewerbe", "hotel",
      "pflege", "verwaltung", "objekt", "anlage"
    ],

    badFitSignals: [
      "privat", "diy", "job", "forum", "selbst"
    ],

    googlePlaceTypes: [
      "property_management_company", "lodging", "hospital", "plumber"
    ],

    radiusStrategy: {
      urban: "Hausverwaltungen, Hotels, Industriebetriebe",
      rural: "Lokale Hausverwaltungen, Pflegeheime, Hotels",
      priority: ["Hausverwaltung", "Hotel", "Pflegeheim", "Industrieunternehmen"]
    },

    queryPriority: [
      "Hausverwaltung", "Hotel", "Pflegeheim", "Bürogebäude",
      "Industrieunternehmen", "Gastronomie"
    ],

    minimumBusinessRelevanceRules: [
      "Regelmäßiger Wartungs- oder Heizungsbedarf erkennbar",
      "Kein Privat-Signal",
      "Institutioneller oder gewerblicher Betrieb"
    ]
  },

  // ──────────────────────────────────────────────
  // 16. EVENTSERVICE
  // ──────────────────────────────────────────────
  eventservice: {
    id: "eventservice",
    label: "Eventservice",

    ownServices: [
      "Eventtechnik", "Veranstaltungsservice", "Aufbau", "Abbau",
      "Personal", "Ton- und Lichttechnik", "Messebau",
      "Bühnenbau", "Eventlogistik"
    ],

    targetCustomerTypes: [
      "Eventlocations", "Messeveranstalter", "Hotels",
      "Unternehmen", "Marketingagenturen", "Stadtverwaltungen",
      "Vereine mit Budget", "Kongresszentren", "Seminarzentren",
      "Veranstalter"
    ],

    searchableBusinessCategories: [
      "Eventlocation", "Messeveranstalter", "Hotel",
      "Marketingagentur", "Kongresszentrum", "Seminarzentrum",
      "Veranstalter", "Messezentrum", "Eventhalle",
      "Tagungszentrum"
    ],

    idealCustomerProfiles: [
      "regelmäßige Events", "hohes Besucheraufkommen",
      "professionelle Veranstaltungen", "Messebetrieb",
      "Tagungen", "B2B-Veranstaltungen"
    ],

    excludedCustomerTypes: [
      "private Geburtstage", "Privatfeiern",
      "Hochzeiten privat", "Kleinanzeigen", "Jobs"
    ],

    negativeKeywords: [
      "privat", "geburtstag", "hochzeit", "kleinanzeigen",
      "job", "karriere", "familienfeier"
    ],

    searchKeywordVariants: {
      "Event": ["Eventlocation", "Veranstalter", "Kongresszentrum", "Eventhalle"],
      "Messe": ["Messeveranstalter", "Messezentrum", "Messebau"],
      "Business": ["Tagungshotel", "Marketingagentur", "Seminarzentrum"]
    },

    scoringSignals: [
      "event", "messe", "kongress", "veranstaltung", "hotel",
      "agentur", "b2b", "tagung", "bühne"
    ],

    badFitSignals: [
      "privat", "geburtstag", "hochzeit", "job", "familienfeier"
    ],

    googlePlaceTypes: [
      "event_venue", "lodging", "conference_center", "stadium"
    ],

    radiusStrategy: {
      urban: "Viele Eventlocations, Messezentren, Hotels",
      rural: "Hotels, Tagungszentren, Veranstalter",
      priority: ["Eventlocation", "Kongresszentrum", "Hotel"]
    },

    queryPriority: [
      "Eventlocation", "Kongresszentrum", "Messeveranstalter",
      "Hotel", "Seminarzentrum", "Marketingagentur"
    ],

    minimumBusinessRelevanceRules: [
      "Professionelle Veranstaltungsstruktur erkennbar",
      "Kein Privat-Event-Signal",
      "B2B-Ausrichtung wahrscheinlich"
    ]
  },

  // ──────────────────────────────────────────────
  // 17. MARKETING / WEBDESIGN / WERBUNG
  // ──────────────────────────────────────────────
  marketing_webdesign_werbung: {
    id: "marketing_webdesign_werbung",
    label: "Marketing / Webdesign / Werbung",

    ownServices: [
      "Webdesign", "SEO", "Google Ads", "Social Media", "Branding",
      "Grafikdesign", "Online Marketing", "Performance Marketing",
      "Local SEO", "Landingpages"
    ],

    targetCustomerTypes: [
      "Handwerksbetriebe", "Arztpraxen", "Steuerberater",
      "Kanzleien", "Restaurants", "Hotels", "Immobilienmakler",
      "lokale Dienstleister", "Fitnessstudios", "Einzelhandel"
    ],

    searchableBusinessCategories: [
      "Handwerksbetrieb", "Arztpraxis", "Steuerberater",
      "Rechtsanwalt", "Restaurant", "Hotel", "Immobilienmakler",
      "Fitnessstudio", "Einzelhandel", "Unternehmensberatung",
      "Zahnarztpraxis", "Autohaus", "Bauunternehmen"
    ],

    idealCustomerProfiles: [
      "lokal sichtbarkeitsabhängig", "schwache Website",
      "Leadbedarf", "Werbebudget möglich", "Wachstumsziel",
      "B2C/B2B Neukundengewinnung"
    ],

    excludedCustomerTypes: [
      "Privatpersonen", "Vereine ohne Budget",
      "Hobbyprojekte", "Jobs"
    ],

    negativeKeywords: [
      "privat", "hobby", "gratis", "job", "karriere", "ehrenamt"
    ],

    searchKeywordVariants: {
      "Lokale Dienstleister": ["Handwerksbetrieb", "Arztpraxis", "Restaurant", "Fitnessstudio"],
      "Beratung": ["Steuerberater", "Rechtsanwalt", "Unternehmensberatung"],
      "Handel": ["Einzelhandel", "Autohaus", "Hotel"]
    },

    scoringSignals: [
      "lokal", "dienstleister", "praxis", "kanzlei", "hotel",
      "shop", "restaurant", "handwerk", "immobilien"
    ],

    badFitSignals: [
      "privat", "hobby", "gratis", "job", "ehrenamt"
    ],

    googlePlaceTypes: [
      "doctor", "lawyer", "restaurant", "gym", "car_dealer",
      "accounting"
    ],

    radiusStrategy: {
      urban: "Diverse lokale Unternehmen, viele KMU",
      rural: "Handwerksbetriebe, lokale Einzelhändler",
      priority: ["Handwerksbetrieb", "Arztpraxis", "Restaurant", "Hotel"]
    },

    queryPriority: [
      "Handwerksbetrieb", "Arztpraxis", "Restaurant",
      "Steuerberater", "Hotel", "Fitnessstudio", "Einzelhandel"
    ],

    minimumBusinessRelevanceRules: [
      "Aktiver lokaler Gewerbebetrieb erkennbar",
      "Kein Privat/Hobby-Signal",
      "Werbebudget plausibel"
    ]
  },

  // ──────────────────────────────────────────────
  // 18. PERSONAL / ZEITARBEIT
  // ──────────────────────────────────────────────
  personal_zeitarbeit: {
    id: "personal_zeitarbeit",
    label: "Personal / Zeitarbeit",

    ownServices: [
      "Zeitarbeit", "Personalvermittlung", "Recruiting",
      "Arbeitnehmerüberlassung", "Fachkräftevermittlung",
      "Aushilfspersonal", "Industriepersonal",
      "Pflegepersonal", "Logistikpersonal"
    ],

    targetCustomerTypes: [
      "Logistikunternehmen", "Industriebetriebe",
      "Produktionsbetriebe", "Pflegeheime", "Hotels", "Gastronomie",
      "Bauunternehmen", "Lagerbetriebe",
      "Reinigungsunternehmen", "Einzelhandel", "Callcenter"
    ],

    searchableBusinessCategories: [
      "Logistikunternehmen", "Industrieunternehmen",
      "Produktionsbetrieb", "Pflegeheim", "Hotel", "Gastronomie",
      "Bauunternehmen", "Lagerbetrieb",
      "Reinigungsunternehmen", "Einzelhandel", "Callcenter"
    ],

    idealCustomerProfiles: [
      "hoher Personalbedarf", "Schichtbetrieb",
      "saisonaler Bedarf", "Fachkräftemangel",
      "wiederkehrende Stellen", "wachsendes Unternehmen"
    ],

    excludedCustomerTypes: [
      "Jobsuchende", "Bewerber", "Privatpersonen", "Vereine"
    ],

    negativeKeywords: [
      "bewerbung", "jobs", "stellenangebot", "karriere",
      "ausbildung", "praktikum", "job suche"
    ],

    searchKeywordVariants: {
      "Industrie": ["Industrieunternehmen", "Produktionsbetrieb", "Maschinenbau"],
      "Logistik": ["Logistikunternehmen", "Lagerbetrieb", "Spedition"],
      "Pflege": ["Pflegeheim", "Seniorenheim", "Klinik", "Pflegedienst"],
      "Gastronomie": ["Hotel", "Gastronomie", "Restaurant"]
    },

    scoringSignals: [
      "produktion", "logistik", "pflege", "hotel",
      "schicht", "lager", "personalbedarf", "industrie"
    ],

    badFitSignals: [
      "bewerbung", "job", "karriere", "praktikum",
      "stellengesuch", "jobsuche"
    ],

    googlePlaceTypes: [
      "storage", "lodging", "hospital", "restaurant"
    ],

    radiusStrategy: {
      urban: "Industrie- und Logistikzentren, Hotels",
      rural: "Produktionsbetriebe, lokale Pflegeheime",
      priority: ["Logistikunternehmen", "Industrieunternehmen", "Pflegeheim"]
    },

    queryPriority: [
      "Logistikunternehmen", "Industrieunternehmen",
      "Pflegeheim", "Produktionsbetrieb", "Hotel", "Gastronomie"
    ],

    minimumBusinessRelevanceRules: [
      "Regelmäßiger Personalbedarf erkennbar",
      "Kein Bewerber/Job-Signal",
      "Gewerblicher Betrieb mit Mitarbeiterbedarf"
    ]
  },

  // ──────────────────────────────────────────────
  // 19. BUCHHALTUNG / STEUERNAHE DIENSTE
  // ──────────────────────────────────────────────
  buchhaltung_steuernahe_dienste: {
    id: "buchhaltung_steuernahe_dienste",
    label: "Buchhaltung / steuernahe Dienste",

    ownServices: [
      "Buchhaltung", "Lohnbuchhaltung", "Belegsortierung",
      "Rechnungswesen", "Controlling", "Büroservice",
      "vorbereitende Buchhaltung", "Finanzorganisation"
    ],

    targetCustomerTypes: [
      "Kleinunternehmen", "Handwerksbetriebe", "Gastronomie",
      "Einzelhandel", "Startups", "Freiberufler", "Pflegedienste",
      "Immobilienverwaltungen", "Agenturen", "Dienstleister"
    ],

    searchableBusinessCategories: [
      "Handwerksbetrieb", "Restaurant", "Einzelhandel",
      "Pflegedienst", "Immobilienverwaltung", "Agentur",
      "Dienstleister", "Gastronomie", "Unternehmensberatung",
      "Bauunternehmen"
    ],

    idealCustomerProfiles: [
      "laufende Belege", "mehrere Rechnungen monatlich",
      "Lohnabrechnung", "Wachstum",
      "organisatorischer Bedarf", "wiederkehrende Büroarbeit"
    ],

    excludedCustomerTypes: [
      "Privatpersonen",
      "Steuerberatungssuchende mit Rechtsberatungserwartung",
      "Jobs", "Vereine ohne Budget"
    ],

    negativeKeywords: [
      "privat", "job", "karriere", "ausbildung",
      "kostenlos", "forum"
    ],

    searchKeywordVariants: {
      "Lokale Unternehmen": ["Handwerksbetrieb", "Restaurant", "Einzelhandel", "Gastronomie"],
      "Dienstleister": ["Agentur", "Pflegedienst", "Immobilienverwaltung"],
      "Beratung": ["Unternehmensberatung", "Dienstleister", "Bauunternehmen"]
    },

    scoringSignals: [
      "unternehmen", "handel", "handwerk", "agentur",
      "shop", "dienstleister", "pflege", "büro"
    ],

    badFitSignals: [
      "privat", "forum", "job", "kostenlos", "selbst"
    ],

    googlePlaceTypes: [
      "restaurant", "car_repair", "doctor"
    ],

    radiusStrategy: {
      urban: "Viele KMU, Agenturen, Dienstleister",
      rural: "Lokale Handwerksbetriebe, Gastronomie, Einzelhandel",
      priority: ["Handwerksbetrieb", "Restaurant", "Einzelhandel"]
    },

    queryPriority: [
      "Handwerksbetrieb", "Restaurant", "Einzelhandel",
      "Pflegedienst", "Agentur", "Immobilienverwaltung"
    ],

    minimumBusinessRelevanceRules: [
      "Regelmäßige Buchführungspflicht erkennbar",
      "Kein Privat-Signal",
      "Gewerblicher Betrieb"
    ]
  },

  // ──────────────────────────────────────────────
  // 20. INDUSTRIESERVICE
  // ──────────────────────────────────────────────
  industrieservice: {
    id: "industrieservice",
    label: "Industrieservice",

    ownServices: [
      "Maschinenreinigung", "Industriewartung", "Anlagenservice",
      "Werkshallenreinigung", "Produktionsunterstützung",
      "Technischer Service", "Instandhaltung", "Sonderreinigung"
    ],

    targetCustomerTypes: [
      "Produktionsbetriebe", "Maschinenbauunternehmen",
      "Metallbauunternehmen", "Logistikzentren", "Chemiebetriebe",
      "Lebensmittelproduktion", "Industrieparks", "Werkshallen",
      "Automobilzulieferer", "Kunststoffverarbeitung"
    ],

    searchableBusinessCategories: [
      "Produktionsbetrieb", "Maschinenbau", "Metallbau",
      "Logistikzentrum", "Chemiebetrieb", "Lebensmittelhersteller",
      "Industriepark", "Automobilzulieferer",
      "Kunststoffverarbeitung", "Industrieunternehmen"
    ],

    idealCustomerProfiles: [
      "laufende Produktion", "technische Anlagen",
      "Schichtbetrieb", "Wartungsbedarf",
      "Industrieflächen", "Sicherheitsanforderungen"
    ],

    excludedCustomerTypes: [
      "Privatpersonen", "kleine Werkstätten ohne Budget", "Jobs"
    ],

    negativeKeywords: [
      "privat", "job", "karriere", "ausbildung", "hobbywerkstatt"
    ],

    searchKeywordVariants: {
      "Produktion": ["Produktionsbetrieb", "Industrieunternehmen", "Lebensmittelhersteller"],
      "Technik": ["Maschinenbau", "Metallbau", "Kunststoffverarbeitung", "Automobilzulieferer"],
      "Standorte": ["Industriepark", "Logistikzentrum", "Chemiebetrieb"]
    },

    scoringSignals: [
      "produktion", "industrie", "maschine", "anlage",
      "werk", "halle", "wartung", "technik"
    ],

    badFitSignals: [
      "privat", "hobby", "job", "klein", "werkstatt privat"
    ],

    googlePlaceTypes: [
      "storage", "moving_company"
    ],

    radiusStrategy: {
      urban: "Industrie- und Gewerbegebiete bevorzugen",
      rural: "Produktionsbetriebe, Maschinenbauer",
      priority: ["Produktionsbetrieb", "Maschinenbau", "Logistikzentrum"]
    },

    queryPriority: [
      "Produktionsbetrieb", "Industrieunternehmen", "Maschinenbau",
      "Logistikzentrum", "Metallbau", "Lebensmittelhersteller"
    ],

    minimumBusinessRelevanceRules: [
      "Industrieller Betrieb erkennbar",
      "Kein Privat/Hobby-Signal",
      "Technischer Wartungsbedarf wahrscheinlich"
    ]
  },

  // ──────────────────────────────────────────────
  // 21. FUHRPARKSERVICE / FAHRZEUGPFLEGE
  // ──────────────────────────────────────────────
  fuhrparkservice_fahrzeugpflege: {
    id: "fuhrparkservice_fahrzeugpflege",
    label: "Fuhrparkservice / Fahrzeugpflege",

    ownServices: [
      "Fahrzeugpflege", "Fuhrparkreinigung", "Innenreinigung",
      "Außenreinigung", "Aufbereitung", "Hol- und Bringservice",
      "Flottenservice", "Smart Repair", "Reifenservice"
    ],

    targetCustomerTypes: [
      "Autohäuser", "Taxiunternehmen", "Pflegedienste",
      "Handwerksbetriebe", "Logistikunternehmen", "Speditionen",
      "Mietwagenfirmen", "Fahrschulen", "Flottenbetreiber",
      "Lieferdienste", "Kommunale Betriebe"
    ],

    searchableBusinessCategories: [
      "Autohaus", "Taxiunternehmen", "Pflegedienst",
      "Handwerksbetrieb", "Logistikunternehmen", "Spedition",
      "Mietwagenfirma", "Fahrschule", "Lieferdienst",
      "Kommunaler Betrieb", "Fuhrparkbetrieb"
    ],

    idealCustomerProfiles: [
      "mehrere Fahrzeuge", "regelmäßige Reinigung", "Außendienst",
      "Lieferverkehr", "repräsentative Fahrzeuge", "Flotte"
    ],

    excludedCustomerTypes: [
      "Privatfahrzeuge", "Einmalige Kleinaufträge",
      "Kleinanzeigen", "Jobs"
    ],

    negativeKeywords: [
      "privat", "gebrauchtwagen privat", "job", "kleinanzeigen",
      "selber reinigen", "auto privat verkaufen"
    ],

    searchKeywordVariants: {
      "Flotte": ["Taxiunternehmen", "Pflegedienst", "Lieferdienst", "Mietwagenfirma"],
      "Auto": ["Autohaus", "Fahrschule", "Fuhrparkbetrieb"],
      "Gewerbe": ["Handwerksbetrieb", "Logistikunternehmen", "Spedition"]
    },

    scoringSignals: [
      "flotte", "fahrzeuge", "lieferung", "taxi", "pflege",
      "autohaus", "logistik", "fuhrpark"
    ],

    badFitSignals: [
      "privat", "kleinanzeige", "job", "einzelfahrzeug",
      "gebrauchtwagen privat"
    ],

    googlePlaceTypes: [
      "car_dealer", "taxi_stand", "car_rental"
    ],

    radiusStrategy: {
      urban: "Autohäuser, Logistikfirmen, Pflegedienste",
      rural: "Lokale Handwerksbetriebe, Autohäuser",
      priority: ["Autohaus", "Logistikunternehmen", "Taxiunternehmen"]
    },

    queryPriority: [
      "Autohaus", "Taxiunternehmen", "Logistikunternehmen",
      "Handwerksbetrieb", "Pflegedienst", "Mietwagenfirma"
    ],

    minimumBusinessRelevanceRules: [
      "Mehrere Fahrzeuge erkennbar",
      "Kein Privat-Signal",
      "Gewerblicher Betrieb mit Fuhrparkbedarf"
    ]
  },

  // ──────────────────────────────────────────────
  // 22. PFLEGE / BETREUUNG
  // ──────────────────────────────────────────────
  pflege_betreuung: {
    id: "pflege_betreuung",
    label: "Pflege / Betreuung",

    ownServices: [
      "Pflege", "Betreuung", "Alltagsbegleitung",
      "Seniorenbetreuung", "Ambulante Pflege", "Haushaltshilfe",
      "Entlastungsleistungen", "Demenzbetreuung"
    ],

    targetCustomerTypes: [
      "Pflegeheime", "Seniorenresidenzen", "Betreutes Wohnen",
      "Kliniken", "Reha-Zentren", "Sozialdienste",
      "Betreuungsvereine", "Ärztehäuser", "Pflegedienste",
      "Kommunale Sozialstellen"
    ],

    searchableBusinessCategories: [
      "Pflegeheim", "Seniorenresidenz", "Betreutes Wohnen",
      "Klinik", "Reha Zentrum", "Sozialdienst",
      "Betreuungsverein", "Ärztehaus", "Pflegedienst",
      "Sozialstation"
    ],

    idealCustomerProfiles: [
      "regelmäßiger Betreuungsbedarf", "Senioren-Zielgruppe",
      "Patienten-/Bewohnerkontakt", "Kooperationsbedarf",
      "soziale Versorgung"
    ],

    excludedCustomerTypes: [
      "Privatpersonen ohne Leistungsrahmen",
      "Jobs", "Foren", "Selbsthilfe ohne Budget"
    ],

    negativeKeywords: [
      "job", "karriere", "ausbildung", "forum",
      "privat", "erfahrung", "selbsthilfe"
    ],

    searchKeywordVariants: {
      "Senioren": ["Pflegeheim", "Seniorenresidenz", "Betreutes Wohnen", "Altenheim"],
      "Medizin": ["Klinik", "Reha Zentrum", "Ärztehaus", "Pflegedienst"],
      "Sozial": ["Sozialdienst", "Betreuungsverein", "Sozialstation"]
    },

    scoringSignals: [
      "pflege", "senioren", "betreuung", "sozial", "reha",
      "klinik", "wohnen", "station"
    ],

    badFitSignals: [
      "job", "forum", "privat", "erfahrung", "selbsthilfe"
    ],

    googlePlaceTypes: [
      "hospital", "doctor", "health"
    ],

    radiusStrategy: {
      urban: "Pflegeheime, Kliniken, Sozialdienste",
      rural: "Lokale Pflegeheime, Betreutes Wohnen",
      priority: ["Pflegeheim", "Klinik", "Sozialdienst"]
    },

    queryPriority: [
      "Pflegeheim", "Seniorenresidenz", "Klinik",
      "Reha Zentrum", "Sozialdienst", "Pflegedienst"
    ],

    minimumBusinessRelevanceRules: [
      "Professionelle Pflegeeinrichtung erkennbar",
      "Kein Forum/Job-Signal",
      "Institutioneller Träger"
    ]
  },

  // ──────────────────────────────────────────────
  // 23. SCHULUNGEN / WEITERBILDUNG
  // ──────────────────────────────────────────────
  schulungen_weiterbildung: {
    id: "schulungen_weiterbildung",
    label: "Schulungen / Weiterbildung",

    ownServices: [
      "Schulungen", "Weiterbildung", "Seminare",
      "Mitarbeiterschulung", "Arbeitssicherheit", "Verkaufstraining",
      "IT-Schulung", "Führungskräftetraining", "Pflichtunterweisungen"
    ],

    targetCustomerTypes: [
      "Unternehmen", "Industriebetriebe", "Pflegeheime", "Hotels",
      "Logistikunternehmen", "Handwerksbetriebe", "Bildungsträger",
      "Kommunen", "Schulen", "Einzelhandel", "Callcenter"
    ],

    searchableBusinessCategories: [
      "Industrieunternehmen", "Pflegeheim", "Hotel",
      "Logistikunternehmen", "Handwerksbetrieb", "Bildungsträger",
      "Schule", "Einzelhandel", "Callcenter",
      "Unternehmensberatung", "Produktionsbetrieb"
    ],

    idealCustomerProfiles: [
      "mehrere Mitarbeitende", "Schulungspflicht",
      "Personalentwicklung", "Compliance",
      "Sicherheitsunterweisung", "wiederkehrender Schulungsbedarf"
    ],

    excludedCustomerTypes: [
      "Privatpersonen", "Schülernachhilfe privat",
      "Hobbykurse", "Jobs"
    ],

    negativeKeywords: [
      "privat", "nachhilfe", "hobby", "job", "karriere", "kostenlos"
    ],

    searchKeywordVariants: {
      "Industrie": ["Industrieunternehmen", "Logistikunternehmen", "Produktionsbetrieb"],
      "Sozial": ["Pflegeheim", "Hotel", "Einzelhandel", "Callcenter"],
      "Öffentlich": ["Bildungsträger", "Schule", "Handwerksbetrieb"]
    },

    scoringSignals: [
      "mitarbeiter", "schulung", "industrie", "pflege",
      "logistik", "compliance", "unternehmen", "betrieb"
    ],

    badFitSignals: [
      "privat", "nachhilfe", "hobby", "job", "kostenlos"
    ],

    googlePlaceTypes: [
      "school", "hospital", "lodging"
    ],

    radiusStrategy: {
      urban: "Industriebetriebe, Hotels, Pflegeheime",
      rural: "Handwerksbetriebe, lokale Bildungsträger",
      priority: ["Industrieunternehmen", "Pflegeheim", "Hotel"]
    },

    queryPriority: [
      "Industrieunternehmen", "Pflegeheim", "Hotel",
      "Logistikunternehmen", "Handwerksbetrieb", "Bildungsträger"
    ],

    minimumBusinessRelevanceRules: [
      "Mehrere Mitarbeitende erkennbar",
      "Kein Privat/Hobby-Signal",
      "Gewerblicher oder institutioneller Betrieb"
    ]
  }
};

// ============================================================
// HELPER / EXPORTE
// ============================================================

/**
 * Legacy-Mapping: alte Branchen-Bezeichnungen → neue IDs
 */
const LEGACY_INDUSTRY_ID_MAP = {
  "Gebäudereinigung": "gebaeudereinigung",
  "Gartenbau / Gartenpflege": "gartenbau",
  "Gartenbau": "gartenbau",
  "Hausmeisterdienst / Facility Service": "facility_service",
  "Facility Service": "facility_service",
  "Hausmeisterdienst": "facility_service",
  "Entrümpelung / Entsorgung": "entruempelung",
  "Entrümpelung": "entruempelung",
  "Buchhaltung / Büroservice": "buchhaltung_steuernahe_dienste",
  "Buchhaltung": "buchhaltung_steuernahe_dienste",
  "Maschinenwartung / Industrieservice": "industrieservice",
  "Industrieservice": "industrieservice",
  "Sicherheitsdienst": "sicherheitsdienst",
  "IT-Service": "it_service",
  "Catering": "catering",
  "Handwerk": "handwerk",
  "Spedition / Logistik": "spedition_logistik",
  "Spedition": "spedition_logistik",
  "Logistik": "spedition_logistik",
  "Gesundheit / Medizin": "gesundheit_medizin",
  "Gesundheit": "gesundheit_medizin",
  "Medizin": "gesundheit_medizin",
  "Immobilien": "immobilien",
  "Lager / Fulfillment": "lager_fulfillment",
  "Fulfillment": "lager_fulfillment",
  "Maler / Renovierung": "maler_renovierung",
  "Maler": "maler_renovierung",
  "Renovierung": "maler_renovierung",
  "Elektro / Gebäudetechnik": "elektro_gebaeudetechnik",
  "Elektro": "elektro_gebaeudetechnik",
  "Gebäudetechnik": "elektro_gebaeudetechnik",
  "SHK / Sanitär / Heizung / Klima": "shk",
  "SHK": "shk",
  "Sanitär": "shk",
  "Heizung": "shk",
  "Eventservice": "eventservice",
  "Marketing / Webdesign / Werbung": "marketing_webdesign_werbung",
  "Marketing": "marketing_webdesign_werbung",
  "Webdesign": "marketing_webdesign_werbung",
  "Personal / Zeitarbeit": "personal_zeitarbeit",
  "Zeitarbeit": "personal_zeitarbeit",
  "Personal": "personal_zeitarbeit",
  "Fuhrparkservice / Fahrzeugpflege": "fuhrparkservice_fahrzeugpflege",
  "Fuhrparkservice": "fuhrparkservice_fahrzeugpflege",
  "Fahrzeugpflege": "fuhrparkservice_fahrzeugpflege",
  "Pflege / Betreuung": "pflege_betreuung",
  "Pflege": "pflege_betreuung",
  "Betreuung": "pflege_betreuung",
  "Schulungen / Weiterbildung": "schulungen_weiterbildung",
  "Schulungen": "schulungen_weiterbildung",
  "Weiterbildung": "schulungen_weiterbildung"
};

/**
 * Gibt das vollständige Branchenprofil zurück.
 * Unterstützt sowohl neue IDs als auch Legacy-Bezeichnungen.
 */
export function getIndustrySearchProfile(industryId) {
  if (!industryId) return null;
  const normalizedId = normalizeIndustryId(industryId);
  return LEAD_SEARCH_TAXONOMY[normalizedId] || null;
}

/**
 * Gibt alle Branchenprofile als Array zurück.
 */
export function getAllIndustrySearchProfiles() {
  return Object.values(LEAD_SEARCH_TAXONOMY);
}

/**
 * Normalisiert Legacy-Bezeichnungen oder Varianten auf die kanonische ID.
 * Unterstützt auch direkte IDs (z.B. "gebaeudereinigung").
 */
export function normalizeIndustryId(value) {
  if (!value) return null;
  const str = String(value).trim();

  // Direkte ID?
  if (LEAD_SEARCH_TAXONOMY[str]) return str;

  // Legacy-Mapping?
  if (LEGACY_INDUSTRY_ID_MAP[str]) return LEGACY_INDUSTRY_ID_MAP[str];

  // Lowercase-Fallback
  const lower = str.toLowerCase();
  const directMatch = Object.keys(LEAD_SEARCH_TAXONOMY).find(k => k.toLowerCase() === lower);
  if (directMatch) return directMatch;

  return str; // Fallback: originaler Wert
}