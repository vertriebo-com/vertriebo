/**
 * processResearchRun
 * ==================
 * Verarbeitet einen ResearchRun in kleinen Batches.
 * Idempotent: doppelte Aufrufe erzeugen keine doppelten Companies.
 *
 * TAXONOMIE-HINWEIS:
 * Die TAXONOMY_DATA-Konstante ist eine 1:1-Kopie von utils/leadSearchTaxonomy.js.
 * Backend-Functions dürfen keine lokalen Imports haben (Deno Deploy Constraint).
 * Änderungen an der Taxonomie MÜSSEN in beiden Dateien synchron gemacht werden.
 * Single Source of Truth: utils/leadSearchTaxonomy.js → manuell synchronisiert.
 * taxonomy_version im ResearchRun-Update zeigt welche Version aktiv war.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const TAXONOMY_VERSION = "v4-ssot-2026-05";
const SEARCH_ENGINE_VERSION = "v4-ssot";

// ── Taxonomie (synchron mit utils/leadSearchTaxonomy.js) ────────────────────
// ACHTUNG: Änderungen hier MÜSSEN auch in utils/leadSearchTaxonomy.js gemacht werden!
const TAXONOMY_DATA = {
  gebaeudereinigung:{id:"gebaeudereinigung",label:"Gebäudereinigung",ownServices:["Büroreinigung","Treppenhausreinigung","Praxisreinigung","Fensterreinigung","Grundreinigung","Baureinigung","Sonderreinigung","Hausmeisterdienst","Winterdienst","Teppichreinigung","Glasreinigung"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Bürogebäude","Arztpraxen","Zahnarztpraxen","Ärztehäuser","Kitas","Schulen","Pflegeheime","Seniorenheime","Hotels","Autohäuser","Fitnessstudios","Gewerbehallen","Industriebetriebe","Einzelhandel","Supermärkte"],excludedCustomerTypes:["Privathaushalte","Einmalige Kleinstaufträge","private Wohnungen","Kleinanzeigen","Jobangebote"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Bürogebäude","Ärztehaus","Arztpraxis","Zahnarztpraxis","Kindertagesstätte","Schule","Pflegeheim","Seniorenheim","Hotel","Autohaus","Fitnessstudio","Gewerbepark","Industrieunternehmen","Einzelhandel","Supermarkt"],negativeKeywords:["privat","job","karriere","ausbildung","stellenangebot","minijob","kleinanzeigen","wohnung gesucht","mietgesuch"],badFitSignals:["privat","job","karriere","kleinanzeige","einzelperson","mietgesuch","gesucht","ausbildung"],searchKeywordVariants:{"Hausverwaltung":["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Mietverwaltung"],"Arztpraxis":["Arztpraxis","Ärztehaus","Zahnarztpraxis","Medizinisches Versorgungszentrum"],"Pflegeheim":["Pflegeheim","Seniorenheim","Seniorenresidenz","Altenheim"],"Hotel":["Hotel","Gasthof","Pension"],"Gewerbe":["Gewerbepark","Bürogebäude","Industrieunternehmen","Gewerbehalle"],"Schule":["Schule","Gymnasium","Grundschule","Berufsschule"],"Kita":["Kindertagesstätte","Kita","Kindergarten","Krippe"]},scoringSignals:["verwaltung","gewerbe","praxis","hotel","pflege","industrie","facility","büro","objekt","standort","wohnanlage","immobilien"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Pflegeheim","Arztpraxis","Hotel","Bürogebäude","Schule","Kita"]},
  sicherheitsdienst:{id:"sicherheitsdienst",label:"Sicherheitsdienst",ownServices:["Objektschutz","Baustellenbewachung","Veranstaltungsschutz","Doorman-Service","Revierdienst","Alarmverfolgung","Werkschutz","Empfangsdienst","Parkplatzüberwachung"],targetCustomerTypes:["Baustellen","Bauunternehmen","Logistikzentren","Industriebetriebe","Veranstalter","Hotels","Einkaufszentren","Parkhäuser","Messeveranstalter","Eventlocations","Gewerbeparks","Einzelhandel","Wohnanlagen"],excludedCustomerTypes:["Privatpersonen","kleine Privatfeiern","Vereine ohne Budget","Jobsuchende"],searchableBusinessCategories:["Bauunternehmen","Logistikzentrum","Industrieunternehmen","Veranstalter","Eventlocation","Hotel","Einkaufszentrum","Parkhaus","Messeveranstalter","Gewerbepark","Einzelhandel","Facility Management"],negativeKeywords:["job","stellenangebot","ausbildung","security job","privat","ehrenamt","karriere","bewerber"],badFitSignals:["job","karriere","privat","ehrenamt","verein klein","ausbildung","bewerber"],searchKeywordVariants:{"Baustelle":["Bauunternehmen","Bauträger","Baustelle","Generalunternehmer"],"Event":["Eventlocation","Veranstalter","Messeveranstalter","Kongresszentrum"],"Industrie":["Industriebetrieb","Gewerbepark","Logistikzentrum","Produktionsbetrieb"],"Hotel":["Hotel","Tagungshotel","Kongresshotel"],"Einzelhandel":["Einkaufszentrum","Shopping Center","Einzelhandel"]},scoringSignals:["objektschutz","baustelle","logistik","industrie","veranstaltung","zugang","werkschutz","publikumsverkehr","gewerbe","lager","messe"],queryPriority:["Bauunternehmen","Logistikzentrum","Industrieunternehmen","Hotel","Eventlocation","Einkaufszentrum"]},
  it_service:{id:"it_service",label:"IT-Service",ownServices:["IT-Support","Managed Services","Serverbetreuung","Netzwerkbetreuung","Microsoft 365","Cybersecurity","Cloud-Lösungen","Backup","Telefonanlage","Hardware-Service"],targetCustomerTypes:["Arztpraxen","Zahnarztpraxen","Steuerberater","Kanzleien","KMU","Schulen","Pflegeeinrichtungen","Handwerksbetriebe","Büros","Einzelhandel","Immobilienverwaltungen","Logistikunternehmen"],excludedCustomerTypes:["Privatpersonen","Gaming-PC-Anfragen","Einmalige Kleinreparaturen","Jobsuchende"],searchableBusinessCategories:["Arztpraxis","Zahnarztpraxis","Steuerberater","Rechtsanwalt","Kanzlei","Pflegeheim","Schule","Handwerksbetrieb","Büro","Einzelhandel","Immobilienverwaltung","Logistikunternehmen","Unternehmensberatung","Ingenieurbüro"],negativeKeywords:["privat","gaming","job","karriere","ausbildung","computerhilfe privat","forum","blog"],badFitSignals:["privat","gaming","job","forum","einzelperson","haushaltsgerät","reparatur privat"],searchKeywordVariants:{"Praxen":["Arztpraxis","Zahnarztpraxis","Ärztehaus","Medizinisches Versorgungszentrum"],"Kanzleien":["Rechtsanwalt","Kanzlei","Anwaltskanzlei","Steuerberater","Steuerberatung"],"KMU":["Handwerksbetrieb","Unternehmensberatung","Ingenieurbüro","Bürogebäude"],"Bildung":["Schule","Gymnasium","Bildungszentrum"],"Pflege":["Pflegeheim","Seniorenheim","Reha Zentrum"]},scoringSignals:["praxis","kanzlei","steuer","pflege","schule","verwaltung","mehrere standorte","daten","büro","handwerk","logistik"],queryPriority:["Arztpraxis","Zahnarztpraxis","Steuerberater","Rechtsanwalt","Handwerksbetrieb","Pflegeheim","Schule"]},
  gartenbau:{id:"gartenbau",label:"Gartenbau",ownServices:["Gartenpflege","Grünanlagenpflege","Rasenpflege","Heckenschnitt","Baumpflege","Winterdienst","Außenanlagenpflege","Pflasterarbeiten","Objektpflege"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Wohnanlagen","Hotels","Gewerbeparks","Kommunen","Pflegeheime","Kitas","Schulen","Facility Management Firmen","Bürogebäude","Industriebetriebe"],excludedCustomerTypes:["Privatgärten","Einmalige Kleinstaufträge","Kleinanzeigen","Jobs"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Wohnanlage","Hotel","Gewerbepark","Pflegeheim","Kindertagesstätte","Schule","Facility Management","Bürogebäude","Industrieunternehmen","Friedhof"],negativeKeywords:["privatgarten","privat","job","karriere","kleinanzeigen","gratis","selber machen"],badFitSignals:["privat","kleinanzeige","job","einzelgarten","hobby","selbst"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnanlage","WEG Verwaltung"],"Gewerbe":["Gewerbepark","Bürogebäude","Industriebetrieb"],"Sozial":["Pflegeheim","Kita","Schule","Altenheim"],"Hotel":["Hotel","Tagungshotel","Gasthof"]},scoringSignals:["anlage","grünfläche","verwaltung","wohnanlage","gewerbe","hotel","pflege","objekt","außenanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Hotel","Pflegeheim","Gewerbepark","Schule","Kita"]},
  catering:{id:"catering",label:"Catering",ownServices:["Business Catering","Event Catering","Messe Catering","Kita Catering","Schulverpflegung","Kantinenservice","Fingerfood","Buffet","Tagungsverpflegung"],targetCustomerTypes:["Eventlocations","Tagungshotels","Seminarzentren","Messeveranstalter","Kongresszentren","Unternehmen","Bürokomplexe","Kitas","Schulen","Pflegeheime","Hotels","Coworking Spaces","Vereine mit Budget"],excludedCustomerTypes:["Privatfeiern","Hochzeiten privat","Geburtstage privat","Kleinanzeigen","Einmalige Kleinstanfragen"],searchableBusinessCategories:["Eventlocation","Tagungshotel","Seminarzentrum","Messeveranstalter","Kongresszentrum","Bürogebäude","Kindertagesstätte","Schule","Pflegeheim","Hotel","Coworking Space","Veranstalter","Unternehmensberatung"],negativeKeywords:["privat","hochzeit","geburtstag","familienfeier","job","karriere","kleinanzeigen","selbst kochen"],badFitSignals:["privat","hochzeit","geburtstag","kleinanzeige","familienfeier","selbst"],searchKeywordVariants:{"Event":["Eventlocation","Veranstalter","Messeveranstalter","Kongresszentrum","Eventhalle"],"Business":["Bürogebäude","Unternehmensberatung","Coworking Space","Business Center"],"Bildung":["Kindertagesstätte","Schule","Seminarzentrum","Bildungszentrum"],"Hotel":["Tagungshotel","Kongresshotel","Hotel"]},scoringSignals:["event","tagung","messe","seminar","unternehmen","büro","kita","schule","hotel","kongress","veranstaltung"],queryPriority:["Eventlocation","Tagungshotel","Kongresszentrum","Seminarzentrum","Bürogebäude","Kita","Schule"]},
  handwerk:{id:"handwerk",label:"Handwerk",ownServices:["Reparaturen","Instandhaltung","Renovierung","Montage","Wartung","Notdienst","Objektbetreuung","Kleinreparaturen"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Bauunternehmen","Gewerbeimmobilienverwaltungen","Facility Management Firmen","Hotels","Praxen","Bürogebäude","Einzelhandel","Wohnungsbaugesellschaften"],excludedCustomerTypes:["Privathaushalte","Kleinstreparaturen ohne Budget","DIY-Anfragen","Jobangebote"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Bauunternehmen","Facility Management","Hotel","Arztpraxis","Bürogebäude","Einzelhandel","Wohnungsbaugesellschaft","Gewerbeimmobilienverwaltung"],negativeKeywords:["privat","selber machen","diy","job","ausbildung","karriere","kleinanzeigen","forum"],badFitSignals:["privat","diy","job","kleinanzeige","selbst"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft","WEG Verwaltung"],"Gewerbe":["Bürogebäude","Einzelhandel","Hotel","Gewerbepark"],"Bau":["Bauunternehmen","Facility Management","Generalunternehmer"]},scoringSignals:["verwaltung","objekt","instandhaltung","gewerbe","hotel","bau","facility","wohnanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Bauunternehmen","Hotel","Bürogebäude","Einzelhandel"]},
  spedition_logistik:{id:"spedition_logistik",label:"Spedition / Logistik",ownServices:["Transport","Kurierdienst","Expresslieferung","Stückgut","Palettentransport","Möbeltransport","Lagerlogistik","Auslieferung","Same-Day Delivery"],targetCustomerTypes:["Online-Shops","Großhändler","Produktionsbetriebe","Industriebetriebe","Möbelhäuser","Baustoffhändler","Maschinenbauunternehmen","Lebensmittelgroßhandel","Eventfirmen","Einzelhandel","E-Commerce-Unternehmen"],excludedCustomerTypes:["Privatumzüge","Einzelne Privattransporte","Kleinanzeigen","Jobs"],searchableBusinessCategories:["Großhandel","Produktionsbetrieb","Industrieunternehmen","Möbelhaus","Baustoffhandel","Maschinenbau","Lebensmittelgroßhandel","Eventagentur","Einzelhandel","Versandhandel","Handelsunternehmen","Küchenstudio"],negativeKeywords:["privat","umzug privat","job","fahrer gesucht","karriere","kleinanzeigen","führerschein"],badFitSignals:["privat","job","kleinanzeige","einzeltransport","möbel privat"],searchKeywordVariants:{"E-Commerce":["Versandhandel","Online Händler","Handelsunternehmen"],"Industrie":["Produktionsbetrieb","Industrieunternehmen","Maschinenbau"],"Handel":["Großhandel","Möbelhaus","Baustoffhandel","Lebensmittelgroßhandel"],"Event":["Eventagentur","Messeveranstalter","Veranstaltungstechnik"]},scoringSignals:["versand","logistik","lager","großhandel","produktion","lieferung","handel","import","export"],queryPriority:["Großhandel","Produktionsbetrieb","Industrieunternehmen","Möbelhaus","Maschinenbau","Baustoffhandel"]},
  gesundheit_medizin:{id:"gesundheit_medizin",label:"Gesundheit / Medizin",ownServices:["medizinische Dienstleistung","Therapie","Pflegebezogene Dienstleistung","Praxisservice","Gesundheitsberatung","Betriebliches Gesundheitsmanagement"],targetCustomerTypes:["Arztpraxen","Zahnarztpraxen","Therapiezentren","Pflegeheime","Seniorenheime","Apotheken","Reha-Zentren","Privatkliniken","Gesundheitszentren","Physiotherapien","Ergotherapien"],excludedCustomerTypes:["Privatpersonen","Foren","Selbsthilfegruppen ohne Budget","Jobanzeigen"],searchableBusinessCategories:["Arztpraxis","Zahnarztpraxis","Therapiezentrum","Pflegeheim","Seniorenheim","Apotheke","Reha Zentrum","Privatklinik","Gesundheitszentrum","Physiotherapie","Ergotherapie","Ärztehaus"],negativeKeywords:["privat","forum","job","karriere","ausbildung","krankheit erfahrung","selbsthilfe","blog"],badFitSignals:["forum","privat","job","erfahrung","selbsthilfe","blog"],searchKeywordVariants:{"Praxis":["Arztpraxis","Zahnarztpraxis","Ärztehaus","Medizinisches Versorgungszentrum"],"Therapie":["Physiotherapie","Ergotherapie","Therapiezentrum","Logopädie"],"Pflege":["Pflegeheim","Seniorenheim","Reha Zentrum","Klinik"]},scoringSignals:["praxis","gesundheit","pflege","therapie","reha","klinik","zentrum","apotheke","medizin"],queryPriority:["Arztpraxis","Zahnarztpraxis","Pflegeheim","Physiotherapie","Therapiezentrum","Ärztehaus"]},
  immobilien:{id:"immobilien",label:"Immobilien",ownServices:["Vermietung","Verwaltung","Verkauf","Gewerbeimmobilien","Projektentwicklung","Immobilienberatung","Standortvermittlung"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","WEG-Verwaltungen","Bauträger","Projektentwickler","Wohnungsbaugesellschaften","Gewerbeimmobilienverwaltungen","Immobiliengesellschaften","Property Management Firmen"],excludedCustomerTypes:["Privathaushalte","private Vermieter","Ferienwohnung privat","Makler ohne Verwaltungsbestand","Wohnung gesucht","Mietgesuch"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Bauträger","Projektentwickler","Wohnungsbaugesellschaft","Immobiliengesellschaft","Gewerbeimmobilienverwaltung","Property Management","Facility Management Immobilien","Mietverwaltung"],negativeKeywords:["privat","wohnung gesucht","mietgesuch","ferienwohnung","airbnb","job","karriere","ausbildung","vermiete privat","suche wohnung"],badFitSignals:["privat","mietgesuch","wohnung gesucht","ferienwohnung","job","airbnb"],searchKeywordVariants:{"Hausverwaltung":["Hausverwaltung","WEG Verwaltung","Immobilienverwaltung","Mietverwaltung","Objektverwaltung"],"Bauträger":["Bauträger","Wohnbaugesellschaft","Projektentwickler Immobilien","Immobilienprojektentwicklung"],"Gewerbe":["Gewerbeimmobilienverwaltung","Property Management","Facility Management Immobilien","Gewerbeimmobiliengesellschaft"]},scoringSignals:["verwaltung","weg","gewerbeimmobilien","bestand","objektverwaltung","property management","projektentwicklung","bauträger","wohnanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Bauträger","Wohnungsbaugesellschaft","Property Management"]},
  lager_fulfillment:{id:"lager_fulfillment",label:"Lager / Fulfillment",ownServices:["Fulfillment","Lagerung","Kommissionierung","Versandabwicklung","Retourenmanagement","E-Commerce Logistik","Pick & Pack","B2B-Lagerlogistik"],targetCustomerTypes:["Online-Shops","Shopify-Händler","Amazon-Händler","Großhändler","E-Commerce-Unternehmen","Kosmetikmarken","Lebensmittelmarken","Textilhändler","Ersatzteilhändler","Importeure","Startups mit Versand"],excludedCustomerTypes:["Privatverkäufer","Kleinanzeigen","Dropshipping ohne Bestand","Jobs"],searchableBusinessCategories:["Versandhandel","Großhandel","Kosmetikmarke","Lebensmittelhersteller","Textilhandel","Ersatzteilhandel","Importeur","Handelsunternehmen","Modehändler","Online Händler"],negativeKeywords:["privat","kleinanzeigen","job","karriere","ausbildung","ebay privat","zu verschenken"],badFitSignals:["privat","kleinanzeige","job","kein bestand","zu verschenken"],searchKeywordVariants:{"E-Commerce":["Versandhandel","Online Händler","Handelsunternehmen"],"Handel":["Großhandel","Importeur","Textilhandel","Modehändler"],"Produkte":["Kosmetikmarke","Lebensmittelhersteller","Ersatzteilhandel"]},scoringSignals:["shop","versand","handel","import","retouren","lager","ecommerce","online"],queryPriority:["Großhandel","Versandhandel","Importeur","Handelsunternehmen","Textilhandel"]},
  facility_service:{id:"facility_service",label:"Facility Service",ownServices:["Hausmeisterdienst","Objektbetreuung","Gebäudemanagement","Technische Betreuung","Reinigung","Winterdienst","Grünpflege","Kleinreparaturen","Kontrolldienste"],targetCustomerTypes:["Hausverwaltungen","Gewerbeimmobilien","Bürogebäude","Hotels","Pflegeheime","Industriebetriebe","Schulen","Kitas","Kommunen","Wohnanlagen","Facility Management Kunden"],excludedCustomerTypes:["Privathaushalte","Einmalige Kleinstaufträge","Jobs"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Gewerbeimmobilie","Bürogebäude","Hotel","Pflegeheim","Industrieunternehmen","Schule","Kindertagesstätte","Wohnanlage","Gewerbepark"],negativeKeywords:["privat","job","karriere","ausbildung","kleinanzeigen"],badFitSignals:["privat","job","kleinanzeige","einzelperson"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnanlage","WEG Verwaltung"],"Gewerbe":["Bürogebäude","Gewerbeimmobilie","Industrieunternehmen","Gewerbepark"],"Sozial":["Pflegeheim","Schule","Kita","Altenheim"]},scoringSignals:["objekt","verwaltung","gewerbe","facility","wohnanlage","technisch","gebäude","standort"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Bürogebäude","Hotel","Pflegeheim","Gewerbepark"]},
  entruempelung:{id:"entruempelung",label:"Entrümpelung",ownServices:["Entrümpelung","Haushaltsauflösung","Wohnungsauflösung","Nachlassauflösung","Kellerentrümpelung","Gewerbeauflösung","Messie-Wohnung","Entsorgung","Räumung"],targetCustomerTypes:["Hausverwaltungen","Nachlassverwalter","Betreuungsbüros","Immobilienmakler","Wohnungsbaugesellschaften","Pflegeheime","Seniorenheime","Rechtsanwälte Erbrecht","Sozialdienste","Gerichtliche Betreuer","Immobilienverwaltungen"],excludedCustomerTypes:["Privathaushalte mit Kleinstauftrag","Sperrmüll Einzelstück","Kleinanzeigen","Jobs"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Nachlassverwaltung","Betreuungsbüro","Immobilienmakler","Wohnungsbaugesellschaft","Pflegeheim","Seniorenheim","Rechtsanwalt Erbrecht","Sozialdienst"],negativeKeywords:["privat","sperrmüll kostenlos","kleinanzeigen","job","karriere","zu verschenken"],badFitSignals:["privat","kleinanzeige","zu verschenken","job","sperrmüll kostenlos"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft"],"Nachlass":["Nachlassverwaltung","Rechtsanwalt Erbrecht","Betreuungsbüro","Nachlassverwalter"],"Sozial":["Sozialdienst","Pflegeheim","Seniorenheim","Sozialstation"]},scoringSignals:["verwaltung","nachlass","betreuung","erbrecht","wohnung","pflege","sozialdienst","objekt"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Sozialdienst","Pflegeheim","Betreuungsbüro","Rechtsanwalt Erbrecht"]},
  maler_renovierung:{id:"maler_renovierung",label:"Maler / Renovierung",ownServices:["Malerarbeiten","Renovierung","Tapezieren","Lackieren","Fassadenanstrich","Innenausbau","Wohnungsrenovierung","Gewerberenovierung","Trockenbau"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Hotels","Bürogebäude","Praxen","Einzelhandel","Wohnungsbaugesellschaften","Bauunternehmen","Facility Management Firmen","Gewerbeimmobilienverwaltungen"],excludedCustomerTypes:["Privathaushalte","Kleinstreparaturen","DIY-Anfragen","Jobs"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Hotel","Bürogebäude","Arztpraxis","Einzelhandel","Wohnungsbaugesellschaft","Bauunternehmen","Facility Management","Gewerbeimmobilienverwaltung"],negativeKeywords:["privat","selber streichen","diy","job","ausbildung","kleinanzeigen","forum"],badFitSignals:["privat","diy","job","kleinanzeige","selbst streichen"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft"],"Gewerbe":["Hotel","Bürogebäude","Einzelhandel","Gewerbepark"],"Bau":["Bauunternehmen","Facility Management","Generalunternehmer"]},scoringSignals:["verwaltung","mieterwechsel","objekt","hotel","gewerbe","bau","renovierung","wohnanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Hotel","Bauunternehmen","Bürogebäude","Einzelhandel"]},
  elektro_gebaeudetechnik:{id:"elektro_gebaeudetechnik",label:"Elektro / Gebäudetechnik",ownServices:["Elektroinstallation","Gebäudetechnik","Wartung","E-Check","Beleuchtung","Netzwerktechnik","Smart Building","Sicherheitstechnik","Photovoltaik","Ladestationen"],targetCustomerTypes:["Hausverwaltungen","Gewerbeobjekte","Industriebetriebe","Hotels","Bürogebäude","Bauunternehmen","Facility Management Firmen","Einzelhandel","Wohnungsbaugesellschaften","Praxen"],excludedCustomerTypes:["Privathaushalte","Kleinstreparaturen","Jobs","DIY-Anfragen"],searchableBusinessCategories:["Hausverwaltung","Gewerbeimmobilie","Industrieunternehmen","Hotel","Bürogebäude","Bauunternehmen","Facility Management","Einzelhandel","Wohnungsbaugesellschaft","Arztpraxis"],negativeKeywords:["privat","diy","job","karriere","ausbildung","forum"],badFitSignals:["privat","diy","job","forum","hobby"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Wohnungsbaugesellschaft","Gewerbeimmobilie"],"Gewerbe":["Bürogebäude","Hotel","Einzelhandel","Gewerbepark"],"Industrie":["Industrieunternehmen","Bauunternehmen","Facility Management"]},scoringSignals:["technik","gebäude","wartung","gewerbe","industrie","verwaltung","objekt","anlage"],queryPriority:["Hausverwaltung","Industrieunternehmen","Hotel","Bürogebäude","Bauunternehmen","Facility Management"]},
  shk:{id:"shk",label:"SHK / Sanitär / Heizung / Klima",ownServices:["Sanitär","Heizung","Klima","Wartung","Badsanierung","Rohrreinigung","Notdienst","Heizungsmodernisierung","Lüftungstechnik"],targetCustomerTypes:["Hausverwaltungen","Hotels","Pflegeheime","Gewerbeobjekte","Bürogebäude","Wohnungsbaugesellschaften","Facility Management Firmen","Industriebetriebe","Praxen","Gastronomiebetriebe"],excludedCustomerTypes:["Privathaushalte","Kleinstreparaturen","DIY","Jobs"],searchableBusinessCategories:["Hausverwaltung","Hotel","Pflegeheim","Gewerbeimmobilie","Bürogebäude","Wohnungsbaugesellschaft","Facility Management","Industrieunternehmen","Arztpraxis","Gastronomie"],negativeKeywords:["privat","diy","job","ausbildung","forum","selber machen"],badFitSignals:["privat","diy","job","forum","selbst"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Wohnungsbaugesellschaft","Gewerbeimmobilie"],"Gewerbe":["Hotel","Bürogebäude","Gastronomie","Gewerbepark"],"Pflege":["Pflegeheim","Seniorenheim","Facility Management"]},scoringSignals:["wartung","heizung","sanitär","gewerbe","hotel","pflege","verwaltung","objekt","anlage"],queryPriority:["Hausverwaltung","Hotel","Pflegeheim","Bürogebäude","Industrieunternehmen","Gastronomie"]},
  eventservice:{id:"eventservice",label:"Eventservice",ownServices:["Eventtechnik","Veranstaltungsservice","Aufbau","Abbau","Personal","Ton- und Lichttechnik","Messebau","Bühnenbau","Eventlogistik"],targetCustomerTypes:["Eventlocations","Messeveranstalter","Hotels","Unternehmen","Marketingagenturen","Stadtverwaltungen","Vereine mit Budget","Kongresszentren","Seminarzentren","Veranstalter"],excludedCustomerTypes:["private Geburtstage","Privatfeiern","Hochzeiten privat","Kleinanzeigen","Jobs"],searchableBusinessCategories:["Eventlocation","Messeveranstalter","Hotel","Marketingagentur","Kongresszentrum","Seminarzentrum","Veranstalter","Messezentrum","Eventhalle","Tagungszentrum"],negativeKeywords:["privat","geburtstag","hochzeit","kleinanzeigen","job","karriere","familienfeier"],badFitSignals:["privat","geburtstag","hochzeit","job","familienfeier"],searchKeywordVariants:{"Event":["Eventlocation","Veranstalter","Kongresszentrum","Eventhalle"],"Messe":["Messeveranstalter","Messezentrum","Messebau"],"Business":["Tagungshotel","Marketingagentur","Seminarzentrum"]},scoringSignals:["event","messe","kongress","veranstaltung","hotel","agentur","b2b","tagung","bühne"],queryPriority:["Eventlocation","Kongresszentrum","Messeveranstalter","Hotel","Seminarzentrum","Marketingagentur"]},
  marketing_webdesign_werbung:{id:"marketing_webdesign_werbung",label:"Marketing / Webdesign / Werbung",ownServices:["Webdesign","SEO","Google Ads","Social Media","Branding","Grafikdesign","Online Marketing","Performance Marketing","Local SEO","Landingpages"],targetCustomerTypes:["Handwerksbetriebe","Arztpraxen","Steuerberater","Kanzleien","Restaurants","Hotels","Immobilienmakler","lokale Dienstleister","Fitnessstudios","Einzelhandel"],excludedCustomerTypes:["Privatpersonen","Vereine ohne Budget","Hobbyprojekte","Jobs"],searchableBusinessCategories:["Handwerksbetrieb","Arztpraxis","Steuerberater","Rechtsanwalt","Restaurant","Hotel","Immobilienmakler","Fitnessstudio","Einzelhandel","Unternehmensberatung","Zahnarztpraxis","Autohaus","Bauunternehmen"],negativeKeywords:["privat","hobby","gratis","job","karriere","ehrenamt"],badFitSignals:["privat","hobby","gratis","job","ehrenamt"],searchKeywordVariants:{"Lokale Dienstleister":["Handwerksbetrieb","Arztpraxis","Restaurant","Fitnessstudio"],"Beratung":["Steuerberater","Rechtsanwalt","Unternehmensberatung"],"Handel":["Einzelhandel","Autohaus","Hotel"]},scoringSignals:["lokal","dienstleister","praxis","kanzlei","hotel","shop","restaurant","handwerk","immobilien"],queryPriority:["Handwerksbetrieb","Arztpraxis","Restaurant","Steuerberater","Hotel","Fitnessstudio","Einzelhandel"]},
  personal_zeitarbeit:{id:"personal_zeitarbeit",label:"Personal / Zeitarbeit",ownServices:["Zeitarbeit","Personalvermittlung","Recruiting","Arbeitnehmerüberlassung","Fachkräftevermittlung","Aushilfspersonal","Industriepersonal","Pflegepersonal","Logistikpersonal"],targetCustomerTypes:["Logistikunternehmen","Industriebetriebe","Produktionsbetriebe","Pflegeheime","Hotels","Gastronomie","Bauunternehmen","Lagerbetriebe","Reinigungsunternehmen","Einzelhandel","Callcenter"],excludedCustomerTypes:["Jobsuchende","Bewerber","Privatpersonen","Vereine"],searchableBusinessCategories:["Logistikunternehmen","Industrieunternehmen","Produktionsbetrieb","Pflegeheim","Hotel","Gastronomie","Bauunternehmen","Lagerbetrieb","Reinigungsunternehmen","Einzelhandel","Callcenter"],negativeKeywords:["bewerbung","jobs","stellenangebot","karriere","ausbildung","praktikum","job suche"],badFitSignals:["bewerbung","job","karriere","praktikum","stellengesuch","jobsuche"],searchKeywordVariants:{"Industrie":["Industrieunternehmen","Produktionsbetrieb","Maschinenbau"],"Logistik":["Logistikunternehmen","Lagerbetrieb","Spedition"],"Pflege":["Pflegeheim","Seniorenheim","Klinik","Pflegedienst"],"Gastronomie":["Hotel","Gastronomie","Restaurant"]},scoringSignals:["produktion","logistik","pflege","hotel","schicht","lager","personalbedarf","industrie"],queryPriority:["Logistikunternehmen","Industrieunternehmen","Pflegeheim","Produktionsbetrieb","Hotel","Gastronomie"]},
  buchhaltung_steuernahe_dienste:{id:"buchhaltung_steuernahe_dienste",label:"Buchhaltung / steuernahe Dienste",ownServices:["Buchhaltung","Lohnbuchhaltung","Belegsortierung","Rechnungswesen","Controlling","Büroservice","vorbereitende Buchhaltung","Finanzorganisation"],targetCustomerTypes:["Kleinunternehmen","Handwerksbetriebe","Gastronomie","Einzelhandel","Startups","Freiberufler","Pflegedienste","Immobilienverwaltungen","Agenturen","Dienstleister"],excludedCustomerTypes:["Privatpersonen","Steuerberatungssuchende mit Rechtsberatungserwartung","Jobs","Vereine ohne Budget"],searchableBusinessCategories:["Handwerksbetrieb","Restaurant","Einzelhandel","Pflegedienst","Immobilienverwaltung","Agentur","Dienstleister","Gastronomie","Unternehmensberatung","Bauunternehmen"],negativeKeywords:["privat","job","karriere","ausbildung","kostenlos","forum"],badFitSignals:["privat","forum","job","kostenlos","selbst"],searchKeywordVariants:{"Lokale Unternehmen":["Handwerksbetrieb","Restaurant","Einzelhandel","Gastronomie"],"Dienstleister":["Agentur","Pflegedienst","Immobilienverwaltung"],"Beratung":["Unternehmensberatung","Dienstleister","Bauunternehmen"]},scoringSignals:["unternehmen","handel","handwerk","agentur","shop","dienstleister","pflege","büro"],queryPriority:["Handwerksbetrieb","Restaurant","Einzelhandel","Pflegedienst","Agentur","Immobilienverwaltung"]},
  industrieservice:{id:"industrieservice",label:"Industrieservice",ownServices:["Maschinenreinigung","Industriewartung","Anlagenservice","Werkshallenreinigung","Produktionsunterstützung","Technischer Service","Instandhaltung","Sonderreinigung"],targetCustomerTypes:["Produktionsbetriebe","Maschinenbauunternehmen","Metallbauunternehmen","Logistikzentren","Chemiebetriebe","Lebensmittelproduktion","Industrieparks","Werkshallen","Automobilzulieferer","Kunststoffverarbeitung"],excludedCustomerTypes:["Privatpersonen","kleine Werkstätten ohne Budget","Jobs"],searchableBusinessCategories:["Produktionsbetrieb","Maschinenbau","Metallbau","Logistikzentrum","Chemiebetrieb","Lebensmittelhersteller","Industriepark","Automobilzulieferer","Kunststoffverarbeitung","Industrieunternehmen"],negativeKeywords:["privat","job","karriere","ausbildung","hobbywerkstatt"],badFitSignals:["privat","hobby","job","klein","werkstatt privat"],searchKeywordVariants:{"Produktion":["Produktionsbetrieb","Industrieunternehmen","Lebensmittelhersteller"],"Technik":["Maschinenbau","Metallbau","Kunststoffverarbeitung","Automobilzulieferer"],"Standorte":["Industriepark","Logistikzentrum","Chemiebetrieb"]},scoringSignals:["produktion","industrie","maschine","anlage","werk","halle","wartung","technik"],queryPriority:["Produktionsbetrieb","Industrieunternehmen","Maschinenbau","Logistikzentrum","Metallbau","Lebensmittelhersteller"]},
  fuhrparkservice_fahrzeugpflege:{id:"fuhrparkservice_fahrzeugpflege",label:"Fuhrparkservice / Fahrzeugpflege",ownServices:["Fahrzeugpflege","Fuhrparkreinigung","Innenreinigung","Außenreinigung","Aufbereitung","Hol- und Bringservice","Flottenservice","Smart Repair","Reifenservice"],targetCustomerTypes:["Autohäuser","Taxiunternehmen","Pflegedienste","Handwerksbetriebe","Logistikunternehmen","Speditionen","Mietwagenfirmen","Fahrschulen","Flottenbetreiber","Lieferdienste","Kommunale Betriebe"],excludedCustomerTypes:["Privatfahrzeuge","Einmalige Kleinaufträge","Kleinanzeigen","Jobs"],searchableBusinessCategories:["Autohaus","Taxiunternehmen","Pflegedienst","Handwerksbetrieb","Logistikunternehmen","Spedition","Mietwagenfirma","Fahrschule","Lieferdienst","Kommunaler Betrieb","Fuhrparkbetrieb"],negativeKeywords:["privat","gebrauchtwagen privat","job","kleinanzeigen","selber reinigen","auto privat verkaufen"],badFitSignals:["privat","kleinanzeige","job","einzelfahrzeug","gebrauchtwagen privat"],searchKeywordVariants:{"Flotte":["Taxiunternehmen","Pflegedienst","Lieferdienst","Mietwagenfirma"],"Auto":["Autohaus","Fahrschule","Fuhrparkbetrieb"],"Gewerbe":["Handwerksbetrieb","Logistikunternehmen","Spedition"]},scoringSignals:["flotte","fahrzeuge","lieferung","taxi","pflege","autohaus","logistik","fuhrpark"],queryPriority:["Autohaus","Taxiunternehmen","Logistikunternehmen","Handwerksbetrieb","Pflegedienst","Mietwagenfirma"]},
  pflege_betreuung:{id:"pflege_betreuung",label:"Pflege / Betreuung",ownServices:["Pflege","Betreuung","Alltagsbegleitung","Seniorenbetreuung","Ambulante Pflege","Haushaltshilfe","Entlastungsleistungen","Demenzbetreuung"],targetCustomerTypes:["Pflegeheime","Seniorenresidenzen","Betreutes Wohnen","Kliniken","Reha-Zentren","Sozialdienste","Betreuungsvereine","Ärztehäuser","Pflegedienste","Kommunale Sozialstellen"],excludedCustomerTypes:["Privatpersonen ohne Leistungsrahmen","Jobs","Foren","Selbsthilfe ohne Budget"],searchableBusinessCategories:["Pflegeheim","Seniorenresidenz","Betreutes Wohnen","Klinik","Reha Zentrum","Sozialdienst","Betreuungsverein","Ärztehaus","Pflegedienst","Sozialstation"],negativeKeywords:["job","karriere","ausbildung","forum","privat","erfahrung","selbsthilfe"],badFitSignals:["job","forum","privat","erfahrung","selbsthilfe"],searchKeywordVariants:{"Senioren":["Pflegeheim","Seniorenresidenz","Betreutes Wohnen","Altenheim"],"Medizin":["Klinik","Reha Zentrum","Ärztehaus","Pflegedienst"],"Sozial":["Sozialdienst","Betreuungsverein","Sozialstation"]},scoringSignals:["pflege","senioren","betreuung","sozial","reha","klinik","wohnen","station"],queryPriority:["Pflegeheim","Seniorenresidenz","Klinik","Reha Zentrum","Sozialdienst","Pflegedienst"]},
  schulungen_weiterbildung:{id:"schulungen_weiterbildung",label:"Schulungen / Weiterbildung",ownServices:["Schulungen","Weiterbildung","Seminare","Mitarbeiterschulung","Arbeitssicherheit","Verkaufstraining","IT-Schulung","Führungskräftetraining","Pflichtunterweisungen"],targetCustomerTypes:["Unternehmen","Industriebetriebe","Pflegeheime","Hotels","Logistikunternehmen","Handwerksbetriebe","Bildungsträger","Kommunen","Schulen","Einzelhandel","Callcenter"],excludedCustomerTypes:["Privatpersonen","Schülernachhilfe privat","Hobbykurse","Jobs"],searchableBusinessCategories:["Industrieunternehmen","Pflegeheim","Hotel","Logistikunternehmen","Handwerksbetrieb","Bildungsträger","Schule","Einzelhandel","Callcenter","Unternehmensberatung","Produktionsbetrieb"],negativeKeywords:["privat","nachhilfe","hobby","job","karriere","kostenlos"],badFitSignals:["privat","nachhilfe","hobby","job","kostenlos"],searchKeywordVariants:{"Industrie":["Industrieunternehmen","Logistikunternehmen","Produktionsbetrieb"],"Sozial":["Pflegeheim","Hotel","Einzelhandel","Callcenter"],"Öffentlich":["Bildungsträger","Schule","Handwerksbetrieb"]},scoringSignals:["mitarbeiter","schulung","industrie","pflege","logistik","compliance","unternehmen","betrieb"],queryPriority:["Industrieunternehmen","Pflegeheim","Hotel","Logistikunternehmen","Handwerksbetrieb","Bildungsträger"]},
};

const LEGACY_INDUSTRY_MAP = {
  "Gebäudereinigung":"gebaeudereinigung","Gartenbau / Gartenpflege":"gartenbau","Gartenbau":"gartenbau",
  "Hausmeisterdienst / Facility Service":"facility_service","Facility Service":"facility_service","Hausmeisterdienst":"facility_service",
  "Sicherheitsdienst":"sicherheitsdienst","IT-Service":"it_service","Handwerk":"handwerk",
  "Maler / Renovierung":"maler_renovierung","Maler":"maler_renovierung","Renovierung":"maler_renovierung",
  "Elektro / Gebäudetechnik":"elektro_gebaeudetechnik","Elektro":"elektro_gebaeudetechnik","Gebäudetechnik":"elektro_gebaeudetechnik",
  "SHK / Sanitär / Heizung / Klima":"shk","SHK":"shk","Sanitär":"shk","Heizung":"shk",
  "Catering":"catering","Spedition / Logistik":"spedition_logistik","Spedition":"spedition_logistik","Logistik":"spedition_logistik",
  "Gesundheit / Medizin":"gesundheit_medizin","Gesundheit":"gesundheit_medizin","Immobilien":"immobilien",
  "Personal / Zeitarbeit":"personal_zeitarbeit","Marketing / Webdesign / Werbung":"marketing_webdesign_werbung","Marketing":"marketing_webdesign_werbung",
  "Pflege / Betreuung":"pflege_betreuung","Pflege":"pflege_betreuung","Schulungen / Weiterbildung":"schulungen_weiterbildung","Schulungen":"schulungen_weiterbildung",
  "Industrieservice":"industrieservice","Entrümpelung":"entruempelung","Buchhaltung":"buchhaltung_steuernahe_dienste",
  "Fuhrparkservice / Fahrzeugpflege":"fuhrparkservice_fahrzeugpflege","Fuhrparkservice":"fuhrparkservice_fahrzeugpflege",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normStr(str) {
  return String(str || "").toLowerCase()
    .replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

function normalizeIndustryId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (TAXONOMY_DATA[str]) return str;
  if (LEGACY_INDUSTRY_MAP[str]) return LEGACY_INDUSTRY_MAP[str];
  const lower = str.toLowerCase();
  const directMatch = Object.keys(TAXONOMY_DATA).find(k => k.toLowerCase() === lower);
  if (directMatch) return directMatch;
  return str;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function isLikelyChain(candidate) {
  const chainKeywords = ['aldi','lidl','penny','netto','rewe','edeka','kaufland','dm','rossmann','h&m','zara','primark','deichmann','deutsche post','dhl','sparkasse','deutsche bank','commerzbank','mcdonalds','burger king','subway','kfc','starbucks','hilton','marriott','ibis','motel one','fitx','mcfit','fitness first','fielmann','apollo optik','telekom','vodafone','ikea','obi','bauhaus','hornbach','franchise','kette','filialen','konzern'];
  const nameLower = normStr(candidate.name || '');
  for (const kw of chainKeywords) if (nameLower.includes(kw)) return { isChain: true, reason: `Kette: ${kw}` };
  if ((candidate.user_ratings_total || 0) > 1500) return { isChain: true, reason: `>1500 Bewertungen` };
  return { isChain: false };
}

function isBadFit(candidate, profile) {
  const text = normStr([candidate.name, (candidate.types||[]).join(' '), candidate.vicinity||''].join(' '));
  for (const kw of (profile?.negativeKeywords || [])) if (text.includes(normStr(kw))) return { bad: true, reason: `NegKw: "${kw}"` };
  for (const s of (profile?.badFitSignals || [])) if (text.includes(normStr(s))) return { bad: true, reason: `BadFit: "${s}"` };
  return { bad: false };
}

function scoreCandidate(candidate, profile, distanceKm, radiusKm, category) {
  const text = normStr([candidate.name, (candidate.types||[]).join(' '), candidate.vicinity||'', candidate.formatted_address||''].join(' '));
  let score = 50;
  const reasons = [];
  let matched_search_category = category || null;
  let matched_target_customer_type = null;

  if (!matched_search_category) {
    for (const cat of (profile?.searchableBusinessCategories || [])) {
      const variants = profile?.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat];
      for (const v of variants) if (text.includes(normStr(v))) { matched_search_category = cat; break; }
      if (matched_search_category) break;
    }
  }
  if (matched_search_category) { score += 20; reasons.push(`Cat:${matched_search_category}`); }
  for (const s of (profile?.scoringSignals || [])) if (text.includes(normStr(s))) { score += 15; reasons.push(`Sig:${s}`); break; }
  if (candidate.formatted_phone_number || candidate.international_phone_number) { score += 10; reasons.push("Tel"); }
  if (candidate.website) { score += 10; reasons.push("Web"); }
  if (distanceKm !== null && distanceKm <= radiusKm) { score += 10; }

  // Zielkunden-Match aus targetCustomerTypes des Profils
  for (const tc of (profile?.targetCustomerTypes || [])) {
    if (text.includes(normStr(tc))) { matched_target_customer_type = tc; score += 5; reasons.push(`TC:${tc}`); break; }
  }

  const badFit = isBadFit(candidate, profile);
  if (badFit.bad) { score -= 40; reasons.push(`BadFit:${badFit.reason}`); }

  score = Math.max(0, Math.min(100, score));
  return {
    score,
    matched_search_category,
    matched_target_customer_type,
    relevance_reason: reasons.join(' | ') || 'Base',
    shouldSave: score >= 55 && !badFit.bad,
  };
}

/**
 * Baut strukturierte Queries mit Metadaten:
 * - family: Keyword-Familie aus searchKeywordVariants
 * - weight: Prioritäts-Gewicht (höher = wichtiger)
 * - matched_target_customer: Welche targetCustomerType hat diese Query ausgelöst
 * - city_mode: 'geo_only' wenn Coords bekannt (keine Stadt im Query nötig),
 *              'keyword_with_city' für Fallback ohne Geo
 * - excluded_terms_applied: true wenn Ausschluss-Filter angewendet wurde
 */
function buildQueriesForIndustry(industry, targetCustomerTypes, excludedCustomerTypes, trialStage, hasGeoCoords) {
  const industryId = normalizeIndustryId(industry);
  const profile = TAXONOMY_DATA[industryId] || null;
  const queries = [];
  const seen = new Set();
  const maxQ = trialStage === 'free_preview' ? 5 : 20;
  const excludedNorm = excludedCustomerTypes.map(e => normStr(e));
  // Wenn Geo-Koordinaten vorhanden → Stadt NICHT in den Query-String (Google nutzt locationBias)
  const cityMode = hasGeoCoords ? 'geo_only' : 'keyword_with_city';

  const familiesUsed = new Set();

  if (profile) {
    // Ausschlüsse auf Kategorien anwenden
    const usedCats = (profile.searchableBusinessCategories || []).filter(c => {
      const cn = normStr(c);
      const isExcluded = excludedNorm.some(ex => cn.includes(ex) || ex.includes(cn));
      return !isExcluded;
    });

    // Nutzer-definierte Zielkunden → höchste Priorität (weight: 10)
    let prioritized = [];
    if (targetCustomerTypes.length > 0) {
      const userPrio = [];
      for (const tc of targetCustomerTypes) {
        const tcNorm = normStr(tc);
        for (const cat of usedCats) {
          if (normStr(cat).includes(tcNorm) || tcNorm.includes(normStr(cat))) {
            if (!userPrio.includes(cat)) userPrio.push(cat);
          }
        }
      }
      const staticPrio = (profile.queryPriority || []).filter(c => usedCats.includes(c) && !userPrio.includes(c));
      const rest = usedCats.filter(c => !userPrio.includes(c) && !staticPrio.includes(c));
      prioritized = [...userPrio, ...staticPrio, ...rest];
    } else {
      const staticPrio = (profile.queryPriority || []).filter(c => usedCats.includes(c));
      const rest = usedCats.filter(c => !(profile.queryPriority || []).includes(c));
      prioritized = [...staticPrio, ...rest];
    }

    const maxVariants = trialStage === 'free_preview' ? 2 : 3;
    for (const cat of prioritized) {
      if (queries.length >= maxQ) break;
      // Familie bestimmen: welche searchKeywordVariants-Gruppe enthält diese Kategorie?
      let family = cat;
      for (const [fam, variants] of Object.entries(profile.searchKeywordVariants || {})) {
        if (variants.includes(cat) || fam === cat) { family = fam; break; }
      }
      const variants = (profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat]).slice(0, maxVariants);
      const weight = (profile.queryPriority || []).indexOf(cat) >= 0
        ? 10 - (profile.queryPriority || []).indexOf(cat)
        : 1;
      const isUserMatched = targetCustomerTypes.some(tc => {
        const tcNorm = normStr(tc);
        return normStr(cat).includes(tcNorm) || tcNorm.includes(normStr(cat));
      });
      const excludedTermsApplied = excludedNorm.some(ex => normStr(cat).includes(ex) || ex.includes(normStr(cat)));

      for (const v of variants) {
        if (!seen.has(v)) {
          seen.add(v);
          familiesUsed.add(family);
          queries.push({
            query: v,
            category: cat,
            variant: v,
            family,
            weight,
            source: isUserMatched ? 'user_target' : 'taxonomy',
            city_mode: cityMode,
            matched_target_customer: isUserMatched ? targetCustomerTypes.find(tc => {
              const tcNorm = normStr(tc);
              return normStr(cat).includes(tcNorm) || tcNorm.includes(normStr(cat));
            }) : null,
            excluded_terms_applied: excludedTermsApplied,
          });
        }
        if (queries.length >= maxQ) break;
      }
    }
  }

  // Fallback: Nutzer-Zielkunden direkt wenn Taxonomy leer
  if (queries.length === 0 && targetCustomerTypes.length > 0) {
    for (const tc of targetCustomerTypes.slice(0, maxQ)) {
      if (excludedNorm.some(ex => normStr(tc).includes(ex))) continue;
      if (!seen.has(tc)) {
        seen.add(tc);
        queries.push({
          query: tc, category: tc, variant: tc,
          family: tc, weight: 5, source: 'user_fallback',
          city_mode: cityMode,
          matched_target_customer: tc,
          excluded_terms_applied: false,
        });
      }
    }
  }

  return {
    queries,
    profile,
    queryFamiliesUsed: [...familiesUsed],
    cityMode,
  };
}

async function searchPlaces(query, coords, radiusMeters, apiKey) {
  const body = {
    textQuery: query,
    languageCode: "de",
    locationBias: { circle: { center: { latitude: coords.lat, longitude: coords.lng }, radius: Math.min(radiusMeters, 50000) } },
    maxResultCount: 20,
  };
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "Content-Type":"application/json","X-Goog-Api-Key":apiKey,"X-Goog-FieldMask":"places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types" },
    body: JSON.stringify(body),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.places || []).map(p => ({
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    types: p.types || [],
  }));
}

async function getPlaceDetails(placeId, apiKey) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=de`, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,nationalPhoneNumber,internationalPhoneNumber,websiteUri,location,addressComponents,types",
    },
  });
  if (!res.ok) return null;
  const p = await res.json();
  if (!p || p.error) return null;
  return {
    place_id: p.id,
    name: p.displayName?.text || "",
    formatted_address: p.formattedAddress || "",
    formatted_phone_number: p.nationalPhoneNumber || p.internationalPhoneNumber || "",
    website: p.websiteUri || "",
    geometry: { location: { lat: p.location?.latitude, lng: p.location?.longitude } },
    types: p.types || [],
    address_components: (p.addressComponents || []).map(c => ({ long_name: c.longText, types: c.types })),
  };
}

function extractAddress(components = []) {
  let plz = '', ort = '', strasse = '', hausnummer = '';
  for (const c of components) {
    if (c?.types?.includes('postal_code')) plz = c.long_name;
    if (c?.types?.includes('locality')) ort = c.long_name;
    if (c?.types?.includes('route')) strasse = c.long_name;
    if (c?.types?.includes('street_number')) hausnummer = c.long_name;
  }
  return { plz, ort, adresse: [strasse, hausnummer].filter(Boolean).join(' ') };
}

function getPeriodMonth() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth()+1).padStart(2,'0')}`;
}

async function upsertUsageLog(base44, organization_id, newLeads) {
  if (newLeads <= 0) return;
  const periodMonth = getPeriodMonth();
  const now = new Date().toISOString();
  const existing = await base44.asServiceRole.entities.UsageLog.filter({ organization_id, period_month: periodMonth });
  if (existing[0]) {
    await base44.asServiceRole.entities.UsageLog.update(existing[0].id, {
      leads_created: (existing[0].leads_created || 0) + newLeads,
      last_lead_generation_at: now,
    });
  } else {
    const start = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
    const end = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth()+1, 0, 23, 59, 59)).toISOString();
    await base44.asServiceRole.entities.UsageLog.create({
      organization_id, period_month: periodMonth,
      period_start: start, period_end: end,
      leads_created: newLeads, lead_generations_used: 1,
      last_lead_generation_at: now,
    });
  }
}

// ── MAIN ─────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const startedAt = Date.now();
  const MAX_BATCH_MS = 18000;

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Nicht eingeloggt', success: false }, { status: 401 });

    const body = await req.json();
    const { research_run_id, organization_id } = body;
    if (!research_run_id || !organization_id) {
      return Response.json({ error: 'research_run_id und organization_id erforderlich', success: false }, { status: 400 });
    }

    // ── ResearchRun laden ────────────────────────────────────────────────────
    const runs = await base44.asServiceRole.entities.ResearchRun.filter({ id: research_run_id });
    const run = runs[0];
    if (!run) return Response.json({ error: 'ResearchRun nicht gefunden', success: false }, { status: 404 });
    if (run.organization_id !== organization_id) return Response.json({ error: 'Ungültige organization_id', success: false }, { status: 403 });

    if (run.status === 'completed' || run.status === 'failed') {
      return Response.json({
        success: true, done: true, status: run.status,
        leads_saved: run.leads_saved || 0,
        progress_percent: run.progress_percent || 100,
        message: run.status === 'completed'
          ? `Recherche abgeschlossen: ${run.leads_saved || 0} neue Firmenkontakte gefunden.`
          : `Recherche fehlgeschlagen: ${run.error_message || 'Unbekannter Fehler'}`,
      });
    }

    // ── Suchplan aus ResearchRun lesen ───────────────────────────────────────
    let searchPlan;
    try {
      searchPlan = JSON.parse(run.search_plan_json || '{}');
    } catch {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'failed', error_message: 'Suchplan ungültig', finished_at: new Date().toISOString()
      });
      return Response.json({ success: false, error: 'Suchplan ungültig', done: true, status: 'failed' }, { status: 400 });
    }

    const {
      industry,
      city,
      radiusKm,
      radiusMeters,
      targetCustomerTypes = [],
      excludedCustomerTypes = [],
      trialStage,
      cityCoords,
      allPoints = [],
      allCenters = [],
      effectiveTarget,
    } = searchPlan;

    const hasGeoCoords = !!(cityCoords?.lat && cityCoords?.lng);
    const industryId = normalizeIndustryId(industry);

    // ── Queries bauen ────────────────────────────────────────────────────────
    const { queries: allQueries, profile, queryFamiliesUsed, cityMode } = buildQueriesForIndustry(
      industry, targetCustomerTypes, excludedCustomerTypes, trialStage, hasGeoCoords
    );

    if (allQueries.length === 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'failed',
        error_message: 'Keine Suchkategorien gefunden.',
        finished_at: new Date().toISOString(),
        zero_result_cause: 'no_queries_built',
      });
      return Response.json({ success: false, error: 'Keine Suchkategorien gefunden.', done: true, status: 'failed' });
    }

    // ── Status auf running setzen ────────────────────────────────────────────
    if (run.status === 'queued') {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'running',
        current_step: 'Firmenprofile werden gesucht…',
        progress_percent: 5,
        // Taxonomy-Metadaten beim ersten Batch speichern
        taxonomy_version: TAXONOMY_VERSION,
        industry_id: industryId,
        city_mode: cityMode,
        query_families_used: JSON.stringify(queryFamiliesUsed),
        search_queries_used: JSON.stringify(allQueries.map(q => ({
          query: q.query, family: q.family, weight: q.weight,
          source: q.source, city_mode: q.city_mode,
          matched_target_customer: q.matched_target_customer,
          excluded_terms_applied: q.excluded_terms_applied,
        }))),
        selected_target_customer_types: targetCustomerTypes.join(', '),
        selected_services: (searchPlan.services || []).join(', '),
        excluded_customer_types: excludedCustomerTypes.join(', '),
        search_centers_used: JSON.stringify(
          allCenters.length > 0 ? allCenters
          : cityCoords ? [{ lat: cityCoords.lat, lng: cityCoords.lng, city }]
          : []
        ),
      });
    }

    // ── Bereits gesehene Place-IDs laden (Idempotenz) ────────────────────────
    let seenPlaceIds = new Set();
    try { seenPlaceIds = new Set(JSON.parse(run.seen_place_ids || '[]')); } catch {}

    // ── Bereits gespeicherte Companies für Duplikat-Check ───────────────────
    const existing = await base44.asServiceRole.entities.Company.filter({ organization_id }, '-created_date', 500);
    const existingNames = new Set(existing.map(c => normStr(c.name || '')));

    const currentLeadsSaved = run.leads_saved || 0;
    const remaining = (effectiveTarget || 25) - currentLeadsSaved;

    if (remaining <= 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'completed', progress_percent: 100,
        current_step: 'Recherche abgeschlossen',
        finished_at: new Date().toISOString(),
      });
      return Response.json({ success: true, done: true, status: 'completed', leads_saved: currentLeadsSaved, progress_percent: 100 });
    }

    // ── Batch-Parameter ──────────────────────────────────────────────────────
    const batchIndex = run.batch_index || 0;
    const QUERIES_PER_BATCH = trialStage === 'free_preview' ? 2 : 3;
    const PLACE_DETAILS_PER_BATCH = 15;

    const batchStart = batchIndex * QUERIES_PER_BATCH;
    const batchQueries = allQueries.slice(batchStart, batchStart + QUERIES_PER_BATCH);

    if (batchQueries.length === 0) {
      const zeroResultCause = currentLeadsSaved === 0 ? 'all_queries_exhausted' : null;
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'completed', progress_percent: 100,
        current_step: currentLeadsSaved > 0 ? `${currentLeadsSaved} Firmenkontakte gefunden` : 'Keine neuen Kontakte gefunden',
        finished_at: new Date().toISOString(),
        ...(zeroResultCause ? { zero_result_cause: zeroResultCause } : {}),
      });
      return Response.json({ success: true, done: true, status: 'completed', leads_saved: currentLeadsSaved, progress_percent: 100 });
    }

    // ── Search Points ────────────────────────────────────────────────────────
    const basePoint = cityCoords ? { lat: cityCoords.lat, lng: cityCoords.lng, label:'center', centerLat: cityCoords.lat, centerLng: cityCoords.lng, centerCity: city } : null;
    const pointsToSearch = (allPoints.length > 0 ? allPoints : basePoint ? [basePoint] : []).slice(0, 3);

    if (pointsToSearch.length === 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'failed', error_message: 'Keine Suchkoordinaten verfügbar.',
        finished_at: new Date().toISOString(), zero_result_cause: 'no_geo_coords',
      });
      return Response.json({ success: false, error: 'Keine Suchkoordinaten.', done: true, status: 'failed' });
    }

    const pointRadiusMeters = Math.min(15000, Math.max(8000, radiusMeters / Math.max(pointsToSearch.length, 1)));

    let newLeadsSavedThisBatch = 0;
    let rawHitsThisBatch = 0;
    let dupSkippedThisBatch = 0;
    let noMatchThisBatch = 0;
    let outsideRadiusThisBatch = 0;
    let placeDetailsUsed = 0;

    outer:
    for (const point of pointsToSearch) {
      const pointCenter = {
        lat: point.centerLat || cityCoords?.lat,
        lng: point.centerLng || cityCoords?.lng,
        city: point.centerCity || city,
      };

      for (const qItem of batchQueries) {
        const { query, category, variant, family, matched_target_customer } = qItem;

        if (newLeadsSavedThisBatch + currentLeadsSaved >= effectiveTarget) break outer;
        if (Date.now() - startedAt > MAX_BATCH_MS) { console.warn('[processResearchRun] Batch time budget reached'); break outer; }

        const places = await searchPlaces(query, { lat: point.lat, lng: point.lng }, pointRadiusMeters, GOOGLE_PLACES_API_KEY);
        rawHitsThisBatch += places.length;

        for (const place of places) {
          if (newLeadsSavedThisBatch + currentLeadsSaved >= effectiveTarget) break outer;
          if (placeDetailsUsed >= PLACE_DETAILS_PER_BATCH) break outer;

          if (seenPlaceIds.has(place.place_id)) continue;
          seenPlaceIds.add(place.place_id);

          // Distanzcheck
          const placeLat = place.geometry?.location?.lat;
          const placeLng = place.geometry?.location?.lng;
          let distanceKm = null;
          if (placeLat && placeLng) {
            const centers = allCenters.length > 0 ? allCenters : (cityCoords ? [{ lat: cityCoords.lat, lng: cityCoords.lng }] : []);
            const nearAnyCenter = centers.some(sc => haversineKm(sc.lat, sc.lng, placeLat, placeLng) <= radiusKm * 1.05);
            if (!nearAnyCenter) { outsideRadiusThisBatch++; continue; }
            distanceKm = centers.length > 0
              ? Math.min(...centers.map(sc => haversineKm(sc.lat, sc.lng, placeLat, placeLng)))
              : null;
          }

          if (isLikelyChain(place).isChain) { noMatchThisBatch++; continue; }
          if (existingNames.has(normStr(place.name || ''))) { dupSkippedThisBatch++; continue; }

          // Scoring mit Taxonomy-Profil
          const scoring = profile
            ? scoreCandidate(place, profile, distanceKm, radiusKm, category)
            : { score: 60, matched_search_category: category, matched_target_customer_type: null, relevance_reason: `Legacy:${category}`, shouldSave: !isBadFit(place, {}).bad };

          if (!scoring.shouldSave) { noMatchThisBatch++; continue; }

          // Place Details
          const details = await getPlaceDetails(place.place_id, GOOGLE_PLACES_API_KEY);
          placeDetailsUsed++;
          const { plz, ort, adresse } = extractAddress(details?.address_components || []);

          // matched_service_context: welcher Service aus ownServices passt zum gefundenen Zielkunden?
          const matchedServiceContext = matched_target_customer
            ? (profile?.ownServices?.slice(0, 3) || []).join(', ')
            : (profile?.ownServices?.[0] || '');

          await base44.asServiceRole.entities.Company.create({
            organization_id,
            name: place.name || '',
            branche: scoring.matched_target_customer_type || matched_target_customer || scoring.matched_search_category || category,
            ort: ort || city,
            plz: plz || '',
            adresse: adresse || '',
            telefon: details?.formatted_phone_number || '',
            email: '',
            website: details?.website || '',
            latitude: details?.geometry?.location?.lat || placeLat || null,
            longitude: details?.geometry?.location?.lng || placeLng || null,
            quelle: 'Google Places API',
            status: 'Neu',
            is_hot: false,
            relevance_score: scoring.score,
            relevance_reason: scoring.relevance_reason,
            source_query: variant || query,
            distance_km: distanceKm !== null ? Math.round(distanceKm * 10) / 10 : null,
            search_center_city: pointCenter.city || city,
            search_center_lat: pointCenter.lat,
            search_center_lng: pointCenter.lng,
            search_radius_km: radiusKm,
            research_run_id,
            matched_target_customer_type: scoring.matched_target_customer_type || matched_target_customer || null,
            matched_service_context: matchedServiceContext || null,
          });

          existingNames.add(normStr(place.name || ''));
          newLeadsSavedThisBatch++;
          console.info(`[processResearchRun] SAVED "${place.name}" run=${research_run_id} batch=${batchIndex} score=${scoring.score} family=${family}`);
        }
      }
    }

    // ── Fortschritt ──────────────────────────────────────────────────────────
    const totalLeadsSaved = currentLeadsSaved + newLeadsSavedThisBatch;
    const nextBatchIndex = batchIndex + 1;
    const totalBatches = Math.ceil(allQueries.length / QUERIES_PER_BATCH);
    const progressPercent = Math.min(95, Math.round((nextBatchIndex / totalBatches) * 90) + 5);
    const isDone = nextBatchIndex >= totalBatches || totalLeadsSaved >= effectiveTarget;
    const zeroResultCause = isDone && totalLeadsSaved === 0
      ? (rawHitsThisBatch === 0 ? 'no_google_results' : dupSkippedThisBatch > 0 ? 'all_duplicates' : 'no_match_score')
      : null;

    // ── Usage Log ────────────────────────────────────────────────────────────
    if (newLeadsSavedThisBatch > 0) {
      await upsertUsageLog(base44, organization_id, newLeadsSavedThisBatch);
      if (trialStage === 'free_preview') {
        const orgs = await base44.asServiceRole.entities.Organization.filter({ id: organization_id });
        if (orgs[0]) {
          await base44.asServiceRole.entities.Organization.update(organization_id, {
            trial_leads_granted: (orgs[0].trial_leads_granted || 0) + newLeadsSavedThisBatch
          });
        }
      }
    }

    // ── ResearchRun updaten ──────────────────────────────────────────────────
    const newStatus = isDone ? 'completed' : 'running';
    const newStep = isDone
      ? (totalLeadsSaved > 0 ? `${totalLeadsSaved} neue Firmenkontakte gefunden` : 'Keine neuen Kontakte gefunden')
      : `Suche läuft… ${totalLeadsSaved} Kontakte bisher gefunden`;

    await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
      status: newStatus,
      leads_saved: totalLeadsSaved,
      duplicates_skipped: (run.duplicates_skipped || 0) + dupSkippedThisBatch,
      no_match_count: (run.no_match_count || 0) + noMatchThisBatch,
      outside_radius_count: (run.outside_radius_count || 0) + outsideRadiusThisBatch,
      raw_hits: (run.raw_hits || 0) + rawHitsThisBatch,
      progress_percent: isDone ? 100 : progressPercent,
      batch_index: nextBatchIndex,
      total_batches: totalBatches,
      current_step: newStep,
      seen_place_ids: JSON.stringify([...seenPlaceIds].slice(-500)),
      charged_lead_generation: totalLeadsSaved > 0,
      ...(isDone ? { finished_at: new Date().toISOString() } : {}),
      ...(isDone && zeroResultCause ? { zero_result_cause: zeroResultCause } : {}),
    });

    console.info(`[processResearchRun] Batch ${batchIndex} done: newSaved=${newLeadsSavedThisBatch} totalSaved=${totalLeadsSaved} done=${isDone} cityMode=${cityMode}`);

    return Response.json({
      success: true,
      done: isDone,
      status: newStatus,
      leads_saved: totalLeadsSaved,
      leads_saved_this_batch: newLeadsSavedThisBatch,
      progress_percent: isDone ? 100 : progressPercent,
      current_step: newStep,
      batch_index: nextBatchIndex,
      total_batches: totalBatches,
      message: newStep,
    });

  } catch (error) {
    console.error('[processResearchRun] Error:', error?.message, error?.stack);
    try {
      const base44b = createClientFromRequest(req);
      const body2 = await req.clone().json().catch(() => ({}));
      if (body2.research_run_id) {
        await base44b.asServiceRole.entities.ResearchRun.update(body2.research_run_id, {
          status: 'partial',
          error_message: error?.message,
          current_step: 'Fehler – Recherche teilweise abgeschlossen',
        });
      }
    } catch {}
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});