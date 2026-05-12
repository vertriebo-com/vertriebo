/**
 * Industry Target Presets — Branchen-Taxonomie für Vertriebo
 * 
 * Struktur pro Branche:
 * - id: Eindeutige Kennung (slug)
 * - label: Anzeigetext
 * - ownServices: Typische Leistungen dieser Branche
 * - targetCustomerTypes: B2B-Zielkunden die diese Branche sucht
 * - excludedCustomerTypes: Zielgruppen die auszuschließen sind
 * - searchKeywordVariants: Suchbegriff-Varianten pro Zielkundentyp
 */

export const INDUSTRY_PRESETS = [
  {
    id: "gebäudereinigung",
    label: "Gebäudereinigung",
    ownServices: [
      "Regelmäßige Gebäudereinigung",
      "Büroreinigung",
      "Treppenhausreinigung",
      "Fensterreinigung",
      "Spezialreinigung",
      "Desinfizierung"
    ],
    targetCustomerTypes: [
      "Hausverwaltungen",
      "WEG-Verwaltungen",
      "Bürogebäude",
      "Arztpraxen",
      "Kanzleien",
      "Schulen",
      "Kitas",
      "Pflegeheime",
      "Hotels",
      "Fitnessstudios",
      "Autohäuser",
      "Industriehallen",
      "Logistikzentren",
      "Supermärkte"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Restaurants",
      "Einzelhandel"
    ],
    searchKeywordVariants: {
      "Hausverwaltungen": ["Hausverwaltung", "Immobilienverwaltung", "WEG-Verwaltung"],
      "Bürogebäude": ["Büro", "Office", "Business Center"],
      "Arztpraxen": ["Zahnarzt", "Arztpraxis", "Facharzt"],
      "Kanzleien": ["Rechtsanwalt", "Kanzlei", "Jura"],
      "Schulen": ["Schule", "Gymnasium", "Grundschule"],
      "Kitas": ["Kita", "Kindergarten", "Kindertagesstätte"],
      "Pflegeheime": ["Pflegeheim", "Seniorenheim", "Altenheim"],
      "Hotels": ["Hotel", "Herberge", "Pension"],
      "Fitnessstudios": ["Fitnessstudio", "Fitnesscenter", "Gym"],
      "Autohäuser": ["Autohaus", "Autoreparatur", "Autowerkstatt"],
      "Industriehallen": ["Industrie", "Fabrik", "Werk"],
      "Logistikzentren": ["Logistik", "Lagerhalle", "Warenhaus"],
      "Supermärkte": ["Supermarkt", "Discounter", "Lebensmittelmarkt"]
    }
  },
  {
    id: "sicherheitsdienst",
    label: "Sicherheitsdienst",
    ownServices: [
      "Objektschutz",
      "Personenschutz",
      "Pfortendienst",
      "Streifendienst",
      "Eventschutz",
      "Parkschutz"
    ],
    targetCustomerTypes: [
      "Baustellen",
      "Industrie",
      "Logistikzentren",
      "Events",
      "Hotels",
      "Einzelhandel",
      "Supermärkte",
      "Bürokomplexe",
      "Parkhäuser",
      "Krankenhäuser",
      "Schulen",
      "Behörden"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "NGOs",
      "Vereine"
    ],
    searchKeywordVariants: {
      "Baustellen": ["Baustelle", "Bau", "Baudurchführung"],
      "Industrie": ["Industrie", "Fabrik", "Produktion"],
      "Logistikzentren": ["Logistik", "Lagerhalle", "Warenlager"],
      "Events": ["Event", "Veranstaltung", "Messe"],
      "Hotels": ["Hotel", "Herberge"],
      "Einzelhandel": ["Einzelhandel", "Ladengeschäft"],
      "Supermärkte": ["Supermarkt", "Discounter"],
      "Bürokomplexe": ["Büro", "Bürohaus", "Business Center"],
      "Krankenhäuser": ["Krankenhaus", "Klinik", "Hospital"],
      "Schulen": ["Schule", "Gymnasium"],
      "Behörden": ["Behörde", "Rathaus", "Polizei"]
    }
  },
  {
    id: "it-service",
    label: "IT-Service",
    ownServices: [
      "IT-Betreuung",
      "Netzwerk-Administration",
      "Cloud-Lösungen",
      "Cybersecurity",
      "Hardware-Service",
      "Datensicherung"
    ],
    targetCustomerTypes: [
      "Arztpraxen",
      "Kanzleien",
      "Steuerberater",
      "Handwerksbetriebe",
      "Kleine Büros",
      "Hotels",
      "Einzelhandel",
      "Immobilienverwaltungen",
      "Schulen",
      "Pflegeeinrichtungen",
      "Logistikfirmen"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Großkonzerne mit eigenem IT"
    ],
    searchKeywordVariants: {
      "Arztpraxen": ["Zahnarzt", "Arztpraxis"],
      "Kanzleien": ["Rechtsanwalt", "Kanzlei"],
      "Steuerberater": ["Steuerkanzlei", "Steuerberater"],
      "Handwerksbetriebe": ["Handwerk", "Handwerksbetrieb"],
      "Kleine Büros": ["Büro", "Gewerbe"],
      "Hotels": ["Hotel"],
      "Schulen": ["Schule"],
      "Immobilienverwaltungen": ["Immobilienverwaltung", "Hausverwaltung"],
      "Logistikfirmen": ["Logistik", "Spedition"]
    }
  },
  {
    id: "gartenbau",
    label: "Gartenbau / Gartenpflege",
    ownServices: [
      "Gartenpflege",
      "Rasenmähen",
      "Baumschnitt",
      "Landschaftsbau",
      "Begrünung",
      "Schneeräumung"
    ],
    targetCustomerTypes: [
      "Hausverwaltungen",
      "Wohnanlagen",
      "Gewerbeparks",
      "Hotels",
      "Pflegeheime",
      "Kitas",
      "Schulen",
      "Autohäuser",
      "Industrieflächen",
      "Kommunen",
      "Sportvereine"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Restaurants"
    ],
    searchKeywordVariants: {
      "Hausverwaltungen": ["Hausverwaltung", "Wohnadministration"],
      "Wohnanlagen": ["Wohnanlage", "Wohnkomplex"],
      "Gewerbeparks": ["Gewerbepark", "Business Park"],
      "Hotels": ["Hotel"],
      "Pflegeheime": ["Pflegeheim", "Seniorenheim"],
      "Schulen": ["Schule"],
      "Kitas": ["Kita", "Kindergarten"],
      "Autohäuser": ["Autohaus"],
      "Kommunen": ["Stadt", "Gemeinde", "Kommune"],
      "Sportvereine": ["Sportverein", "Sportclub"]
    }
  },
  {
    id: "catering",
    label: "Catering",
    ownServices: [
      "Business Catering",
      "Event Catering",
      "Kita- und Schulverpflegung",
      "Kantinenservice",
      "Meeting-Catering",
      "Großveranstaltungsservice"
    ],
    targetCustomerTypes: [
      "Büros",
      "Kanzleien",
      "Agenturen",
      "Schulen",
      "Kitas",
      "Pflegeheime",
      "Kliniken",
      "Eventlocations",
      "Messebauer",
      "Vereine",
      "Behörden",
      "Produktionsbetriebe",
      "Hotels"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Restaurants",
      "Cafés"
    ],
    searchKeywordVariants: {
      "Büros": ["Büro", "Unternehmen", "Business Center"],
      "Kanzleien": ["Kanzlei", "Rechtsanwalt"],
      "Agenturen": ["Agentur", "Marketing"],
      "Schulen": ["Schule"],
      "Kitas": ["Kita", "Kindergarten"],
      "Pflegeheime": ["Pflegeheim", "Seniorenheim"],
      "Kliniken": ["Krankenhaus", "Klinik"],
      "Eventlocations": ["Eventlocation", "Veranstaltungshalle"],
      "Messebauer": ["Messe", "Messebauer"],
      "Behörden": ["Behörde", "Rathaus"]
    }
  },
  {
    id: "handwerk",
    label: "Handwerk",
    ownServices: [
      "Reparatur und Instandhaltung",
      "Wartungsservice",
      "Notfalleinsätze",
      "Installationen",
      "Renovierungsarbeiten"
    ],
    targetCustomerTypes: [
      "Hausverwaltungen",
      "Immobilienfirmen",
      "Bauunternehmen",
      "Hotels",
      "Pflegeheime",
      "Schulen",
      "Kitas",
      "Gewerbeparks",
      "Einzelhandel",
      "Industrie",
      "Facility-Manager"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Hausverwaltungen": ["Hausverwaltung"],
      "Immobilienfirmen": ["Immobilie", "Makler"],
      "Bauunternehmen": ["Bauunternehmen", "Baufirma"],
      "Hotels": ["Hotel"],
      "Pflegeheime": ["Pflegeheim"],
      "Schulen": ["Schule"],
      "Gewerbeparks": ["Gewerbepark"],
      "Einzelhandel": ["Einzelhandel", "Ladengeschäft"],
      "Industrie": ["Industrie", "Fabrik"]
    }
  },
  {
    id: "spedition",
    label: "Spedition / Logistik",
    ownServices: [
      "Gütertransport",
      "Lagerlogistik",
      "Distributionsservice",
      "Express-Service",
      "Möbeltransport",
      "Kühllogistik"
    ],
    targetCustomerTypes: [
      "Online-Shops",
      "Großhändler",
      "Möbelhäuser",
      "Küchenstudios",
      "Baustoffhändler",
      "Maschinenbauer",
      "Autohäuser",
      "Industrie",
      "Lebensmittelhändler",
      "Apotheken-Großhandel"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Restaurants"
    ],
    searchKeywordVariants: {
      "Online-Shops": ["Online-Shop", "E-Commerce"],
      "Großhändler": ["Großhandel", "Großhändler"],
      "Möbelhäuser": ["Möbelhaus", "Möbel"],
      "Baustoffhändler": ["Baustoff", "Baustoffhandel"],
      "Maschinenbauer": ["Maschinenbau"],
      "Autohäuser": ["Autohaus"],
      "Industrie": ["Industrie", "Fabrik"],
      "Lebensmittelhändler": ["Lebensmittel", "Nahrungsmittel"]
    }
  },
  {
    id: "gesundheit",
    label: "Gesundheit / Medizin",
    ownServices: [
      "Betriebsmedizin",
      "Präventionsmaßnahmen",
      "Gesundheitscoaching",
      "Ergonomie-Beratung",
      "Impf- und Testservice"
    ],
    targetCustomerTypes: [
      "Unternehmen mit Betriebsmedizinbedarf",
      "Pflegeheime",
      "Reha-Zentren",
      "Kitas",
      "Schulen",
      "Sportvereine",
      "Hotels",
      "Behörden",
      "Industrieunternehmen"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Pflegeheime": ["Pflegeheim", "Seniorenheim"],
      "Reha-Zentren": ["Reha-Zentrum", "Rehabilitationszentrum"],
      "Kitas": ["Kita", "Kindergarten"],
      "Schulen": ["Schule"],
      "Sportvereine": ["Sportverein", "Fitnessstudio"],
      "Hotels": ["Hotel"],
      "Industrieunternehmen": ["Industrie"]
    }
  },
  {
    id: "immobilien",
    label: "Immobilien",
    ownServices: [
      "Immobilienmakler-Service",
      "Bewertung und Gutachten",
      "Vermietung und Verwaltung",
      "Projektentwicklung",
      "Investmentberatung",
      "Standortanalyse"
    ],
    // Nur suchbare Firmenkategorien – keine Eigentümer/Investoren als Suchqueries
    targetCustomerTypes: [
      "Hausverwaltungen",
      "Immobilienverwaltungen",
      "WEG-Verwaltungen",
      "Bauträger",
      "Wohnungsbaugesellschaften",
      "Gewerbeimmobilienverwaltungen",
      "Immobiliengesellschaften",
      "Property Management"
    ],
    // Idealprofil-Zielgruppen – werden als KI-Kontext genutzt, nicht als Suchqueries
    idealCustomerProfiles: [
      "Eigentümer",
      "Investoren",
      "Gewerbeimmobilienbesitzer",
      "Erbengemeinschaften",
      "Unternehmen mit Standortsuche"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "private Vermieter",
      "Makler ohne Verwaltungsbestand"
    ],
    searchKeywordVariants: {
      "Hausverwaltungen": ["Hausverwaltung", "Immobilienverwaltung", "WEG Verwaltung"],
      "Immobilienverwaltungen": ["Immobilienverwaltung", "Mietverwaltung", "Objektverwaltung"],
      "WEG-Verwaltungen": ["WEG Verwaltung", "WEG-Verwaltung", "Wohnungseigentumsverwaltung"],
      "Bauträger": ["Bauträger", "Projektentwickler", "Immobilienentwickler"],
      "Wohnungsbaugesellschaften": ["Wohnungsbaugesellschaft", "Wohnungsbau GmbH", "kommunale Wohnungsgesellschaft"],
      "Gewerbeimmobilienverwaltungen": ["Gewerbeimmobilienverwaltung", "Commercial Property Management", "Gewerbeobjekt Verwaltung"],
      "Immobiliengesellschaften": ["Immobiliengesellschaft", "Immobilien GmbH", "Immobilien AG"],
      "Property Management": ["Property Management", "Facility Management Immobilien", "Immobilienbestand"]
    }
  },
  {
    id: "lager",
    label: "Lager / Fulfillment",
    ownServices: [
      "Lagerlogistik",
      "Fulfillment-Service",
      "Pick-and-Pack",
      "Bestandsverwaltung",
      "Versandabwicklung",
      "Qualitätskontrolle"
    ],
    targetCustomerTypes: [
      "Online-Shops",
      "Shopify-Händler",
      "Amazon-Händler",
      "Großhändler",
      "Ersatzteilhändler",
      "Kosmetikmarken",
      "Lebensmittelmarken",
      "Textilhändler",
      "Startups mit Versandbedarf"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Online-Shops": ["Online-Shop", "E-Commerce"],
      "Großhändler": ["Großhandel"],
      "Ersatzteilhändler": ["Ersatzteil", "Ersatzteilhandel"],
      "Kosmetikmarken": ["Kosmetik", "Beauty"],
      "Lebensmittelmarken": ["Lebensmittel"],
      "Textilhändler": ["Textil", "Mode", "Kleidung"]
    }
  },
  // Zusätzliche Branchen
  {
    id: "facility-service",
    label: "Hausmeisterdienst / Facility Service",
    ownServices: [
      "Facility Management",
      "Hausmeisterservice",
      "Gebäudewartung",
      "Notfalldienste",
      "Instandhaltung"
    ],
    targetCustomerTypes: [
      "Bürogebäude",
      "Immobilienfirmen",
      "Hotels",
      "Schulen",
      "Industrieflächen",
      "Gewerbepark",
      "Krankenhäuser"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Bürogebäude": ["Büro"],
      "Hotels": ["Hotel"],
      "Industrieflächen": ["Industrie"],
      "Schulen": ["Schule"]
    }
  },
  {
    id: "entrümpelung",
    label: "Entrümpelung / Entsorgung",
    ownServices: [
      "Entrümpelung",
      "Entsorgung",
      "Schrottabholung",
      "Elektroschrott-Recycling",
      "Bauschutt-Verwertung"
    ],
    targetCustomerTypes: [
      "Immobilienfirmen",
      "Bauunternehmen",
      "Industrieunternehmen",
      "Einzelhandel",
      "Schulen",
      "Behörden",
      "Pflegeheime"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Immobilienfirmen": ["Immobilie"],
      "Bauunternehmen": ["Bau"],
      "Schulen": ["Schule"]
    }
  },
  {
    id: "maler",
    label: "Maler / Renovierung",
    ownServices: [
      "Innenmalerei",
      "Außenmalerei",
      "Fassadengestaltung",
      "Tapezierarbeiten",
      "Renovierung",
      "Farbgestaltung"
    ],
    targetCustomerTypes: [
      "Immobilienfirmen",
      "Bauunternehmen",
      "Hausverwaltungen",
      "Hotels",
      "Einzelhandel",
      "Schulen",
      "Industrie"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Hausverwaltungen": ["Hausverwaltung"],
      "Hotels": ["Hotel"],
      "Schulen": ["Schule"]
    }
  },
  {
    id: "elektro",
    label: "Elektro / Gebäudetechnik",
    ownServices: [
      "Elektroinstallation",
      "Elektroreparatur",
      "Gebäudeautomation",
      "Energieberatung",
      "Wartungsservice"
    ],
    targetCustomerTypes: [
      "Bauunternehmen",
      "Hausverwaltungen",
      "Industrie",
      "Hotels",
      "Schulen",
      "Krankenhäuser",
      "Einzelhandel"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Bauunternehmen": ["Bau"],
      "Hotels": ["Hotel"],
      "Schulen": ["Schule"]
    }
  },
  {
    id: "shk",
    label: "SHK / Sanitär / Heizung / Klima",
    ownServices: [
      "Sanitärinstallation",
      "Heizungsservice",
      "Klimatechnik",
      "Warmwasserservice",
      "Notfalldienste"
    ],
    targetCustomerTypes: [
      "Bauunternehmen",
      "Hausverwaltungen",
      "Hotels",
      "Schulen",
      "Industrie",
      "Krankenhäuser",
      "Pflegeheime"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Hausverwaltungen": ["Hausverwaltung"],
      "Hotels": ["Hotel"],
      "Schulen": ["Schule"]
    }
  },
  {
    id: "schädlingsbekämpfung",
    label: "Schädlingsbekämpfung",
    ownServices: [
      "Ungezieferbekämpfung",
      "Schädlingscontrolling",
      "Hygiene-Beratung",
      "Desinfektion",
      "Präventionsservice"
    ],
    targetCustomerTypes: [
      "Lebensmittelbetriebe",
      "Restaurants",
      "Schulen",
      "Kitas",
      "Pflegeheime",
      "Krankenhäuser",
      "Hotels",
      "Einzelhandel"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Lebensmittelbetriebe": ["Lebensmittel"],
      "Restaurants": ["Restaurant"],
      "Schulen": ["Schule"],
      "Hotels": ["Hotel"]
    }
  },
  {
    id: "umzug",
    label: "Umzug / Transport",
    ownServices: [
      "Möbeltransport",
      "Büroumzug",
      "Lagerumzug",
      "Umzugsservice",
      "Lagerung"
    ],
    targetCustomerTypes: [
      "Büorunternehmen",
      "Einzelhandel",
      "Industrie",
      "Immobilienfirmen",
      "Großhändler",
      "Agenturen"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Büos": ["Büro"],
      "Einzelhandel": ["Einzelhandel"],
      "Industrie": ["Industrie"]
    }
  },
  {
    id: "eventservice",
    label: "Eventservice / Veranstaltungstechnik",
    ownServices: [
      "Veranstaltungstechnik",
      "Bühnen-Setup",
      "Audiovisualtechnik",
      "Eventmanagement",
      "Dekoration"
    ],
    targetCustomerTypes: [
      "Event-Agenturen",
      "Eventlocations",
      "Hotels",
      "Messe-Organisationen",
      "Behörden",
      "Unternehmen",
      "Vereine"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Event-Agenturen": ["Eventagentur"],
      "Eventlocations": ["Eventlocation"],
      "Hotels": ["Hotel"],
      "Messe-Organisationen": ["Messe"]
    }
  },
  {
    id: "marketing",
    label: "Marketing / Webdesign / Werbung",
    ownServices: [
      "Webdesign",
      "Grafik-Design",
      "Online-Marketing",
      "Branding",
      "Social-Media",
      "Werbeproduktion"
    ],
    targetCustomerTypes: [
      "Kleine und mittlere Unternehmen",
      "Einzelhandel",
      "Handwerksbetriebe",
      "Startups",
      "Immobilienfirmen",
      "Dienstleistungsbetriebe",
      "Hotels"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Großkonzerne"
    ],
    searchKeywordVariants: {
      "Kleine und mittlere Unternehmen": ["Unternehmen", "KMU"],
      "Einzelhandel": ["Einzelhandel"],
      "Handwerksbetriebe": ["Handwerk"],
      "Startups": ["Startup"],
      "Hotels": ["Hotel"]
    }
  },
  {
    id: "personal",
    label: "Personal / Zeitarbeit",
    ownServices: [
      "Personalvermittlung",
      "Zeitarbeit",
      "Personalberatung",
      "Executive Search",
      "Recruitment"
    ],
    targetCustomerTypes: [
      "Industrie",
      "Handwerksbetriebe",
      "Einzelhandel",
      "Logistik",
      "Gastronomie",
      "Büros",
      "Produktionsbetriebe"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Arbeitsagenturen"
    ],
    searchKeywordVariants: {
      "Industrie": ["Industrie"],
      "Handwerksbetriebe": ["Handwerk"],
      "Einzelhandel": ["Einzelhandel"],
      "Logistik": ["Logistik"],
      "Gastronomie": ["Restaurant", "Gastronomie"]
    }
  },
  {
    id: "buchhaltung",
    label: "Buchhaltung / Büroservice",
    ownServices: [
      "Buchhaltung",
      "Lohnabrechnung",
      "Steuererklärung",
      "Finanzberatung",
      "Büroservice",
      "Schreibdienste"
    ],
    targetCustomerTypes: [
      "Handwerksbetriebe",
      "Kleingewerbe",
      "Ärzte und Zahnärzte",
      "Kanzleien",
      "Agenturen",
      "Einzelhandel",
      "Startups"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Handwerksbetriebe": ["Handwerk"],
      "Ärzte und Zahnärzte": ["Zahnarzt", "Arztpraxis"],
      "Kanzleien": ["Kanzlei"],
      "Einzelhandel": ["Einzelhandel"]
    }
  },
  {
    id: "druckerei",
    label: "Druckerei / Werbetechnik",
    ownServices: [
      "Digitaldruck",
      "Offsetdruck",
      "Großformatdruck",
      "Beschilderung",
      "Verpackungsdruck",
      "Werbemittel"
    ],
    targetCustomerTypes: [
      "Agenturen",
      "Werbebüros",
      "Einzelhandel",
      "Immobilienfirmen",
      "Hotels",
      "Event-Organisationen",
      "Handwerksbetriebe"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Agenturen": ["Agentur"],
      "Werbebüros": ["Werbebüro"],
      "Einzelhandel": ["Einzelhandel"],
      "Hotels": ["Hotel"]
    }
  },
  {
    id: "maschinenwartung",
    label: "Maschinenwartung / Industrieservice",
    ownServices: [
      "Maschinenservice",
      "Wartung und Instandhaltung",
      "Reparaturservice",
      "Technische Beratung",
      "Notfalleinsätze"
    ],
    targetCustomerTypes: [
      "Industrie",
      "Produktionsbetriebe",
      "Verarbeitungsbetriebe",
      "Handwerksbetriebe",
      "Logistik"
    ],
    excludedCustomerTypes: [
      "Privathaushalte",
      "Einzelhandel"
    ],
    searchKeywordVariants: {
      "Industrie": ["Industrie", "Fabrik"],
      "Produktionsbetriebe": ["Produktion"],
      "Handwerksbetriebe": ["Handwerk"],
      "Logistik": ["Logistik"]
    }
  },
  {
    id: "fuhrpark",
    label: "Fuhrparkservice / Fahrzeugpflege",
    ownServices: [
      "Fahrzeugwartung",
      "Inspektionen",
      "Reparaturservice",
      "Fuhrparkmanagement",
      "Motorwäsche",
      "Fahrzeugreinigung"
    ],
    targetCustomerTypes: [
      "Transportfirmen",
      "Logistikfirmen",
      "Dienstleister mit Flotte",
      "Vermietungen",
      "Taxiunternehmen",
      "Handwerksbetriebe"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Transportfirmen": ["Spedition", "Transport"],
      "Logistikfirmen": ["Logistik"],
      "Dienstleister mit Flotte": ["Lieferdienst"],
      "Taxiunternehmen": ["Taxi"]
    }
  },
  {
    id: "pflege",
    label: "Pflege / Betreuung",
    ownServices: [
      "Altenpflege",
      "Krankenpflege",
      "Haushaltshilfe",
      "Betreuung",
      "24-Stunden-Betreuung",
      "Palliativpflege"
    ],
    targetCustomerTypes: [
      "Seniorenheime",
      "Pflegeheime",
      "Krankenhäuser",
      "Krankenkassen",
      "Private Haushalte mit Betreuungsbedarf",
      "Ambulante Dienste"
    ],
    excludedCustomerTypes: [
      "Restaurants",
      "Einzelhandel"
    ],
    searchKeywordVariants: {
      "Seniorenheime": ["Seniorenheim"],
      "Pflegeheime": ["Pflegeheim"],
      "Krankenhäuser": ["Krankenhaus", "Klinik"]
    }
  },
  {
    id: "schulungen",
    label: "Schulungen / Weiterbildung",
    ownServices: [
      "Berufsausbildung",
      "Fortbildungskurse",
      "Online-Training",
      "Coaching",
      "Personalentwicklung",
      "Zertifizierungsprogramme"
    ],
    targetCustomerTypes: [
      "Industrie",
      "Handwerksbetriebe",
      "Dienstleistungsbetriebe",
      "Schulen",
      "Universitäten",
      "Behörden",
      "Großunternehmen"
    ],
    excludedCustomerTypes: [
      "Privathaushalte"
    ],
    searchKeywordVariants: {
      "Industrie": ["Industrie"],
      "Handwerksbetriebe": ["Handwerk"],
      "Schulen": ["Schule"],
      "Universitäten": ["Universität"],
      "Behörden": ["Behörde"]
    }
  }
];

/**
 * Hilfsfunktion: Preset für eine bestimmte Branche abrufen
 */
export function getIndustryPreset(industryId) {
  return INDUSTRY_PRESETS.find(p => p.id === industryId);
}

/**
 * Hilfsfunktion: Alle verfügbaren Branche-Labels abrufen
 */
export function getIndustryLabels() {
  return INDUSTRY_PRESETS.map(p => p.label);
}

/**
 * Hilfsfunktion: ID aus Label auflösen
 */
export function getIndustryIdByLabel(label) {
  const preset = INDUSTRY_PRESETS.find(p => p.label === label);
  return preset?.id;
}