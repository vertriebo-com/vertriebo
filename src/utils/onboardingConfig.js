// ─── Onboarding-Konfiguration ───────────────────────────────────────────────────

// Vollständige Branchenliste (DB-synchron mit getTaxonomy SEED)
// Neue Branchen hier hinzufügen + TAXONOMY_SEED in getTaxonomy erweitern
export const INDUSTRIES = [
  // Core Verticals
  { icon: "🧹", name: "Gebäudereinigung" },
  { icon: "🔒", name: "Sicherheitsdienst" },
  { icon: "💻", name: "IT-Service" },
  { icon: "🌿", name: "Gartenbau" },
  { icon: "🍽️", name: "Catering" },
  { icon: "🔨", name: "Handwerk" },
  { icon: "🚚", name: "Spedition / Logistik" },
  { icon: "🏥", name: "Gesundheit / Medizin" },
  { icon: "🏢", name: "Immobilien" },
  { icon: "📦", name: "Lager / Fulfillment" },
  { icon: "🏠", name: "Facility Service" },
  { icon: "🗑️", name: "Entrümpelung" },
  { icon: "🎨", name: "Maler / Renovierung" },
  { icon: "⚡", name: "Elektro / Gebäudetechnik" },
  { icon: "🚿", name: "SHK / Sanitär / Heizung" },
  { icon: "🎪", name: "Eventservice" },
  { icon: "📣", name: "Marketing / Webdesign" },
  { icon: "👥", name: "Personal / Zeitarbeit" },
  { icon: "🚗", name: "Fuhrparkservice" },
  { icon: "❤️", name: "Pflege / Betreuung" },
  { icon: "📚", name: "Schulungen / Weiterbildung" },
  { icon: "📊", name: "Buchhaltung / Büroservice" },
  { icon: "⚙️", name: "Industrieservice" },
  // Erweiterte Dienstleister
  { icon: "🏗️", name: "Dachdecker" },
  { icon: "🔧", name: "Gerüstbau" },
  { icon: "🧱", name: "Trockenbau / Innenausbau" },
  { icon: "🪟", name: "Fliesenleger" },
  { icon: "🪵", name: "Bodenleger" },
  { icon: "🔑", name: "Schlüsseldienst / Schließanlagen" },
  { icon: "🐀", name: "Schädlingsbekämpfung" },
  { icon: "🔥", name: "Brandschutzservice" },
  { icon: "🛗", name: "Aufzugservice" },
  { icon: "🚪", name: "Tor- und Türtechnik" },
  { icon: "☀️", name: "Photovoltaik-Service" },
  { icon: "📦", name: "Umzugsunternehmen" },
  // B2B Spezialprofile
  { icon: "🖨️", name: "Druckerei / Werbetechnik" },
  { icon: "🗂️", name: "Aktenvernichtung / Dokumentenmanagement" },
  { icon: "⚡", name: "Energieberatung" },
  { icon: "🦺", name: "Arbeitsschutz / Arbeitssicherheit" },
  { icon: "🔐", name: "Datenschutz / Compliance" },
  { icon: "🏗️", name: "Messebau" },
  // Fallback
  { icon: "🔧", name: "Andere Branche / Sonstiges" },
];

export const SERVICES = [
  "Gebäudereinigung",
  "Büroreinigung",
  "Treppenhausreinigung",
  "Fensterreinigung",
  "Hausmeisterdienst",
  "Gartenpflege",
  "Winterdienst",
  "Entrümpelung",
  "Sicherheitsdienst",
  "IT-Service",
  "Kurierdienst",
  "Expresslieferung",
  "Lagerlogistik",
  "Fulfillment",
  "Transport",
];

export const TARGET_CUSTOMER_TYPES = [
  "Hausverwaltungen",
  "Immobilienverwaltungen",
  "Bürogebäude",
  "Arztpraxen",
  "Zahnarztpraxen",
  "Kanzleien",
  "Steuerkanzleien",
  "Autohäuser",
  "Werkstätten",
  "Hotels",
  "Pflegeheime",
  "Schulen",
  "Kitas",
  "Fitnessstudios",
  "Einzelhandel",
  "Supermärkte",
  "Restaurants",
  "Lagerhallen",
  "Produktionsbetriebe",
  "Industrieunternehmen",
  "Bauunternehmen",
  "Handwerksbetriebe",
  "Online-Shops",
  "Großhändler",
  "Möbelhäuser",
  "Apotheken",
  "Logistikzentren",
];

export const EXCLUDED_CUSTOMER_TYPES = [
  "Keine Privatkunden",
  "Keine Restaurants",
  "Keine Ärzte",
  "Keine Steuerberater",
  "Keine IT-Firmen",
  "Keine Immobilienfirmen",
  "Keine Vereine",
  "Keine Behörden",
  "Keine Kleinstbetriebe",
];

export const COMPANY_SIZES = [
  { value: "any", label: "Egal" },
  { value: "1-5", label: "1–5 Mitarbeiter" },
  { value: "6-20", label: "6–20 Mitarbeiter" },
  { value: "21-50", label: "21–50 Mitarbeiter" },
  { value: "50+", label: "50+ Mitarbeiter" },
];

export const OBJECT_TYPES = [
  "Büro",
  "Praxis",
  "Lager",
  "Produktion",
  "Hotel",
  "WEG / Wohnanlage",
  "Gewerbehalle",
  "Einzelhandel",
  "Werkstatt",
  "Gastronomie",
  "Pflegeeinrichtung",
];

export const CONTACT_ROLES = [
  "Inhaber",
  "Geschäftsführung",
  "Verwaltung",
  "Einkauf",
  "Standortleitung",
  "Objektleitung",
];

export const PRIORITY_FOCUS = [
  "Lokale Firmen",
  "Größere Betriebe",
  "Regelmäßiger Bedarf",
  "Schneller Abschluss",
  "Hoher Umsatzwert",
];