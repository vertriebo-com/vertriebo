/**
 * ============================================================
 * VERTRIEBO - generateLeads v2 (Phase C)
 * ============================================================
 * Nutzt die neue LeadSearchEngine Inline.
 *
 * ARCHITEKTUR-ENTSCHEIDUNG:
 * Da Deno Backend-Functions keine lokalen Imports unterstützen,
 * sind Taxonomy + Engine hier inline eingebettet.
 * utils/leadSearchTaxonomy.js und utils/leadSearchEngine.js
 * sind identische Kopien für Frontend-Nutzung.
 * EINE QUELLE DER WAHRHEIT: Änderungen müssen in beiden gepflegt werden.
 * ============================================================
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SEARCH_ENGINE_VERSION = "v2";

// ============================================================
// INLINE: LEAD SEARCH TAXONOMY
// (Quelle der Wahrheit: utils/leadSearchTaxonomy.js)
// ============================================================

const LEAD_SEARCH_TAXONOMY = {
  gebaeudereinigung: {
    id: "gebaeudereinigung", label: "Gebäudereinigung",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","Bürogebäude","Ärztehaus","Arztpraxis","Zahnarztpraxis","Kindertagesstätte","Schule","Pflegeheim","Seniorenheim","Hotel","Autohaus","Fitnessstudio","Gewerbepark","Industrieunternehmen","Einzelhandel","Supermarkt"],
    idealCustomerProfiles: ["regelmäßiger Reinigungsbedarf","mehrere Standorte","größere Nutzfläche","laufende Objektbetreuung","wiederkehrende Dienstleistung","professionelle Verwaltung"],
    targetCustomerTypes: ["Hausverwaltungen","Immobilienverwaltungen","Bürogebäude","Arztpraxen","Zahnarztpraxen","Kitas","Schulen","Pflegeheime","Hotels","Autohäuser","Fitnessstudios"],
    negativeKeywords: ["privat","job","karriere","ausbildung","stellenangebot","minijob","kleinanzeigen","wohnung gesucht","mietgesuch"],
    badFitSignals: ["privat","job","karriere","kleinanzeige","einzelperson","mietgesuch","ausbildung"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Mietverwaltung"],
      "Arztpraxis": ["Arztpraxis","Ärztehaus","Zahnarztpraxis","Medizinisches Versorgungszentrum"],
      "Pflegeheim": ["Pflegeheim","Seniorenheim","Seniorenresidenz","Altenheim"],
      "Hotel": ["Hotel","Gasthof","Pension"],
      "Kindertagesstätte": ["Kindertagesstätte","Kita","Kindergarten"],
      "Schule": ["Schule","Gymnasium","Grundschule","Berufsschule"],
      "Bürogebäude": ["Bürogebäude","Gewerbepark","Business Center"],
    },
    scoringSignals: ["verwaltung","gewerbe","praxis","hotel","pflege","industrie","facility","büro","objekt","standort","wohnanlage","immobilien"],
    queryPriority: ["Hausverwaltung","Immobilienverwaltung","Pflegeheim","Arztpraxis","Hotel","Bürogebäude","Schule","Kindertagesstätte"],
  },
  sicherheitsdienst: {
    id: "sicherheitsdienst", label: "Sicherheitsdienst",
    searchableBusinessCategories: ["Bauunternehmen","Logistikzentrum","Industrieunternehmen","Veranstalter","Eventlocation","Hotel","Einkaufszentrum","Parkhaus","Messeveranstalter","Gewerbepark","Einzelhandel","Facility Management"],
    idealCustomerProfiles: ["hoher Sicherheitsbedarf","Publikumsverkehr","wertvolle Güter","Nachtbetrieb","Baustellenrisiko","große Flächen"],
    targetCustomerTypes: ["Baustellen","Bauunternehmen","Logistikzentren","Industriebetriebe","Veranstalter","Hotels"],
    negativeKeywords: ["job","stellenangebot","ausbildung","security job","privat","ehrenamt","karriere"],
    badFitSignals: ["job","karriere","privat","ehrenamt","ausbildung","bewerber"],
    searchKeywordVariants: {
      "Bauunternehmen": ["Bauunternehmen","Bauträger","Generalunternehmer"],
      "Eventlocation": ["Eventlocation","Veranstalter","Messeveranstalter","Kongresszentrum"],
      "Logistikzentrum": ["Industriebetrieb","Gewerbepark","Logistikzentrum","Produktionsbetrieb"],
      "Hotel": ["Hotel","Tagungshotel","Kongresshotel"],
    },
    scoringSignals: ["objektschutz","baustelle","logistik","industrie","veranstaltung","werkschutz","gewerbe","lager","messe"],
    queryPriority: ["Bauunternehmen","Logistikzentrum","Industrieunternehmen","Hotel","Eventlocation","Einkaufszentrum"],
  },
  it_service: {
    id: "it_service", label: "IT-Service",
    searchableBusinessCategories: ["Arztpraxis","Zahnarztpraxis","Steuerberater","Rechtsanwalt","Kanzlei","Pflegeheim","Schule","Handwerksbetrieb","Büro","Einzelhandel","Immobilienverwaltung","Logistikunternehmen","Unternehmensberatung","Ingenieurbüro"],
    idealCustomerProfiles: ["mehrere Arbeitsplätze","regelmäßiger IT-Bedarf","sensible Daten","Compliance-Anforderungen","Cloud-Nutzung"],
    targetCustomerTypes: ["Arztpraxen","Zahnarztpraxen","Steuerberater","Kanzleien","KMU","Schulen","Pflegeeinrichtungen","Handwerksbetriebe"],
    negativeKeywords: ["privat","gaming","job","karriere","ausbildung","computerhilfe privat","forum","blog"],
    badFitSignals: ["privat","gaming","job","forum","einzelperson","haushaltsgerät"],
    searchKeywordVariants: {
      "Arztpraxis": ["Arztpraxis","Zahnarztpraxis","Ärztehaus","Medizinisches Versorgungszentrum"],
      "Kanzlei": ["Rechtsanwalt","Kanzlei","Anwaltskanzlei","Steuerberater","Steuerberatung"],
      "Handwerksbetrieb": ["Handwerksbetrieb","Unternehmensberatung","Ingenieurbüro"],
      "Pflegeheim": ["Pflegeheim","Seniorenheim","Reha Zentrum"],
      "Schule": ["Schule","Gymnasium","Bildungszentrum"],
    },
    scoringSignals: ["praxis","kanzlei","steuer","pflege","schule","verwaltung","daten","büro","handwerk","logistik"],
    queryPriority: ["Arztpraxis","Zahnarztpraxis","Steuerberater","Rechtsanwalt","Kanzlei","Handwerksbetrieb","Pflegeheim","Schule"],
  },
  gartenbau: {
    id: "gartenbau", label: "Gartenbau",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","Wohnanlage","Hotel","Gewerbepark","Pflegeheim","Kindertagesstätte","Schule","Facility Management","Bürogebäude","Industrieunternehmen","Friedhof"],
    idealCustomerProfiles: ["regelmäßige Außenpflege","größere Grünflächen","Wohnanlagenbestand","laufende Objektpflege","Winterdienstbedarf"],
    targetCustomerTypes: ["Hausverwaltungen","Immobilienverwaltungen","Wohnanlagen","Hotels","Gewerbeparks","Pflegeheime","Kitas","Schulen"],
    negativeKeywords: ["privatgarten","privat","job","karriere","kleinanzeigen","gratis","selber machen"],
    badFitSignals: ["privat","kleinanzeige","job","einzelgarten","hobby","selbst"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Immobilienverwaltung","Wohnanlage","WEG Verwaltung"],
      "Pflegeheim": ["Pflegeheim","Kita","Schule","Altenheim"],
      "Hotel": ["Hotel","Tagungshotel","Gasthof"],
      "Bürogebäude": ["Gewerbepark","Bürogebäude","Industriebetrieb"],
    },
    scoringSignals: ["anlage","grünfläche","verwaltung","wohnanlage","gewerbe","hotel","pflege","objekt"],
    queryPriority: ["Hausverwaltung","Immobilienverwaltung","Hotel","Pflegeheim","Gewerbepark","Schule","Kindertagesstätte"],
  },
  catering: {
    id: "catering", label: "Catering",
    searchableBusinessCategories: ["Eventlocation","Tagungshotel","Seminarzentrum","Messeveranstalter","Kongresszentrum","Bürogebäude","Kindertagesstätte","Schule","Pflegeheim","Hotel","Coworking Space","Veranstalter","Unternehmensberatung"],
    idealCustomerProfiles: ["regelmäßige Veranstaltungen","viele Mitarbeitende","Tagungsbetrieb","Verpflegungspflicht","wiederkehrende Events"],
    targetCustomerTypes: ["Eventlocations","Tagungshotels","Seminarzentren","Messeveranstalter","Kitas","Schulen","Pflegeheime","Hotels"],
    negativeKeywords: ["privat","hochzeit","geburtstag","familienfeier","job","karriere","kleinanzeigen","selbst kochen"],
    badFitSignals: ["privat","hochzeit","geburtstag","kleinanzeige","familienfeier","selbst"],
    searchKeywordVariants: {
      "Eventlocation": ["Eventlocation","Veranstalter","Messeveranstalter","Kongresszentrum","Eventhalle"],
      "Tagungshotel": ["Tagungshotel","Kongresshotel","Hotel"],
      "Kindertagesstätte": ["Kindertagesstätte","Schule","Seminarzentrum","Bildungszentrum"],
      "Bürogebäude": ["Bürogebäude","Unternehmensberatung","Coworking Space"],
    },
    scoringSignals: ["event","tagung","messe","seminar","unternehmen","büro","kita","schule","hotel","kongress"],
    queryPriority: ["Eventlocation","Tagungshotel","Kongresszentrum","Seminarzentrum","Bürogebäude","Kindertagesstätte","Schule"],
  },
  handwerk: {
    id: "handwerk", label: "Handwerk",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","Bauunternehmen","Facility Management","Hotel","Arztpraxis","Bürogebäude","Einzelhandel","Wohnungsbaugesellschaft","Gewerbeimmobilienverwaltung"],
    idealCustomerProfiles: ["regelmäßiger Instandhaltungsbedarf","mehrere Objekte","laufende Reparaturen","Objektbestand"],
    targetCustomerTypes: ["Hausverwaltungen","Immobilienverwaltungen","Bauunternehmen","Hotels","Bürogebäude"],
    negativeKeywords: ["privat","selber machen","diy","job","ausbildung","karriere","kleinanzeigen"],
    badFitSignals: ["privat","diy","job","kleinanzeige","selbst"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft","WEG Verwaltung"],
      "Bürogebäude": ["Bürogebäude","Einzelhandel","Hotel","Gewerbepark"],
      "Bauunternehmen": ["Bauunternehmen","Facility Management","Generalunternehmer"],
    },
    scoringSignals: ["verwaltung","objekt","instandhaltung","gewerbe","hotel","bau","facility","wohnanlage"],
    queryPriority: ["Hausverwaltung","Immobilienverwaltung","Bauunternehmen","Hotel","Bürogebäude","Einzelhandel"],
  },
  spedition_logistik: {
    id: "spedition_logistik", label: "Spedition / Logistik",
    searchableBusinessCategories: ["Großhandel","Produktionsbetrieb","Industrieunternehmen","Möbelhaus","Baustoffhandel","Maschinenbau","Lebensmittelgroßhandel","Eventagentur","Einzelhandel","Versandhandel","Handelsunternehmen","Küchenstudio"],
    idealCustomerProfiles: ["regelmäßiger Versand","wiederkehrende Transporte","zeitkritische Lieferungen","hohes Sendungsvolumen"],
    targetCustomerTypes: ["Online-Shops","Großhändler","Produktionsbetriebe","Industriebetriebe","Möbelhäuser"],
    negativeKeywords: ["privat","umzug privat","job","fahrer gesucht","karriere","kleinanzeigen"],
    badFitSignals: ["privat","job","kleinanzeige","einzeltransport","möbel privat"],
    searchKeywordVariants: {
      "Großhandel": ["Großhandel","Lebensmittelgroßhandel","Handelsunternehmen"],
      "Produktionsbetrieb": ["Produktionsbetrieb","Industrieunternehmen","Maschinenbau"],
      "Möbelhaus": ["Möbelhaus","Baustoffhandel","Küchenstudio"],
      "Eventagentur": ["Eventagentur","Messeveranstalter","Veranstaltungstechnik"],
    },
    scoringSignals: ["versand","logistik","lager","großhandel","produktion","lieferung","handel"],
    queryPriority: ["Großhandel","Produktionsbetrieb","Industrieunternehmen","Möbelhaus","Maschinenbau","Baustoffhandel"],
  },
  gesundheit_medizin: {
    id: "gesundheit_medizin", label: "Gesundheit / Medizin",
    searchableBusinessCategories: ["Arztpraxis","Zahnarztpraxis","Therapiezentrum","Pflegeheim","Seniorenheim","Apotheke","Reha Zentrum","Privatklinik","Gesundheitszentrum","Physiotherapie","Ergotherapie","Ärztehaus"],
    idealCustomerProfiles: ["professioneller Gesundheitsbetrieb","regelmäßiger Bedarf","Patientenverkehr","mehrere Behandlungsräume"],
    targetCustomerTypes: ["Arztpraxen","Zahnarztpraxen","Therapiezentren","Pflegeheime","Apotheken","Reha-Zentren"],
    negativeKeywords: ["privat","forum","job","karriere","ausbildung","selbsthilfe","blog"],
    badFitSignals: ["forum","privat","job","erfahrung","selbsthilfe","blog"],
    searchKeywordVariants: {
      "Arztpraxis": ["Arztpraxis","Zahnarztpraxis","Ärztehaus","Medizinisches Versorgungszentrum"],
      "Therapiezentrum": ["Physiotherapie","Ergotherapie","Therapiezentrum","Logopädie"],
      "Pflegeheim": ["Pflegeheim","Seniorenheim","Reha Zentrum","Klinik"],
    },
    scoringSignals: ["praxis","gesundheit","pflege","therapie","reha","klinik","zentrum","apotheke"],
    queryPriority: ["Arztpraxis","Zahnarztpraxis","Pflegeheim","Physiotherapie","Therapiezentrum","Ärztehaus"],
  },
  immobilien: {
    id: "immobilien", label: "Immobilien",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Bauträger","Projektentwickler","Wohnungsbaugesellschaft","Immobiliengesellschaft","Gewerbeimmobilienverwaltung","Property Management","Mietverwaltung","Facility Management Immobilien"],
    idealCustomerProfiles: ["Eigentümer","Investoren","Gewerbeimmobilienbesitzer","Erbengemeinschaften","Unternehmen mit Standortsuche","Bestandshalter","Objektbestand"],
    targetCustomerTypes: ["Hausverwaltungen","Immobilienverwaltungen","WEG-Verwaltungen","Bauträger","Projektentwickler","Wohnungsbaugesellschaften"],
    negativeKeywords: ["privat","wohnung gesucht","mietgesuch","ferienwohnung","airbnb","job","karriere","vermiete privat","suche wohnung"],
    badFitSignals: ["privat","mietgesuch","wohnung gesucht","ferienwohnung","job","airbnb"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","WEG Verwaltung","Immobilienverwaltung","Mietverwaltung","Objektverwaltung"],
      "Bauträger": ["Bauträger","Wohnbaugesellschaft","Projektentwickler Immobilien"],
      "Property Management": ["Property Management","Gewerbeimmobilienverwaltung","Facility Management Immobilien"],
      "Immobiliengesellschaft": ["Immobiliengesellschaft","Wohnungsbaugesellschaft"],
    },
    scoringSignals: ["verwaltung","weg","gewerbeimmobilien","bestand","objektverwaltung","property management","projektentwicklung","bautraeger","wohnanlage"],
    queryPriority: ["Hausverwaltung","Property Management","Bauträger","Immobilienverwaltung","WEG Verwaltung","Wohnungsbaugesellschaft"],
  },
  lager_fulfillment: {
    id: "lager_fulfillment", label: "Lager / Fulfillment",
    searchableBusinessCategories: ["Versandhandel","Großhandel","Kosmetikmarke","Lebensmittelhersteller","Textilhandel","Ersatzteilhandel","Importeur","Handelsunternehmen","Modehändler","Online Händler"],
    idealCustomerProfiles: ["regelmäßiger Versand","wachsender Onlinehandel","Retourenbedarf","mehrere SKUs","Lagerbedarf"],
    targetCustomerTypes: ["Online-Shops","Großhändler","E-Commerce-Unternehmen","Kosmetikmarken","Textilhändler"],
    negativeKeywords: ["privat","kleinanzeigen","job","karriere","ebay privat","zu verschenken"],
    badFitSignals: ["privat","kleinanzeige","job","zu verschenken"],
    searchKeywordVariants: {
      "Versandhandel": ["Versandhandel","Online Händler","Handelsunternehmen"],
      "Großhandel": ["Großhandel","Importeur","Textilhandel","Modehändler"],
      "Lebensmittelhersteller": ["Kosmetikmarke","Lebensmittelhersteller","Ersatzteilhandel"],
    },
    scoringSignals: ["shop","versand","handel","import","retouren","lager","ecommerce","online"],
    queryPriority: ["Großhandel","Versandhandel","Importeur","Handelsunternehmen","Textilhandel"],
  },
  facility_service: {
    id: "facility_service", label: "Facility Service",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","Gewerbeimmobilie","Bürogebäude","Hotel","Pflegeheim","Industrieunternehmen","Schule","Kindertagesstätte","Wohnanlage","Gewerbepark"],
    idealCustomerProfiles: ["mehrere Objekte","laufender Objektbedarf","technische Betreuung","Außenanlagen","wiederkehrende Dienstleistung"],
    targetCustomerTypes: ["Hausverwaltungen","Gewerbeimmobilien","Bürogebäude","Hotels","Pflegeheime","Industriebetriebe"],
    negativeKeywords: ["privat","job","karriere","ausbildung","kleinanzeigen"],
    badFitSignals: ["privat","job","kleinanzeige","einzelperson"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Immobilienverwaltung","Wohnanlage","WEG Verwaltung"],
      "Bürogebäude": ["Bürogebäude","Gewerbeimmobilie","Industrieunternehmen","Gewerbepark"],
      "Pflegeheim": ["Pflegeheim","Schule","Kita","Altenheim"],
    },
    scoringSignals: ["objekt","verwaltung","gewerbe","facility","wohnanlage","technisch","gebäude"],
    queryPriority: ["Hausverwaltung","Immobilienverwaltung","Bürogebäude","Hotel","Pflegeheim","Gewerbepark"],
  },
  entruempelung: {
    id: "entruempelung", label: "Entrümpelung",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","Nachlassverwaltung","Betreuungsbüro","Wohnungsbaugesellschaft","Pflegeheim","Seniorenheim","Rechtsanwalt Erbrecht","Sozialdienst"],
    idealCustomerProfiles: ["regelmäßige Wohnungswechsel","Nachlassfälle","Mietnomadenfälle","Objektbestand","Erbfälle"],
    targetCustomerTypes: ["Hausverwaltungen","Nachlassverwalter","Betreuungsbüros","Sozialdienste","Pflegeheime"],
    negativeKeywords: ["privat","sperrmüll kostenlos","kleinanzeigen","job","karriere","zu verschenken"],
    badFitSignals: ["privat","kleinanzeige","zu verschenken","job","sperrmüll kostenlos"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft"],
      "Nachlassverwaltung": ["Nachlassverwaltung","Rechtsanwalt Erbrecht","Betreuungsbüro","Nachlassverwalter"],
      "Sozialdienst": ["Sozialdienst","Pflegeheim","Sozialstation","Seniorenheim"],
    },
    scoringSignals: ["verwaltung","nachlass","betreuung","erbrecht","wohnung","pflege","sozialdienst"],
    queryPriority: ["Hausverwaltung","Immobilienverwaltung","Nachlassverwaltung","Sozialdienst","Pflegeheim","Betreuungsbüro"],
  },
  maler_renovierung: {
    id: "maler_renovierung", label: "Maler / Renovierung",
    searchableBusinessCategories: ["Hausverwaltung","Immobilienverwaltung","Hotel","Bürogebäude","Arztpraxis","Einzelhandel","Wohnungsbaugesellschaft","Bauunternehmen","Facility Management","Gewerbeimmobilienverwaltung"],
    idealCustomerProfiles: ["regelmäßiger Renovierungsbedarf","Mieterwechsel","Objektbestand","Gewerbeflächen"],
    targetCustomerTypes: ["Hausverwaltungen","Immobilienverwaltungen","Hotels","Bürogebäude","Wohnungsbaugesellschaften"],
    negativeKeywords: ["privat","selber streichen","diy","job","ausbildung","kleinanzeigen"],
    badFitSignals: ["privat","diy","job","kleinanzeige","selbst streichen"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft"],
      "Hotel": ["Hotel","Bürogebäude","Einzelhandel","Gewerbepark"],
      "Bauunternehmen": ["Bauunternehmen","Facility Management","Generalunternehmer"],
    },
    scoringSignals: ["verwaltung","mieterwechsel","objekt","hotel","gewerbe","bau","renovierung","wohnanlage"],
    queryPriority: ["Hausverwaltung","Immobilienverwaltung","Hotel","Bauunternehmen","Bürogebäude","Einzelhandel"],
  },
  elektro_gebaeudetechnik: {
    id: "elektro_gebaeudetechnik", label: "Elektro / Gebäudetechnik",
    searchableBusinessCategories: ["Hausverwaltung","Gewerbeimmobilie","Industrieunternehmen","Hotel","Bürogebäude","Bauunternehmen","Facility Management","Einzelhandel","Wohnungsbaugesellschaft","Arztpraxis"],
    idealCustomerProfiles: ["technischer Wartungsbedarf","mehrere Objekte","Gewerbeflächen","regelmäßige Prüfungen"],
    targetCustomerTypes: ["Hausverwaltungen","Gewerbeobjekte","Industriebetriebe","Hotels","Bürogebäude"],
    negativeKeywords: ["privat","diy","job","karriere","ausbildung","forum"],
    badFitSignals: ["privat","diy","job","forum","hobby"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Wohnungsbaugesellschaft","Gewerbeimmobilie"],
      "Bürogebäude": ["Bürogebäude","Hotel","Einzelhandel","Gewerbepark"],
      "Industrieunternehmen": ["Industrieunternehmen","Bauunternehmen","Facility Management"],
    },
    scoringSignals: ["technik","gebäude","wartung","gewerbe","industrie","verwaltung","objekt","anlage"],
    queryPriority: ["Hausverwaltung","Industrieunternehmen","Hotel","Bürogebäude","Bauunternehmen","Facility Management"],
  },
  shk: {
    id: "shk", label: "SHK / Sanitär / Heizung / Klima",
    searchableBusinessCategories: ["Hausverwaltung","Hotel","Pflegeheim","Gewerbeimmobilie","Bürogebäude","Wohnungsbaugesellschaft","Facility Management","Industrieunternehmen","Arztpraxis","Gastronomie"],
    idealCustomerProfiles: ["regelmäßiger Wartungsbedarf","viele sanitäre Anlagen","Gewerbeflächen","Notdienstbedarf"],
    targetCustomerTypes: ["Hausverwaltungen","Hotels","Pflegeheime","Gewerbeobjekte","Bürogebäude"],
    negativeKeywords: ["privat","diy","job","ausbildung","forum","selber machen"],
    badFitSignals: ["privat","diy","job","forum","selbst"],
    searchKeywordVariants: {
      "Hausverwaltung": ["Hausverwaltung","Wohnungsbaugesellschaft","Gewerbeimmobilie"],
      "Hotel": ["Hotel","Bürogebäude","Gastronomie","Gewerbepark"],
      "Pflegeheim": ["Pflegeheim","Seniorenheim","Facility Management"],
    },
    scoringSignals: ["wartung","heizung","sanitaer","gewerbe","hotel","pflege","verwaltung","objekt"],
    queryPriority: ["Hausverwaltung","Hotel","Pflegeheim","Bürogebäude","Industrieunternehmen","Gastronomie"],
  },
  eventservice: {
    id: "eventservice", label: "Eventservice",
    searchableBusinessCategories: ["Eventlocation","Messeveranstalter","Hotel","Marketingagentur","Kongresszentrum","Seminarzentrum","Veranstalter","Messezentrum","Eventhalle","Tagungszentrum"],
    idealCustomerProfiles: ["regelmäßige Events","hohes Besucheraufkommen","Messebetrieb","Tagungen"],
    targetCustomerTypes: ["Eventlocations","Messeveranstalter","Hotels","Kongresszentren","Seminarzentren"],
    negativeKeywords: ["privat","geburtstag","hochzeit","kleinanzeigen","job","familienfeier"],
    badFitSignals: ["privat","geburtstag","hochzeit","job","familienfeier"],
    searchKeywordVariants: {
      "Eventlocation": ["Eventlocation","Veranstalter","Kongresszentrum","Eventhalle"],
      "Messeveranstalter": ["Messeveranstalter","Messezentrum","Messebau"],
      "Hotel": ["Tagungshotel","Marketingagentur","Seminarzentrum"],
    },
    scoringSignals: ["event","messe","kongress","veranstaltung","hotel","agentur","b2b","tagung"],
    queryPriority: ["Eventlocation","Kongresszentrum","Messeveranstalter","Hotel","Seminarzentrum","Marketingagentur"],
  },
  marketing_webdesign_werbung: {
    id: "marketing_webdesign_werbung", label: "Marketing / Webdesign / Werbung",
    searchableBusinessCategories: ["Handwerksbetrieb","Arztpraxis","Steuerberater","Rechtsanwalt","Restaurant","Hotel","Immobilienmakler","Fitnessstudio","Einzelhandel","Unternehmensberatung","Zahnarztpraxis","Autohaus","Bauunternehmen"],
    idealCustomerProfiles: ["lokal sichtbarkeitsabhängig","schwache Website","Leadbedarf","Wachstumsziel"],
    targetCustomerTypes: ["Handwerksbetriebe","Arztpraxen","Steuerberater","Restaurants","Hotels","Fitnessstudios"],
    negativeKeywords: ["privat","hobby","gratis","job","karriere","ehrenamt"],
    badFitSignals: ["privat","hobby","gratis","job","ehrenamt"],
    searchKeywordVariants: {
      "Handwerksbetrieb": ["Handwerksbetrieb","Arztpraxis","Restaurant","Fitnessstudio"],
      "Steuerberater": ["Steuerberater","Rechtsanwalt","Unternehmensberatung"],
      "Einzelhandel": ["Einzelhandel","Autohaus","Hotel"],
    },
    scoringSignals: ["lokal","dienstleister","praxis","kanzlei","hotel","shop","restaurant","handwerk"],
    queryPriority: ["Handwerksbetrieb","Arztpraxis","Restaurant","Steuerberater","Hotel","Fitnessstudio","Einzelhandel"],
  },
  personal_zeitarbeit: {
    id: "personal_zeitarbeit", label: "Personal / Zeitarbeit",
    searchableBusinessCategories: ["Logistikunternehmen","Industrieunternehmen","Produktionsbetrieb","Pflegeheim","Hotel","Gastronomie","Bauunternehmen","Lagerbetrieb","Reinigungsunternehmen","Einzelhandel","Callcenter"],
    idealCustomerProfiles: ["hoher Personalbedarf","Schichtbetrieb","saisonaler Bedarf","wachsendes Unternehmen"],
    targetCustomerTypes: ["Logistikunternehmen","Industriebetriebe","Produktionsbetriebe","Pflegeheime","Hotels"],
    negativeKeywords: ["bewerbung","jobs","stellenangebot","karriere","ausbildung","praktikum"],
    badFitSignals: ["bewerbung","job","karriere","praktikum","stellengesuch"],
    searchKeywordVariants: {
      "Logistikunternehmen": ["Logistikunternehmen","Lagerbetrieb","Spedition"],
      "Industrieunternehmen": ["Industrieunternehmen","Produktionsbetrieb","Maschinenbau"],
      "Pflegeheim": ["Pflegeheim","Seniorenheim","Klinik","Pflegedienst"],
      "Gastronomie": ["Hotel","Gastronomie","Restaurant"],
    },
    scoringSignals: ["produktion","logistik","pflege","hotel","schicht","lager","personalbedarf","industrie"],
    queryPriority: ["Logistikunternehmen","Industrieunternehmen","Pflegeheim","Produktionsbetrieb","Hotel","Gastronomie"],
  },
  buchhaltung_steuernahe_dienste: {
    id: "buchhaltung_steuernahe_dienste", label: "Buchhaltung / steuernahe Dienste",
    searchableBusinessCategories: ["Handwerksbetrieb","Restaurant","Einzelhandel","Pflegedienst","Immobilienverwaltung","Agentur","Dienstleister","Gastronomie","Unternehmensberatung","Bauunternehmen"],
    idealCustomerProfiles: ["laufende Belege","mehrere Rechnungen monatlich","Lohnabrechnung","Wachstum"],
    targetCustomerTypes: ["Kleinunternehmen","Handwerksbetriebe","Gastronomie","Einzelhandel","Startups"],
    negativeKeywords: ["privat","job","karriere","ausbildung","kostenlos","forum"],
    badFitSignals: ["privat","forum","job","kostenlos","selbst"],
    searchKeywordVariants: {
      "Handwerksbetrieb": ["Handwerksbetrieb","Restaurant","Einzelhandel","Gastronomie"],
      "Pflegedienst": ["Agentur","Pflegedienst","Immobilienverwaltung"],
      "Unternehmensberatung": ["Unternehmensberatung","Dienstleister","Bauunternehmen"],
    },
    scoringSignals: ["unternehmen","handel","handwerk","agentur","shop","dienstleister","pflege","büro"],
    queryPriority: ["Handwerksbetrieb","Restaurant","Einzelhandel","Pflegedienst","Agentur","Immobilienverwaltung"],
  },
  industrieservice: {
    id: "industrieservice", label: "Industrieservice",
    searchableBusinessCategories: ["Produktionsbetrieb","Maschinenbau","Metallbau","Logistikzentrum","Chemiebetrieb","Lebensmittelhersteller","Industriepark","Automobilzulieferer","Kunststoffverarbeitung","Industrieunternehmen"],
    idealCustomerProfiles: ["laufende Produktion","technische Anlagen","Schichtbetrieb","Wartungsbedarf"],
    targetCustomerTypes: ["Produktionsbetriebe","Maschinenbauunternehmen","Logistikzentren","Chemiebetriebe"],
    negativeKeywords: ["privat","job","karriere","ausbildung","hobbywerkstatt"],
    badFitSignals: ["privat","hobby","job","klein","werkstatt privat"],
    searchKeywordVariants: {
      "Produktionsbetrieb": ["Produktionsbetrieb","Industrieunternehmen","Lebensmittelhersteller"],
      "Maschinenbau": ["Maschinenbau","Metallbau","Kunststoffverarbeitung","Automobilzulieferer"],
      "Industriepark": ["Industriepark","Logistikzentrum","Chemiebetrieb"],
    },
    scoringSignals: ["produktion","industrie","maschine","anlage","werk","halle","wartung","technik"],
    queryPriority: ["Produktionsbetrieb","Industrieunternehmen","Maschinenbau","Logistikzentrum","Metallbau","Lebensmittelhersteller"],
  },
  fuhrparkservice_fahrzeugpflege: {
    id: "fuhrparkservice_fahrzeugpflege", label: "Fuhrparkservice / Fahrzeugpflege",
    searchableBusinessCategories: ["Autohaus","Taxiunternehmen","Pflegedienst","Handwerksbetrieb","Logistikunternehmen","Spedition","Mietwagenfirma","Fahrschule","Lieferdienst","Kommunaler Betrieb","Fuhrparkbetrieb"],
    idealCustomerProfiles: ["mehrere Fahrzeuge","regelmäßige Reinigung","Außendienst","Flotte"],
    targetCustomerTypes: ["Autohäuser","Taxiunternehmen","Pflegedienste","Logistikunternehmen","Speditionen"],
    negativeKeywords: ["privat","gebrauchtwagen privat","job","kleinanzeigen","selber reinigen"],
    badFitSignals: ["privat","kleinanzeige","job","einzelfahrzeug","gebrauchtwagen privat"],
    searchKeywordVariants: {
      "Taxiunternehmen": ["Taxiunternehmen","Pflegedienst","Lieferdienst","Mietwagenfirma"],
      "Autohaus": ["Autohaus","Fahrschule","Fuhrparkbetrieb"],
      "Logistikunternehmen": ["Handwerksbetrieb","Logistikunternehmen","Spedition"],
    },
    scoringSignals: ["flotte","fahrzeuge","lieferung","taxi","pflege","autohaus","logistik","fuhrpark"],
    queryPriority: ["Autohaus","Taxiunternehmen","Logistikunternehmen","Handwerksbetrieb","Pflegedienst","Mietwagenfirma"],
  },
  pflege_betreuung: {
    id: "pflege_betreuung", label: "Pflege / Betreuung",
    searchableBusinessCategories: ["Pflegeheim","Seniorenresidenz","Betreutes Wohnen","Klinik","Reha Zentrum","Sozialdienst","Betreuungsverein","Ärztehaus","Pflegedienst","Sozialstation"],
    idealCustomerProfiles: ["regelmäßiger Betreuungsbedarf","Senioren-Zielgruppe","soziale Versorgung"],
    targetCustomerTypes: ["Pflegeheime","Seniorenresidenzen","Betreutes Wohnen","Kliniken","Sozialdienste"],
    negativeKeywords: ["job","karriere","ausbildung","forum","privat","erfahrung"],
    badFitSignals: ["job","forum","privat","erfahrung","selbsthilfe"],
    searchKeywordVariants: {
      "Pflegeheim": ["Pflegeheim","Seniorenresidenz","Betreutes Wohnen","Altenheim"],
      "Klinik": ["Klinik","Reha Zentrum","Ärztehaus","Pflegedienst"],
      "Sozialdienst": ["Sozialdienst","Betreuungsverein","Sozialstation"],
    },
    scoringSignals: ["pflege","senioren","betreuung","sozial","reha","klinik","wohnen","station"],
    queryPriority: ["Pflegeheim","Seniorenresidenz","Klinik","Reha Zentrum","Sozialdienst","Pflegedienst"],
  },
  schulungen_weiterbildung: {
    id: "schulungen_weiterbildung", label: "Schulungen / Weiterbildung",
    searchableBusinessCategories: ["Industrieunternehmen","Pflegeheim","Hotel","Logistikunternehmen","Handwerksbetrieb","Bildungsträger","Schule","Einzelhandel","Callcenter","Unternehmensberatung","Produktionsbetrieb"],
    idealCustomerProfiles: ["mehrere Mitarbeitende","Schulungspflicht","Compliance","wiederkehrender Schulungsbedarf"],
    targetCustomerTypes: ["Unternehmen","Industriebetriebe","Pflegeheime","Hotels","Logistikunternehmen"],
    negativeKeywords: ["privat","nachhilfe","hobby","job","karriere","kostenlos"],
    badFitSignals: ["privat","nachhilfe","hobby","job","kostenlos"],
    searchKeywordVariants: {
      "Industrieunternehmen": ["Industrieunternehmen","Logistikunternehmen","Produktionsbetrieb"],
      "Pflegeheim": ["Pflegeheim","Hotel","Einzelhandel","Callcenter"],
      "Bildungsträger": ["Bildungsträger","Schule","Handwerksbetrieb"],
    },
    scoringSignals: ["mitarbeiter","schulung","industrie","pflege","logistik","compliance","unternehmen"],
    queryPriority: ["Industrieunternehmen","Pflegeheim","Hotel","Logistikunternehmen","Handwerksbetrieb","Bildungsträger"],
  },
};

const LEGACY_INDUSTRY_MAP = {
  "Gebäudereinigung":"gebaeudereinigung","Gartenbau / Gartenpflege":"gartenbau","Gartenbau":"gartenbau",
  "Hausmeisterdienst / Facility Service":"facility_service","Facility Service":"facility_service","Hausmeisterdienst":"facility_service",
  "Entrümpelung / Entsorgung":"entruempelung","Entrümpelung":"entruempelung",
  "Buchhaltung / Büroservice":"buchhaltung_steuernahe_dienste","Buchhaltung":"buchhaltung_steuernahe_dienste",
  "Maschinenwartung / Industrieservice":"industrieservice","Industrieservice":"industrieservice",
  "Sicherheitsdienst":"sicherheitsdienst","IT-Service":"it_service","Catering":"catering","Handwerk":"handwerk",
  "Spedition / Logistik":"spedition_logistik","Spedition":"spedition_logistik","Logistik":"spedition_logistik",
  "Gesundheit / Medizin":"gesundheit_medizin","Gesundheit":"gesundheit_medizin","Medizin":"gesundheit_medizin",
  "Immobilien":"immobilien","Lager / Fulfillment":"lager_fulfillment","Fulfillment":"lager_fulfillment",
  "Maler / Renovierung":"maler_renovierung","Maler":"maler_renovierung","Renovierung":"maler_renovierung",
  "Elektro / Gebäudetechnik":"elektro_gebaeudetechnik","Elektro":"elektro_gebaeudetechnik",
  "SHK / Sanitär / Heizung / Klima":"shk","SHK":"shk","Sanitär":"shk","Heizung":"shk",
  "Eventservice":"eventservice","Marketing / Webdesign / Werbung":"marketing_webdesign_werbung",
  "Marketing":"marketing_webdesign_werbung","Webdesign":"marketing_webdesign_werbung",
  "Personal / Zeitarbeit":"personal_zeitarbeit","Zeitarbeit":"personal_zeitarbeit",
  "Fuhrparkservice / Fahrzeugpflege":"fuhrparkservice_fahrzeugpflege","Fuhrparkservice":"fuhrparkservice_fahrzeugpflege",
  "Pflege / Betreuung":"pflege_betreuung","Pflege":"pflege_betreuung",
  "Schulungen / Weiterbildung":"schulungen_weiterbildung","Schulungen":"schulungen_weiterbildung",
};

// ============================================================
// INLINE: LEAD SEARCH ENGINE
// (Quelle der Wahrheit: utils/leadSearchEngine.js)
// ============================================================

function normStr(str) {
  return String(str || "").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

function normalizeIndustryId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (LEAD_SEARCH_TAXONOMY[str]) return str;
  if (LEGACY_INDUSTRY_MAP[str]) return LEGACY_INDUSTRY_MAP[str];
  const lower = str.toLowerCase();
  const match = Object.keys(LEAD_SEARCH_TAXONOMY).find(k => k.toLowerCase() === lower);
  return match || str;
}

function getQueryBudget(trialStage, remainingLeadBudget) {
  if (trialStage === 'free_preview') {
    if (!remainingLeadBudget || remainingLeadBudget <= 0) {
      return { blocked: true, reason: 'preview_limit_reached', maxLeadsToSave: 0, maxSearchQueries: 0, maxPlaceDetails: 0, stopWhenEnoughLeadsFound: true };
    }
    return { blocked: false, maxLeadsToSave: Math.min(remainingLeadBudget, 10), maxSearchQueries: 8, maxPlaceDetails: 20, stopWhenEnoughLeadsFound: true };
  }
  if (trialStage === 'verified_trial') {
    return { blocked: false, maxLeadsToSave: 75, maxSearchQueries: 35, maxPlaceDetails: 90, stopWhenEnoughLeadsFound: true };
  }
  // paid / agency
  return { blocked: false, maxLeadsToSave: null, maxSearchQueries: 60, maxPlaceDetails: 120, stopWhenEnoughLeadsFound: true };
}

function getCityLimit(trialStage, radiusKm) {
  if (trialStage === 'free_preview') return 1;
  if (radiusKm <= 10) return 1;
  if (radiusKm <= 25) return 3;
  if (radiusKm <= 60) return 5;
  return 7;
}

function buildSearchPlan({ industry, targetCustomerTypes = [], excludedCustomerTypes = [], location, radiusKm = 25, trialStage = 'free_preview', remainingLeadBudget = 3, additionalCities = [], searchPoints = [], learnedPriorityCategories = [], learnedWinningSignals = [] }) {
  const industryId = normalizeIndustryId(industry);
  const profile = LEAD_SEARCH_TAXONOMY[industryId] || null;

  if (!profile) return { error: `Unbekannte Branche: ${industry}`, blocked: true, industryProfile: null, searchQueries: [], queryBudget: { blocked: true, reason: 'unknown_industry' } };

  const queryBudget = getQueryBudget(trialStage, remainingLeadBudget);
  if (queryBudget.blocked) return { industryProfile: profile, queryBudget, searchCities: [], searchQueries: [], blocked: true, debug: { ignoredIdealProfiles: profile.idealCustomerProfiles || [] } };

  const cityLimit = getCityLimit(trialStage, radiusKm);
  const searchCities = [location, ...additionalCities.slice(0, cityLimit - 1)].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i);

  // NUR searchableBusinessCategories, gefiltert durch excludedCustomerTypes
  const usedCategories = (profile.searchableBusinessCategories || []).filter(c => !excludedCustomerTypes.includes(c));
  const ignoredIdealProfiles = profile.idealCustomerProfiles || [];

  // DIVERSITY LIMIT: Begrenze Varianten pro Kategorie nach Trial-Stufe
  const maxVariantsPerCategory = 
    trialStage === 'free_preview' ? 2 :
    trialStage === 'verified_trial' ? 3 : 999;

  // Queries generieren — Gelernte Prioritäten ZUERST
  const queries = [];
  const seen = new Set();
  const maxQ = queryBudget.maxSearchQueries;
  
  // Gelernte Prioritäten VOR statischen queryPriority setzen
  const learnedFirst = learnedPriorityCategories
    .filter(c => usedCategories.includes(c));
  const staticPriority = (profile.queryPriority || [])
    .filter(c => usedCategories.includes(c) && !learnedFirst.includes(c));
  const rest = usedCategories
    .filter(c => !learnedFirst.includes(c) && !staticPriority.includes(c));

  const ordered = [...learnedFirst, ...staticPriority, ...rest];

  for (const cat of ordered) {
    if (queries.length >= maxQ) break;
    const variants = (profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat])
      .slice(0, maxVariantsPerCategory);
    for (const variant of variants) {
      if (queries.length >= maxQ) break;
      const q = variant;
      if (!seen.has(q)) {
        seen.add(q);
        queries.push({ query: q, category: cat, variant });
      }
    }
  }

  return {
    industryProfile: profile,
    searchCities,
    searchQueries: queries,
    searchPoints,
    queryBudget,
    debug: {
      usedSearchableCategories: usedCategories,
      ignoredIdealProfiles,
      idealProfilesNotUsedAsRawQueries: true,
      searchableBusinessCategoriesUsed: true,
    }
  };
}

function isBadFit(candidate, profile) {
  const text = normStr([candidate.name, (candidate.types || []).join(' '), candidate.vicinity || '', candidate.editorial_summary?.overview || ''].join(' '));
  const jobSignals = ['job', 'karriere', 'ausbildung', 'stellenangebot', 'bewerber', 'bewerbung', 'praktikum'];
  for (const s of jobSignals) if (text.includes(normStr(s))) return { isBadFit: true, reason: `Job-Signal: "${s}"`, signalType: 'job' };
  const privatSignals = ['privat', 'kleinanzeigen', 'mietgesuch', 'wohnung gesucht', 'zu verschenken', 'airbnb'];
  for (const s of privatSignals) if (text.includes(normStr(s))) return { isBadFit: true, reason: `Privat-Signal: "${s}"`, signalType: 'private' };
  for (const kw of (profile.negativeKeywords || [])) if (text.includes(normStr(kw))) return { isBadFit: true, reason: `NegKeyword: "${kw}"`, signalType: 'negativeKeyword' };
  for (const s of (profile.badFitSignals || [])) if (text.includes(normStr(s))) return { isBadFit: true, reason: `BadFit: "${s}"`, signalType: 'badFitSignal' };
  return { isBadFit: false, reason: null };
}

function scoreLeadCandidate({ candidate, profile, distanceKm = null, radiusKm = 25, matchedSearchCategory = null, learnedWinningSignals = [] }) {
  const text = normStr([candidate.name, (candidate.types || []).join(' '), candidate.vicinity || '', candidate.editorial_summary?.overview || '', candidate.formatted_address || ''].join(' '));
  const badFitResult = isBadFit(candidate, profile);

  let score = 50;
  const reasons = [];
  let matched_search_category = matchedSearchCategory || null;
  let matched_target_customer_type = null;
  let matched_service_context = null;

  // +20: Kategorie
  if (!matched_search_category) {
    for (const cat of (profile.searchableBusinessCategories || [])) {
      const variants = profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat];
      for (const v of variants) { if (text.includes(normStr(v))) { matched_search_category = cat; break; } }
      if (matched_search_category) break;
    }
  }
  if (matched_search_category) { score += 20; reasons.push(`Kategorie: "${matched_search_category}"`); }

  // +20 Bonus: Gelernte Winning-Signals (zusätzlich zu statischen +15)
  for (const s of learnedWinningSignals) {
    if (text.includes(normStr(s))) { score += 20; reasons.push(`Gelernt: "${s}"`); break; }
  }

  // +15: Scoring Signal (statisch)
  for (const s of (profile.scoringSignals || [])) {
    if (text.includes(normStr(s))) { score += 15; reasons.push(`Signal: "${s}"`); break; }
  }

  // +10: Telefon
  if (candidate.formatted_phone_number || candidate.international_phone_number) { score += 10; reasons.push("Telefon"); }

  // +10: Website
  if (candidate.website) { score += 10; reasons.push("Website"); }

  // +10: Im Radius
  if (distanceKm !== null && distanceKm <= radiusKm) { score += 10; reasons.push(`Radius (${distanceKm}km)`); }

  // Negative
  if (badFitResult.isBadFit) {
    const penalty = (badFitResult.signalType === 'job' || badFitResult.signalType === 'private') ? 50 : 30;
    score -= penalty;
    reasons.push(`BadFit: ${badFitResult.reason}`);
  }

  // Target Customer Match
  for (const tc of (profile.targetCustomerTypes || [])) {
    if (text.includes(normStr(tc))) { matched_target_customer_type = tc; break; }
  }

  // Service Context
  for (const svc of (profile.ownServices || [])) {
    if (text.includes(normStr(svc))) { matched_service_context = svc; break; }
  }

  score = Math.max(0, Math.min(100, score));
  return {
    search_quality_score: score,
    matched_search_category,
    matched_target_customer_type,
    matched_service_context,
    relevance_reason: reasons.join(' | ') || 'Kein Match',
    bad_fit_reason: badFitResult.isBadFit ? badFitResult.reason : null,
    shouldSave: score >= 55 && !badFitResult.isBadFit,
  };
}

// ============================================================
// GOOGLE API HELPERS
// ============================================================

const GOOGLE_SKU_PRICING_USD_PER_1000 = { 
  places_text_search_pro: 32,      // Legacy (wird ersetzt)
  places_new_text_search: 35,      // New API Text Search
  place_details_essentials: 5,     // Legacy (wird ersetzt)
  places_new_details_basic: 3,     // New API Details Basic SKU
};
function skuCostCent(sku, requests) { return (requests / 1000) * (GOOGLE_SKU_PRICING_USD_PER_1000[sku] || 0) * 100; }

function isLikelyChain(candidate) {
  // 100+ Kettenbegriffe
  const chainKeywords = [
    // Lebensmittelhandel
    'aldi', 'aldisüd', 'aldinord', 'lidl', 'penny', 'netto', 'rewe', 'edeka', 'kaufland', 'real', 'marktkauf', 'selgros', 'metro', 'makro', 'costco',
    // Drogerien
    'dm', 'rossmann', 'müller',
    // Bekleidung
    'h&m', 'zara', 'primark', 'c&a', 'next', 'gap', 'mango', 'esprit', 'tommy hilfiger', 'calvin klein', 'guess', 'diesel',
    // Schuhe
    'deichmann', 'foot locker', 'intersport', 'decathlon', 'nike store', 'adidas store', 'puma store',
    // Paketdienste
    'deutsche post', 'dhl', 'ups store', 'fedex', 'hermes', 'dpd', 'gls', 'postamt', 'postfiliale',
    // Banken
    'sparkasse', 'deutsche bank', 'commerzbank', 'comdirect', 'ing-diba', 'ing diba', 'hypovereinsbank', 'unicredit', 'santander', 'postbank', 'targobank',
    // Gastronomie
    'mcdonalds', 'burger king', 'subway', 'kfc', 'pizza hut', 'dominos', 'vapiano', 'maredo', 'segafredo', 'starbucks', 'costa coffee',
    // Hotels
    'hilton', 'marriott', 'accor', 'ibis', 'novotel', 'mercure', 'sofitel', 'holiday inn', 'hyatt', 'sheraton', 'radisson', 'best western', 'motel one',
    // Einzelhandel
    'karstadt', 'kaufhof', 'galeria', 'peek & cloppenburg', 'breuninger',
    // Auto
    'sixt', 'hertz', 'avis', 'enterprise', 'europcar', 'budget',
    // Fitness
    'fitx', 'mcfit', 'easyfit', 'fitness first', 'john reed',
    // Beauty
    'david garrett', 'klier', 'haar und farbe',
    // Optiker
    'fielmann', 'apollo optik',
    // Telekommunikation
    'telekom', 't-mobile', 'vodafone', 'o2', 'telefonica',
    // Kino
    'cinemaxx', 'uci', 'cinestar',
    // Möbel
    'ikea', 'hoffner', 'segmuller', 'poco', 'roller', 'xxxlutz', 'conforama',
    // Baumarkt
    'obi', 'bauhaus', 'hornbach', 'hagebau', 'hellweg',
    // Gartencenter
    'dehner', 'gartencenter müller',
    // Spielzeug
    'toys r us', 'smyths',
    // Generisch
    'franchise', 'filiale', 'kette', 'filialen', 'niederlassung', 'zentrale', 'konzern', 'holding'
  ];
  
  const nameLower = (candidate.name || '').toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
  
  for (const kw of chainKeywords) {
    if (nameLower.includes(kw)) return { isChain: true, reason: `Kette: ${kw}` };
  }
  
  // Bewertungsanzahl-Heuristic: >1500 = sehr wahrscheinlich Kette
  const reviews = candidate.user_ratings_total || 0;
  if (reviews > 1500) return { isChain: true, reason: `>1500 Bewertungen (${reviews})` };
  
  return { isChain: false, reason: null };
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function generateSearchGrid(centerLat, centerLng, radiusKm, trialStage) {
  const points = [{ lat: centerLat, lng: centerLng, label: 'center' }];
  if (trialStage === 'free_preview') return points;

  const stepKm = 15;
  const rings = radiusKm <= 20 ? 1 : radiusKm <= 35 ? 2 : 3;

  for (let ring = 1; ring <= rings; ring++) {
    const ringRadiusKm = ring * stepKm;
    const pointsInRing = 6 * ring;
    for (let i = 0; i < pointsInRing; i++) {
      const angle = (2 * Math.PI * i) / pointsInRing;
      const dLat = (ringRadiusKm / 111) * Math.cos(angle);
      const dLng = (ringRadiusKm / (111 * Math.cos(centerLat * Math.PI / 180))) * Math.sin(angle);
      const pLat = centerLat + dLat;
      const pLng = centerLng + dLng;
      if (haversineKm(centerLat, centerLng, pLat, pLng) <= radiusKm * 1.05) {
        points.push({ lat: pLat, lng: pLng, label: `grid_${ring}_${i}` });
      }
    }
  }
  return points;
}

// ── Deutsche Städte für Radius-Expansion ────────────────────────
// Top ~130 Städte nach Bevölkerung mit Koordinaten
const DE_CITIES = [
  { n: "Berlin", lat: 52.5200, lng: 13.4050, p: 3700000 },
  { n: "Hamburg", lat: 53.5753, lng: 10.0153, p: 1800000 },
  { n: "München", lat: 48.1351, lng: 11.5820, p: 1500000 },
  { n: "Köln", lat: 50.9333, lng: 6.9500, p: 1080000 },
  { n: "Frankfurt", lat: 50.1109, lng: 8.6821, p: 760000 },
  { n: "Stuttgart", lat: 48.7758, lng: 9.1829, p: 630000 },
  { n: "Düsseldorf", lat: 51.2217, lng: 6.7762, p: 620000 },
  { n: "Leipzig", lat: 51.3397, lng: 12.3731, p: 600000 },
  { n: "Dortmund", lat: 51.5136, lng: 7.4653, p: 590000 },
  { n: "Essen", lat: 51.4556, lng: 7.0116, p: 580000 },
  { n: "Bremen", lat: 53.0793, lng: 8.8017, p: 570000 },
  { n: "Dresden", lat: 51.0504, lng: 13.7373, p: 560000 },
  { n: "Hannover", lat: 52.3759, lng: 9.7320, p: 535000 },
  { n: "Nürnberg", lat: 49.4521, lng: 11.0767, p: 515000 },
  { n: "Duisburg", lat: 51.4344, lng: 6.7623, p: 495000 },
  { n: "Bochum", lat: 51.4818, lng: 7.2162, p: 365000 },
  { n: "Wuppertal", lat: 51.2562, lng: 7.1508, p: 355000 },
  { n: "Bielefeld", lat: 52.0302, lng: 8.5325, p: 334000 },
  { n: "Bonn", lat: 50.7374, lng: 7.0982, p: 330000 },
  { n: "Mannheim", lat: 49.4875, lng: 8.4660, p: 309000 },
  { n: "Karlsruhe", lat: 49.0069, lng: 8.4037, p: 308000 },
  { n: "Wiesbaden", lat: 50.0782, lng: 8.2398, p: 278000 },
  { n: "Münster", lat: 51.9607, lng: 7.6261, p: 315000 },
  { n: "Augsburg", lat: 48.3717, lng: 10.8983, p: 295000 },
  { n: "Aachen", lat: 50.7753, lng: 6.0839, p: 248000 },
  { n: "Krefeld", lat: 51.3388, lng: 6.5853, p: 226000 },
  { n: "Chemnitz", lat: 50.8278, lng: 12.9214, p: 247000 },
  { n: "Halle", lat: 51.4828, lng: 11.9697, p: 239000 },
  { n: "Mönchengladbach", lat: 51.1805, lng: 6.4428, p: 261000 },
  { n: "Braunschweig", lat: 52.2689, lng: 10.5268, p: 249000 },
  { n: "Kiel", lat: 54.3213, lng: 10.1349, p: 246000 },
  { n: "Magdeburg", lat: 52.1205, lng: 11.6276, p: 238000 },
  { n: "Freiburg", lat: 47.9990, lng: 7.8421, p: 231000 },
  { n: "Oberhausen", lat: 51.4963, lng: 6.8638, p: 210000 },
  { n: "Erfurt", lat: 50.9787, lng: 11.0328, p: 213000 },
  { n: "Rostock", lat: 54.0924, lng: 12.0991, p: 209000 },
  { n: "Kassel", lat: 51.3127, lng: 9.4797, p: 201000 },
  { n: "Mainz", lat: 49.9929, lng: 8.2473, p: 218000 },
  { n: "Hagen", lat: 51.3671, lng: 7.4632, p: 188000 },
  { n: "Hamm", lat: 51.6739, lng: 7.8225, p: 178000 },
  { n: "Saarbrücken", lat: 49.2354, lng: 6.9967, p: 180000 },
  { n: "Mülheim", lat: 51.4272, lng: 6.8828, p: 170000 },
  { n: "Potsdam", lat: 52.3906, lng: 13.0645, p: 182000 },
  { n: "Ludwigshafen", lat: 49.4744, lng: 8.4102, p: 163000 },
  { n: "Oldenburg", lat: 53.1435, lng: 8.2146, p: 168000 },
  { n: "Leverkusen", lat: 51.0459, lng: 6.9894, p: 163000 },
  { n: "Osnabrück", lat: 52.2799, lng: 8.0472, p: 165000 },
  { n: "Solingen", lat: 51.1702, lng: 7.0832, p: 158000 },
  { n: "Heidelberg", lat: 49.3988, lng: 8.6724, p: 161000 },
  { n: "Darmstadt", lat: 49.8728, lng: 8.6512, p: 158000 },
  { n: "Paderborn", lat: 51.7189, lng: 8.7575, p: 151000 },
  { n: "Regensburg", lat: 49.0134, lng: 12.1016, p: 153000 },
  { n: "Würzburg", lat: 49.7944, lng: 9.9294, p: 127000 },
  { n: "Ingolstadt", lat: 48.7630, lng: 11.4239, p: 137000 },
  { n: "Wolfsburg", lat: 52.4227, lng: 10.7865, p: 124000 },
  { n: "Ulm", lat: 48.3984, lng: 9.9908, p: 126000 },
  { n: "Göttingen", lat: 51.5413, lng: 9.9158, p: 119000 },
  { n: "Heilbronn", lat: 49.1427, lng: 9.2109, p: 126000 },
  { n: "Pforzheim", lat: 48.8915, lng: 8.6986, p: 125000 },
  { n: "Bottrop", lat: 51.5236, lng: 6.9289, p: 117000 },
  { n: "Offenbach", lat: 50.0956, lng: 8.7761, p: 130000 },
  { n: "Bremerhaven", lat: 53.5494, lng: 8.5785, p: 113000 },
  { n: "Recklinghausen", lat: 51.6151, lng: 7.1979, p: 114000 },
  { n: "Fürth", lat: 49.4771, lng: 10.9888, p: 128000 },
  { n: "Reutlingen", lat: 48.4913, lng: 9.2042, p: 115000 },
  { n: "Koblenz", lat: 50.3569, lng: 7.5890, p: 113000 },
  { n: "Trier", lat: 49.7596, lng: 6.6441, p: 111000 },
  { n: "Jena", lat: 50.9272, lng: 11.5898, p: 111000 },
  { n: "Moers", lat: 51.4516, lng: 6.6279, p: 104000 },
  { n: "Lübeck", lat: 53.8655, lng: 10.6866, p: 217000 },
  { n: "Siegen", lat: 50.8748, lng: 8.0243, p: 102000 },
  { n: "Hildesheim", lat: 52.1522, lng: 9.9521, p: 101000 },
  { n: "Cottbus", lat: 51.7563, lng: 14.3329, p: 100000 },
  { n: "Gera", lat: 50.8821, lng: 12.0806, p: 94000 },
  { n: "Kaiserslautern", lat: 49.4440, lng: 7.7689, p: 100000 },
  { n: "Neuwied", lat: 50.4299, lng: 7.4615, p: 64000 },
  { n: "Andernach", lat: 50.4428, lng: 7.3950, p: 29000 },
  { n: "Mayen", lat: 50.3287, lng: 7.2232, p: 20000 },
  { n: "Bendorf", lat: 50.4314, lng: 7.5701, p: 17000 },
  { n: "Boppard", lat: 50.2298, lng: 7.5901, p: 15000 },
  { n: "Lahnstein", lat: 50.3064, lng: 7.6063, p: 18000 },
  { n: "Bad Kreuznach", lat: 49.8489, lng: 7.8686, p: 52000 },
  { n: "Idar-Oberstein", lat: 49.7133, lng: 7.3229, p: 28000 },
  { n: "Ludwigsburg", lat: 48.8975, lng: 9.1919, p: 93000 },
  { n: "Esslingen", lat: 48.7394, lng: 9.3049, p: 93000 },
  { n: "Sindelfingen", lat: 48.7103, lng: 9.0026, p: 64000 },
  { n: "Villingen-Schwenningen", lat: 48.0603, lng: 8.4539, p: 83000 },
  { n: "Konstanz", lat: 47.6779, lng: 9.1732, p: 84000 },
  { n: "Ravensburg", lat: 47.7831, lng: 9.6116, p: 50000 },
  { n: "Friedrichshafen", lat: 47.6547, lng: 9.4785, p: 61000 },
  { n: "Bayreuth", lat: 49.9456, lng: 11.5713, p: 75000 },
  { n: "Bamberg", lat: 49.8988, lng: 10.9028, p: 77000 },
  { n: "Erlangen", lat: 49.5897, lng: 11.0078, p: 113000 },
  { n: "Passau", lat: 48.5748, lng: 13.4617, p: 52000 },
  { n: "Landshut", lat: 48.5372, lng: 12.1522, p: 73000 },
  { n: "Rosenheim", lat: 47.8561, lng: 12.1289, p: 63000 },
  { n: "Kempten", lat: 47.7267, lng: 10.3156, p: 69000 },
  { n: "Fulda", lat: 50.5558, lng: 9.6808, p: 67000 },
  { n: "Marburg", lat: 50.8021, lng: 8.7710, p: 73000 },
  { n: "Gießen", lat: 50.5841, lng: 8.6784, p: 90000 },
  { n: "Lüneburg", lat: 53.2508, lng: 10.4145, p: 77000 },
  { n: "Celle", lat: 52.6250, lng: 10.0820, p: 70000 },
  { n: "Salzgitter", lat: 52.1508, lng: 10.3431, p: 98000 },
  { n: "Görlitz", lat: 51.1539, lng: 14.9896, p: 56000 },
  { n: "Zwickau", lat: 50.7186, lng: 12.4963, p: 89000 },
  { n: "Plauen", lat: 50.4950, lng: 12.1342, p: 64000 },
  { n: "Dessau", lat: 51.8372, lng: 12.2427, p: 81000 },
];

function findNearbyCities(centerLat, centerLng, radiusKm, mainCity, limit = 5) {
  return DE_CITIES
    .map(city => ({
      ...city,
      distKm: haversineKm(centerLat, centerLng, city.lat, city.lng)
    }))
    .filter(city =>
      city.distKm <= radiusKm &&
      city.distKm > 3 &&
      city.n.toLowerCase() !== mainCity.toLowerCase()
    )
    .sort((a, b) => b.p - a.p)
    .slice(0, limit)
    .map(city => city.n);
}

async function searchPlaces(query, cityCoords, radiusMeters, apiCounters, pageToken = null) {
  const body = {
    textQuery: query,
    languageCode: "de",
    locationBias: {
      circle: {
        center: { latitude: cityCoords.lat, longitude: cityCoords.lng },
        radius: Math.min(radiusMeters, 50000), // New API max 50km
      },
    },
    maxResultCount: 20,
  };
  if (pageToken) body.pageToken = pageToken;

  apiCounters.textSearch++;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,nextPageToken",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { results: [], nextPageToken: null };
  const data = await res.json();

  // Neue API → Legacy-Format normalisieren damit der Rest unverändert bleibt
  const results = (data.places || []).map((p) => ({
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    types: p.types || [],
  }));

  return { results, nextPageToken: data.nextPageToken || null };
}

async function searchPlacesWithPagination(query, cityCoords, radiusMeters, apiCounters, maxPages = 3) {
  const allResults = [];
  let pageToken = null;
  let page = 0;
  
  do {
    const { results, nextPageToken } = await searchPlaces(query, cityCoords, radiusMeters, apiCounters, pageToken);
    allResults.push(...results);
    pageToken = nextPageToken || null;
    page++;
    if (pageToken) await new Promise(resolve => setTimeout(resolve, 2000)); // 2 sec delay (Google requirement)
  } while (pageToken && page < maxPages);
  
  return allResults;
}

async function getPlaceDetails(placeId, apiCounters) {
  apiCounters.placeDetailsEssentials++;
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      // Basic SKU: günstiger als Pro. Nur Felder die wir wirklich brauchen.
      "X-Goog-FieldMask": "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,location,addressComponents,types",
    },
  });
  if (!res.ok) return null;
  const p = await res.json();
  if (!p || p.error) return null;

  // Legacy-Format normalisieren damit der Rest unverändert bleibt
  return {
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    formatted_phone_number: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
    website: p.websiteUri || "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    types: p.types || [],
    address_components: (p.addressComponents || []).map((c) => ({
      long_name: c.longText,
      types: c.types,
    })),
  };
}

function extractAddressComponents(components = []) {
  let plz = '', ort = '', strasse = '', hausnummer = '';
  for (const c of components) {
    if (c.types.includes('postal_code')) plz = c.long_name;
    if (c.types.includes('locality')) ort = c.long_name;
    if (c.types.includes('route')) strasse = c.long_name;
    if (c.types.includes('street_number')) hausnummer = c.long_name;
  }
  return { plz, ort, adresse: [strasse, hausnummer].filter(Boolean).join(' ') };
}

// ============================================================
// ACCESS CHECK
// ============================================================

async function checkAccess(req, { organization_id, action } = {}) {
  const b44 = createClientFromRequest(req);
  let user;
  try { user = await b44.auth.me(); } catch { return { allowed: false, reason: 'not_authenticated', message: 'Nicht eingeloggt.' }; }
  if (!user) return { allowed: false, reason: 'not_authenticated', message: 'Nicht eingeloggt.' };
  if (user.role === 'admin') return { allowed: true, reason: 'platform_admin', user, organization: null, role: 'platform_admin' };
  if (!organization_id) return { allowed: false, reason: 'missing_organization_id', message: 'Keine organization_id.' };

  const [orgs, members] = await Promise.all([
    b44.asServiceRole.entities.Organization.filter({ id: organization_id }),
    b44.asServiceRole.entities.OrganizationMember.filter({ organization_id, user_email: user.email }),
  ]);
  const organization = orgs[0] || null;
  if (!organization) return { allowed: false, reason: 'organization_not_found', message: 'Organisation nicht gefunden.' };
  if (organization.owner_email === user.email) return { allowed: true, reason: 'org_owner', user, organization, member: members[0] || null, role: 'organization_admin' };
  const member = members[0] || null;
  if (!member || member.status !== 'active') return { allowed: false, reason: 'not_a_member', message: 'Kein aktives Mitglied.' };
  const allowedRoles = ['organization_admin', 'sales_rep'];
  if (!allowedRoles.includes(member.role)) return { allowed: false, reason: 'insufficient_role', message: `Rolle "${member.role}" nicht erlaubt.` };
  return { allowed: true, reason: 'ok', user, organization, member, role: member.role };
}

// ============================================================
// LOCK HELPERS
// ============================================================
const LOCK_TIMEOUT_MS = 10 * 60 * 1000;

async function acquireLock(base44, organization_id, user_email) {
  const [existing, startedAt] = await Promise.all([
    base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key: 'lead_research_running' }),
    base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key: 'lead_research_started_at' }),
  ]);
  if (existing[0]?.value === 'true' && startedAt[0]?.value) {
    const age = Date.now() - new Date(startedAt[0].value).getTime();
    if (age < LOCK_TIMEOUT_MS) {
      const lockedBy = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key: 'lead_research_locked_by' });
      return { acquired: false, lockedBy: lockedBy[0]?.value || 'unbekannt', startedAt: startedAt[0].value };
    }
  }
  const now = new Date().toISOString();
  const upsert = async (key, value) => {
    const rec = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key });
    if (rec[0]) await base44.asServiceRole.entities.OrganizationSettings.update(rec[0].id, { value });
    else await base44.asServiceRole.entities.OrganizationSettings.create({ organization_id, key, value });
  };
  await upsert('lead_research_running', 'true');
  await upsert('lead_research_started_at', now);
  await upsert('lead_research_locked_by', user_email);
  return { acquired: true };
}

async function releaseLock(base44, organization_id) {
  try {
    const rec = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id, key: 'lead_research_running' });
    if (rec[0]) await base44.asServiceRole.entities.OrganizationSettings.update(rec[0].id, { value: 'false' });
  } catch (e) { console.error('[generateLeads] Lock-Release fehler:', e.message); }
}

// ============================================================
// USAGE LOG
// ============================================================
function getPeriodMonth() { const n = new Date(); return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,'0')}`; }

async function upsertUsageLog(base44, organization_id, delta, lastReport) {
  const periodMonth = getPeriodMonth();
  const now = new Date().toISOString();
  const existing = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
  const reportJson = JSON.stringify(lastReport);
  const skuJson = JSON.stringify(delta.skuBreakdown || {});
  if (existing?.[0]) {
    const log = existing[0];
    await base44.asServiceRole.entities.UsageLog.update(log.id, {
      lead_generations_used: (log.lead_generations_used || 0) + (delta.lead_generations_used || 0),
      leads_created: (log.leads_created || 0) + (delta.leads_created || 0),
      google_places_text_search_requests: (log.google_places_text_search_requests || 0) + (delta.textSearch || 0),
      google_place_details_essentials_requests: (log.google_place_details_essentials_requests || 0) + (delta.placeDetails || 0),
      google_places_requests: (log.google_places_requests || 0) + (delta.textSearch || 0),
      place_details_requests: (log.place_details_requests || 0) + (delta.placeDetails || 0),
      estimated_external_cost_cent: (log.estimated_external_cost_cent || 0) + (delta.estimatedCostCent || 0),
      google_sku_breakdown: skuJson,
      last_lead_generation_at: now,
      last_lead_generation_report: reportJson,
    });
  } else {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth()+1, 0, 23, 59, 59)).toISOString();
    await base44.asServiceRole.entities.UsageLog.create({
      organization_id, period_month: periodMonth, period_start: start, period_end: end,
      lead_generations_used: delta.lead_generations_used || 0,
      leads_created: delta.leads_created || 0,
      google_places_text_search_requests: delta.textSearch || 0,
      google_place_details_essentials_requests: delta.placeDetails || 0,
      google_places_requests: delta.textSearch || 0,
      place_details_requests: delta.placeDetails || 0,
      estimated_external_cost_cent: delta.estimatedCostCent || 0,
      google_sku_breakdown: skuJson,
      last_lead_generation_at: now,
      last_lead_generation_report: reportJson,
    });
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

Deno.serve(async (req) => {
  let _base44 = null, _orgId = null, _lockAcquired = false;

  try {
    const base44 = createClientFromRequest(req);
    _base44 = base44;
    const body = await req.json();
    const { organization_id, target_count = 25 } = body;
    _orgId = organization_id;

    if (!organization_id) return Response.json({ error: 'organization_id fehlt', success: false }, { status: 400 });

    // Auth
    const access = await checkAccess(req, { organization_id, action: 'generate_leads' });
    if (!access.allowed) return Response.json({ error: access.message, success: false, reason: access.reason }, { status: 403 });
    if (!GOOGLE_PLACES_API_KEY) return Response.json({ error: 'GOOGLE_PLACES_API_KEY nicht konfiguriert', success: false }, { status: 500 });

    // ── FIX 1: Global Kill-Switch (PlatformConfig) ──────────────
    const configs = await base44.asServiceRole.entities.PlatformConfig.list();
    if (configs[0] && !configs[0].google_places_api_enabled) {
      return Response.json({
        success: false,
        error: 'service_temporarily_unavailable',
        message: configs[0].disabled_reason || 'Die Lead-Recherche ist gerade in Wartung. Wir sind in Kürze wieder verfügbar.'
      }, { status: 503 });
    }

    // Organisation laden
    const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
    const org = orgs[0];
    if (!org) return Response.json({ error: 'Organization not found', success: false }, { status: 404 });

    if (access.user.role !== 'admin') {
      if (org.platform_status === 'suspended') return Response.json({ error: 'organization_suspended', message: 'Organisation gesperrt.', success: false }, { status: 403 });
      if (org.abuse_status === 'blocked') return Response.json({ error: 'abuse_blocked', message: 'Zugang eingeschränkt. Support kontaktieren.', success: false }, { status: 403 });
    }
    const billingOk = ['preview', 'active', 'trialing'].includes(org.billing_status);
    if (!billingOk) return Response.json({ error: `Billing status "${org.billing_status}" nicht erlaubt.`, success: false }, { status: 402 });

    // ── Trial-Stufe & Remaining Leads ─────────────────────────
    const trialStage = org.trial_stage || 'free_preview';
    const remainingPreviewLeads = Math.max(0, 10 - (org.trial_leads_granted || 0));

    // ── FIX 3: Free Preview Abuse-Schutz (Daily Limit) ─────────
    // ResearchRun wird pro Lauf erstellt — das ist die einzige Entity die jeden Run zählt
    if (trialStage === 'free_preview') {
      const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentRuns = await base44.asServiceRole.entities.ResearchRun.filter(
        { organization_id },
        '-created_date',
        10
      );
      const runsLast24h = recentRuns.filter(
        r => new Date(r.created_date) >= last24h
      ).length;

      if (runsLast24h >= 3) {
        return Response.json({
          success: false,
          error: 'free_preview_daily_limit',
          message: 'Du hast deine kostenlosen Vorschau-Recherchen für heute aufgebraucht.',
          cta: 'Mit dem 14-Tage-Testzugang kannst du unbegrenzt recherchieren.',
          cta_url: '/settings?tab=billing'
        }, { status: 429 });
      }
    }

    // ── Search Plan via LeadSearchEngine ──────────────────────
    // Settings laden
    const settingsRecords = await base44.asServiceRole.entities.OrganizationSettings.filter({ organization_id });
    const settings = {};
    settingsRecords.forEach(s => { settings[s.key] = s.value; });

    // ── OrgLearnedSignals laden ────────────────────────────────────
    const learnedSignalsRecords = await base44.asServiceRole.entities.OrgLearnedSignals.filter(
      { organization_id }
    );
    const learnedSignals = learnedSignalsRecords[0] || null;

    let learnedPriorityCategories = [];
    let learnedWinningSignals = [];
    let learnedBoostedKeywords = [];

    if (learnedSignals) {
      try {
        const cats = JSON.parse(learnedSignals.priority_categories || '[]');
        learnedPriorityCategories = cats
          .filter(c => c.score > 55 && c.total >= 2)
          .map(c => c.category);

        learnedWinningSignals = JSON.parse(learnedSignals.winning_signals || '[]')
          .map(s => s.signal);

        learnedBoostedKeywords = JSON.parse(learnedSignals.boosted_keywords || '[]')
          .map(b => b.keyword);
      } catch (e) {
        console.warn('[generateLeads] OrgLearnedSignals parse error:', e.message);
      }
    }

    const industry = settings.industry_name || settings.own_industry || settings.industry || '';
    const targetCustomerTypes = (settings.target_customer_types || settings.zielkunden || '').split(', ').filter(x => x.trim());
    const excludedCustomerTypes = (settings.excluded_customer_types || settings.zielkunden_ausschluss || '').split(', ').filter(x => x.trim());
    const services = (settings.services || settings.dienstleistungen || '').split(', ').filter(x => x.trim());
    const city = settings.service_area_city || settings.lead_plz_city || settings.lead_plz || '';
    if (!city) return Response.json({ error: 'Kein Suchgebiet definiert.', success: false }, { status: 400 });
    const radiusKm = parseFloat(settings.lead_radius_km || settings.service_area_radius_km || '25') || 25;
    const radiusMeters = Math.min(radiusKm * 1000, 50000);

    // ── Smart Radius Expansion ───────────────────────────────────────
    // Automatisch Nachbarstädte finden wenn kein manueller additionalCities-Eintrag
    const manualAdditionalCities = (settings.additional_cities || '')
      .split(',').map(s => s.trim()).filter(Boolean);

    // cityCoords wird später geladen — hier noch nicht verfügbar, daher placeholder
    let additionalCities = manualAdditionalCities.length > 0 ? manualAdditionalCities : [];

    // SearchPlan bauen (searchPoints wird später befüllt nach Koordinaten-Ermittlung)
    const searchPlan = buildSearchPlan({
      industry,
      targetCustomerTypes,
      excludedCustomerTypes,
      location: city,
      radiusKm,
      trialStage,
      remainingLeadBudget: remainingPreviewLeads,
      additionalCities: [],
      searchPoints: [],
      learnedPriorityCategories,
      learnedWinningSignals,
    });

    // ── Hard-Block: Preview-Limit erreicht ────────────────────
    if (searchPlan.blocked || searchPlan.queryBudget?.blocked) {
      const reason = searchPlan.queryBudget?.reason || searchPlan.error;
      if (reason === 'preview_limit_reached' || trialStage === 'free_preview' && remainingPreviewLeads <= 0) {
        console.warn(`[generateLeads] Preview-Limit: ${org.trial_leads_granted}/3 für org=${organization_id}`);
        return Response.json({
          error: 'trial_preview_limit_reached',
          message: 'Kostenlose Vorschau aufgebraucht. Aktivieren Sie den verifizierten Testzugang.',
          success: false, trial_stage: trialStage,
          limits: { max_leads: 3, used: org.trial_leads_granted || 0 }
        }, { status: 403 });
      }
      if (reason === 'unknown_industry' || !searchPlan.industryProfile) {
        // Fallback: ohne Taxonomie, nur mit targetCustomerTypes (Legacy)
        console.warn(`[generateLeads] Keine Taxonomie für Branche "${industry}" – nutze Legacy-Fallback`);
      } else {
        return Response.json({ error: searchPlan.error || 'SearchPlan-Fehler', success: false }, { status: 400 });
      }
    }

    const queryBudget = searchPlan.queryBudget || getQueryBudget(trialStage, remainingPreviewLeads);
    const maxLeadsToSave = trialStage === 'free_preview' ? remainingPreviewLeads :
                           trialStage === 'verified_trial' ? Math.min(target_count, 25) : target_count;
    const effectiveTarget = Math.min(maxLeadsToSave, target_count);

    // Plan-Limits (paid)
    let planLimits = { max_lead_generations_per_month: 100, max_leads_per_month: 300 };
    if (org.plan_id) {
      const plans = await base44.asServiceRole.entities.Plan.filter({ id: org.plan_id });
      if (plans[0]) planLimits = { max_lead_generations_per_month: plans[0].max_lead_generations_per_month ?? 100, max_leads_per_month: plans[0].max_leads_per_month ?? 300 };
    }
    const periodMonth = getPeriodMonth();
    const existingUsage = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
    const currentUsage = existingUsage[0] || { lead_generations_used: 0, leads_created: 0 };
    if (trialStage === 'paid') {
      const maxRuns = planLimits.max_lead_generations_per_month;
      if (maxRuns !== -1 && (currentUsage.lead_generations_used || 0) >= maxRuns) {
        return Response.json({ error: `Recherche-Limit ${currentUsage.lead_generations_used}/${maxRuns} erreicht.`, success: false, limitReached: true }, { status: 403 });
      }
    }

    // Koordinaten
    const cityQuery = city + ' Deutschland';
    const refRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(cityQuery)}&key=${GOOGLE_PLACES_API_KEY}&language=de`);
    const refData = await refRes.json();
    let cityCoords = refData.results?.[0]?.geometry?.location ? { lat: refData.results[0].geometry.location.lat, lng: refData.results[0].geometry.location.lng } : null;
    if (!cityCoords) return Response.json({ error: `Stadt "${city}" nicht gefunden.`, success: false }, { status: 400 });
    const savedLat = parseFloat(settings.lead_lat || '0'), savedLng = parseFloat(settings.lead_lng || '0');
    if (savedLat && savedLng && /^\d{5}$/.test(city)) cityCoords = { lat: savedLat, lng: savedLng };

    // ── Grid-Suche (nach Koordinaten-Ermittlung) ──────────────────────
    const searchPoints = generateSearchGrid(cityCoords.lat, cityCoords.lng, radiusKm, trialStage);
    console.info(`[generateLeads] Grid: ${searchPoints.length} Punkte für ${radiusKm}km (${trialStage})`);

    // SearchPlan mit Grid-Punkten neu bauen
    const fullSearchPlan = buildSearchPlan({
      industry,
      targetCustomerTypes,
      excludedCustomerTypes,
      location: city,
      radiusKm,
      trialStage,
      remainingLeadBudget: remainingPreviewLeads,
      additionalCities: manualAdditionalCities,
      searchPoints,
      learnedPriorityCategories,
      learnedWinningSignals,
    });
    searchPlan.searchQueries = fullSearchPlan.searchQueries;
    searchPlan.searchPoints = fullSearchPlan.searchPoints;

    // ── Lock ──────────────────────────────────────────────────
    const lockResult = await acquireLock(base44, organization_id, access.user.email);
    if (!lockResult.acquired) {
      return Response.json({ error: `Recherche läuft bereits (${lockResult.lockedBy}).`, success: false, parallelLockActive: true }, { status: 429 });
    }
    _lockAcquired = true;

    // Suchqueries aus SearchPlan
    let searchQueryList = (searchPlan.searchQueries || []);

    // Fallback wenn keine Taxonomie: Legacy targetCustomerTypes
    if (searchQueryList.length === 0 && targetCustomerTypes.length > 0) {
      console.warn(`[generateLeads] Fallback auf targetCustomerTypes für Queries`);
      const seen = new Set();
      for (const tc of targetCustomerTypes.slice(0, queryBudget.maxSearchQueries || 10)) {
        const q = `${tc} ${city}`;
        if (!seen.has(q)) { seen.add(q); searchQueryList.push({ query: q, city, category: tc, variant: tc }); }
      }
    }

    if (searchQueryList.length === 0) return Response.json({ error: 'Keine Suchkategorien gefunden.', success: false }, { status: 400 });

    const industryProfile = searchPlan.industryProfile || null;

    console.info(`[generateLeads v2] START org=${organization_id} branche="${industry}" (${normalizeIndustryId(industry)}) stadt=${city} radius=${radiusKm}km trial=${trialStage} remaining=${remainingPreviewLeads} target=${effectiveTarget} queries=${searchQueryList.length}`);
    console.info(`[generateLeads v2] Engine: searchableCategories=${searchPlan.debug?.usedSearchableCategories?.length || 0} ignoredIdealProfiles=${searchPlan.debug?.ignoredIdealProfiles?.length || 0}`);

    // ── Existierende Firmen (Duplikat-Check) ──────────────────
    const existing = await base44.asServiceRole.entities.Company.filter({ organization_id });
    const existingNames = new Set(existing.map(c => normStr(c.name || '')));

    const apiCounters = { textSearch: 1, placeDetailsEssentials: 0 }; // +1 für Geocoding
    const seenPlaceIds = new Set();
    const createdIds = [];
    let raw_hits = 0, skipped_outside_radius = 0, skipped_duplicate = 0, skipped_no_match = 0, skipped_bad_fit = 0;
    const noMatchExamples = [], savedExamples = [], outsideRadiusExamples = [];
    let maxSavedDistanceKm = 0;
    let stopped_early = false, stop_reason = null;
    const maxPlaceDetails = queryBudget.maxPlaceDetails || 80;

    // ── HAUPT-SUCHLAUF mit Grid-Punkten ─────────────────────────
    const gridPoints = searchPlan.searchPoints || [{ lat: cityCoords.lat, lng: cityCoords.lng, label: 'center' }];
    const pointRadiusMeters = Math.min(15000, (radiusMeters / Math.max(gridPoints.length, 1)) * 1.5);

    outer: for (const point of gridPoints) {
      const pointCoords = { lat: point.lat, lng: point.lng };
      
      for (const { query, category, variant } of searchQueryList) {
        // Früh abbrechen: genug Leads
        if (createdIds.length >= effectiveTarget) {
          stopped_early = true; stop_reason = 'enough_leads_found';
          console.info(`[generateLeads v2] STOP: genug Leads (${createdIds.length}/${effectiveTarget})`);
          break outer;
        }

        // Pagination: bis zu 2 Seiten pro Grid-Punkt
        const maxPages = trialStage === 'free_preview' ? 1 : 2;
        const places = await searchPlacesWithPagination(query, pointCoords, pointRadiusMeters, apiCounters, maxPages);
        raw_hits += places.length;
        console.info(`[generateLeads v2] Point=${point.label} Query="${query}" → ${places.length} Treffer`);

        for (const place of places) {
        // Früh abbrechen: genug Leads
        if (createdIds.length >= effectiveTarget) {
          stopped_early = true; stop_reason = 'enough_leads_found'; break outer;
        }
        // Place Details Limit
        if (apiCounters.placeDetailsEssentials >= maxPlaceDetails) {
          stopped_early = true; stop_reason = 'place_details_limit';
          console.warn(`[generateLeads v2] Place-Details-Limit erreicht (${maxPlaceDetails})`);
          break outer;
        }

        if (seenPlaceIds.has(place.place_id)) continue;
        seenPlaceIds.add(place.place_id);

        // Distanz-Vorfilter (vor Place Details Request!)
        const placeLat = place.geometry?.location?.lat, placeLng = place.geometry?.location?.lng;
        let distanceKm = null;
        if (placeLat && placeLng) {
          distanceKm = haversineKm(cityCoords.lat, cityCoords.lng, placeLat, placeLng);
          // Hard filter: außerhalb des Radius = kein Place Details API Call
          if (distanceKm > radiusKm * 1.2) { // 20% Puffer für Ungenauigkeit
            skipped_outside_radius++;
            if (outsideRadiusExamples.length < 5) outsideRadiusExamples.push({ name: place.name, distance_km: Math.round(distanceKm * 10) / 10 });
            continue; // Kein Place-Details-Request!
          }
        }

        // Chain Detection
        const chainCheck = isLikelyChain(place);
        if (chainCheck.isChain) {
          skipped_no_match++; // Kategorisiert als "nicht passend"
          if (noMatchExamples.length < 8) noMatchExamples.push({ name: place.name, reason: chainCheck.reason });
          console.info(`[generateLeads v2] SKIP CHAIN "${place.name}" (${chainCheck.reason})`);
          continue;
        }

        // Duplikat
        if (existingNames.has(normStr(place.name || ''))) { skipped_duplicate++; continue; }

        // ── SCORING via LeadSearchEngine ──────────────────────
        let scoring;
        if (industryProfile) {
          scoring = scoreLeadCandidate({ candidate: place, profile: industryProfile, distanceKm, radiusKm, matchedSearchCategory: category, learnedWinningSignals });
          if (!scoring.shouldSave) {
            skipped_no_match++;
            if (noMatchExamples.length < 8) noMatchExamples.push({ name: place.name, reason: scoring.bad_fit_reason || scoring.relevance_reason });
            console.info(`[generateLeads v2] SKIP "${place.name}" score=${scoring.search_quality_score} reason="${scoring.bad_fit_reason || scoring.relevance_reason}"`);
            continue;
          }
        } else {
          // Legacy-Fallback ohne Taxonomie: minimale Prüfung
          const bf = isBadFit(place, { negativeKeywords: [], badFitSignals: [] });
          if (bf.isBadFit) { skipped_bad_fit++; continue; }
          scoring = { search_quality_score: 60, matched_search_category: category, matched_target_customer_type: null, matched_service_context: null, relevance_reason: `Legacy: ${category}`, bad_fit_reason: null, shouldSave: true };
        }

        // Place Details
        const details = await getPlaceDetails(place.place_id, apiCounters);
        const { plz, ort, adresse } = extractAddressComponents(details?.address_components || []);
        const phone = details?.formatted_phone_number || '';
        const website = details?.website || '';
        const lat = details?.geometry?.location?.lat || placeLat;
        const lng = details?.geometry?.location?.lng || placeLng;
        const roundedDist = distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null;

        const company = await base44.asServiceRole.entities.Company.create({
          organization_id,
          name: place.name || '',
          branche: scoring.matched_target_customer_type || scoring.matched_search_category || category,
          ort: ort || city,
          plz: plz || '',
          adresse: adresse || '',
          telefon: phone,
          email: '',
          website,
          latitude: lat || null,
          longitude: lng || null,
          quelle: 'Google Places API',
          status: 'Neu',
          is_hot: false,
          // ── LeadSearchEngine Relevanzdaten (Feldnamen exakt nach Company Entity) ──
          matched_target_customer_type: scoring.matched_target_customer_type,
          matched_service_context: scoring.matched_service_context,
          relevance_score: scoring.search_quality_score,   // Entity-Feld: relevance_score
          relevance_reason: scoring.relevance_reason,       // Entity-Feld: relevance_reason
          excluded_reason: scoring.bad_fit_reason,          // Entity-Feld: excluded_reason (kein bad_fit_reason in Company Entity)
          source_query: variant || query,                   // Entity-Feld: source_query
          distance_km: roundedDist,
          search_center_city: city,
          search_center_lat: cityCoords.lat,
          search_center_lng: cityCoords.lng,
          search_radius_km: radiusKm,
        });

        createdIds.push(company.id);
        existingNames.add(normStr(place.name || ''));
        if (roundedDist !== null && roundedDist > maxSavedDistanceKm) maxSavedDistanceKm = roundedDist;
        if (savedExamples.length < 10) savedExamples.push({ name: place.name, city: ort || city, distance_km: roundedDist, score: scoring.search_quality_score });
        console.info(`[generateLeads v2] SAVED "${place.name}" (cat=${scoring.matched_search_category} score=${scoring.search_quality_score} dist=${roundedDist}km)`);
        }
        }
        if (createdIds.length >= effectiveTarget) break outer;
        }

    if (!stopped_early && createdIds.length >= effectiveTarget) { stopped_early = true; stop_reason = 'enough_leads_found'; }
    if (!stopped_early) { stop_reason = 'query_budget_exhausted'; }

    const newLeadsSaved = createdIds.length;
    const chargedLeadGeneration = newLeadsSaved > 0;

    // Run Type
    let runType = 'new_leads';
    if (newLeadsSaved === 0) {
      if (skipped_duplicate > 0 && skipped_no_match === 0) runType = 'duplicate_only';
      else if (raw_hits === 0) runType = 'zero_result';
      else runType = 'no_match';
    }

    // Kosten
    const estimatedCostCent = skuCostCent('places_text_search_pro', apiCounters.textSearch) + skuCostCent('place_details_essentials', apiCounters.placeDetailsEssentials);

    // ── UsageLog ──────────────────────────────────────────────
    const lastReport = {
      search_engine_version: SEARCH_ENGINE_VERSION,
      requestedTarget: target_count, effectiveTarget, saved: newLeadsSaved,
      duplicates: skipped_duplicate, noMatch: skipped_no_match,
      outsideRadius: skipped_outside_radius, rawHits: raw_hits,
      noMatchExamples, outsideRadiusExamples, savedExamples, maxSavedDistanceKm,
      radiusKm, searchCenterCity: city, runType, chargedLeadGeneration,
      stopped_early, stop_reason,
      search_queries_used: searchQueryList.map(q => q.query),
      used_search_categories: searchPlan.debug?.usedSearchableCategories || [],
      ignored_ideal_profiles: searchPlan.debug?.ignoredIdealProfiles || [],
      query_budget: queryBudget,
      timestamp: new Date().toISOString(),
    };

    await upsertUsageLog(base44, organization_id, {
      lead_generations_used: chargedLeadGeneration ? 1 : 0,
      leads_created: newLeadsSaved,
      textSearch: apiCounters.textSearch,
      placeDetails: apiCounters.placeDetailsEssentials,
      estimatedCostCent,
      skuBreakdown: {
        places_text_search_pro: { requests: apiCounters.textSearch, estimated_cost_cent: skuCostCent('places_text_search_pro', apiCounters.textSearch) },
        place_details_essentials: { requests: apiCounters.placeDetailsEssentials, estimated_cost_cent: skuCostCent('place_details_essentials', apiCounters.placeDetailsEssentials) },
      }
    }, lastReport);

    // ── ResearchRun ────────────────────────────────────────────
    let research_run_id = null;
    try {
      const run = await base44.asServiceRole.entities.ResearchRun.create({
        organization_id, run_type: runType, requested_target: target_count,
        leads_saved: newLeadsSaved, duplicates_skipped: skipped_duplicate,
        no_match_count: skipped_no_match, outside_radius_count: skipped_outside_radius,
        raw_hits, search_center_city: city, search_radius_km: radiusKm,
        target_customer_types: targetCustomerTypes.join(', '),
        excluded_customer_types: excludedCustomerTypes.join(', '),
        summary: JSON.stringify(lastReport),
        charged_lead_generation: chargedLeadGeneration,
        created_by: access.user.email,
      });
      research_run_id = run.id;
    } catch (e) { console.error('[generateLeads v2] ResearchRun Fehler:', e.message); }

    // research_run_id zu Companies
    if (research_run_id && createdIds.length > 0) {
      try { await Promise.all(createdIds.map(id => base44.asServiceRole.entities.Company.update(id, { research_run_id }))); } catch {}
    }

    // ── Trial-Leads kumulativ updaten ─────────────────────────
    if (trialStage === 'free_preview' && chargedLeadGeneration) {
      const newTotal = (org.trial_leads_granted || 0) + newLeadsSaved;
      await base44.asServiceRole.entities.Organization.update(organization_id, { trial_leads_granted: newTotal });
      console.info(`[generateLeads v2] trial_leads_granted: ${org.trial_leads_granted} → ${newTotal}`);
    }

    console.info(`[generateLeads v2] DONE: saved=${newLeadsSaved} raw=${raw_hits} noMatch=${skipped_no_match} dup=${skipped_duplicate} outRadius=${skipped_outside_radius} stop=${stop_reason} textSearch=${apiCounters.textSearch} placeDetails=${apiCounters.placeDetailsEssentials} cost=${estimatedCostCent.toFixed(2)}¢`);

    return Response.json({
      success: true,
      requestedTarget: target_count,
      effectiveTarget,
      count: newLeadsSaved,
      chargedLeadGeneration,
      runType,
      research_run_id,
      // ── Free Preview Bericht ─────────────────────────────────
      ...(trialStage === 'free_preview' ? {
        freePreviewReport: {
          saved: newLeadsSaved,
          totalPreviewBudget: 10,
          usedBefore: org.trial_leads_granted || 0,
          usedAfter: (org.trial_leads_granted || 0) + newLeadsSaved,
          remaining: Math.max(0, 10 - ((org.trial_leads_granted || 0) + newLeadsSaved)),
          message: `Kostenlose Vorschau: ${newLeadsSaved} von ${remainingPreviewLeads} verfügbaren Vorschaukontakten gespeichert.`,
        }
      } : {}),
      summary: {
        raw_hits, saved: newLeadsSaved, duplicates: skipped_duplicate,
        excluded: 0, noMatch: skipped_no_match, outsideRadius: skipped_outside_radius,
        noMatchExamples, outsideRadiusExamples, savedExamples,
        maxSavedDistanceKm, radiusKm, searchCenterCity: city,
      },
      // ── Debug / Admin Report ─────────────────────────────────
      debug: {
        search_engine_version: SEARCH_ENGINE_VERSION,
        used_search_categories: searchPlan.debug?.usedSearchableCategories || [],
        ignored_ideal_profiles: searchPlan.debug?.ignoredIdealProfiles || [],
        search_queries_used: searchQueryList.map(q => q.query),
        query_budget: queryBudget,
        stopped_early,
        stop_reason,
        industryId: normalizeIndustryId(industry),
        taxonomyUsed: !!industryProfile,
      },
      googleRequests: { textSearch: apiCounters.textSearch, placeDetailsEssentials: apiCounters.placeDetailsEssentials },
      usage: { lead_generations_used: chargedLeadGeneration ? 1 : 0, leads_created: newLeadsSaved, estimated_external_cost_cent: estimatedCostCent },
    });

  } catch (error) {
    // ── FIX 2: Error-Alert an Plattform-Admin ────────────────────
    console.error('[generateLeads v2] Error:', error.message, error.stack);
    try {
      await base44.functions.invoke('sendCriticalErrorAlert', {
        function_name: 'generateLeads',
        error_message: error.message,
        stack: error.stack,
        organization_id: _orgId,
        user_email: null,
        timestamp: new Date().toISOString(),
      });
    } catch (alertErr) {
      console.error('[generateLeads v2] Alert-Fehler:', alertErr.message);
    }
    return Response.json({ error: error.message, success: false }, { status: 500 });
  } finally {
    if (_lockAcquired && _base44 && _orgId) await releaseLock(_base44, _orgId);
  }
});