/**
 * processResearchRun
 * Verarbeitet einen ResearchRun in kleinen Batches.
 * Idempotent: doppelte Aufrufe erzeugen keine doppelten Companies.
 * Frontend pollt alle 2-3s und ruft diese Function auf.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
const SEARCH_ENGINE_VERSION = "v3-async";

// ── Taxonomy (vollständig – alle 23 Branchen, inline da keine lokalen Imports in Deno-Functions) ─
const LEAD_SEARCH_TAXONOMY = {
  gebaeudereinigung:{id:"gebaeudereinigung",label:"Gebäudereinigung",ownServices:["Büroreinigung","Treppenhausreinigung","Praxisreinigung","Fensterreinigung","Grundreinigung","Baureinigung","Sonderreinigung","Hausmeisterdienst","Winterdienst"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Bürogebäude","Arztpraxen","Zahnarztpraxen","Kitas","Schulen","Pflegeheime","Hotels","Autohäuser","Fitnessstudios","Gewerbehallen","Industriebetriebe"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Bürogebäude","Ärztehaus","Arztpraxis","Zahnarztpraxis","Kindertagesstätte","Schule","Pflegeheim","Seniorenheim","Hotel","Autohaus","Fitnessstudio","Gewerbepark","Industrieunternehmen","Einzelhandel","Supermarkt"],negativeKeywords:["privat","job","karriere","ausbildung","stellenangebot","minijob","kleinanzeigen","wohnung gesucht","mietgesuch"],badFitSignals:["privat","job","karriere","kleinanzeige","einzelperson","mietgesuch","ausbildung"],searchKeywordVariants:{"Hausverwaltung":["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Mietverwaltung"],"Arztpraxis":["Arztpraxis","Ärztehaus","Zahnarztpraxis","Medizinisches Versorgungszentrum"],"Pflegeheim":["Pflegeheim","Seniorenheim","Seniorenresidenz","Altenheim"],"Hotel":["Hotel","Gasthof","Pension"],"Gewerbe":["Gewerbepark","Bürogebäude","Industrieunternehmen","Gewerbehalle"],"Schule":["Schule","Gymnasium","Grundschule","Berufsschule"],"Kita":["Kindertagesstätte","Kita","Kindergarten","Krippe"]},scoringSignals:["verwaltung","gewerbe","praxis","hotel","pflege","industrie","facility","büro","objekt","standort","wohnanlage","immobilien"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Pflegeheim","Arztpraxis","Hotel","Bürogebäude","Schule","Kita"]},
  sicherheitsdienst:{id:"sicherheitsdienst",label:"Sicherheitsdienst",ownServices:["Objektschutz","Baustellenbewachung","Veranstaltungsschutz","Revierdienst","Werkschutz","Empfangsdienst"],targetCustomerTypes:["Baustellen","Bauunternehmen","Logistikzentren","Industriebetriebe","Veranstalter","Hotels","Einkaufszentren","Eventlocations"],searchableBusinessCategories:["Bauunternehmen","Logistikzentrum","Industrieunternehmen","Veranstalter","Eventlocation","Hotel","Einkaufszentrum","Parkhaus","Messeveranstalter","Gewerbepark","Einzelhandel","Facility Management"],negativeKeywords:["job","stellenangebot","ausbildung","security job","privat","ehrenamt","karriere"],badFitSignals:["job","karriere","privat","ehrenamt","ausbildung","bewerber"],searchKeywordVariants:{"Baustelle":["Bauunternehmen","Bauträger","Baustelle","Generalunternehmer"],"Event":["Eventlocation","Veranstalter","Messeveranstalter","Kongresszentrum"],"Industrie":["Industriebetrieb","Gewerbepark","Logistikzentrum","Produktionsbetrieb"],"Hotel":["Hotel","Tagungshotel","Kongresshotel"],"Einzelhandel":["Einkaufszentrum","Shopping Center","Einzelhandel"]},scoringSignals:["objektschutz","baustelle","logistik","industrie","veranstaltung","werkschutz","gewerbe","lager","messe"],queryPriority:["Bauunternehmen","Logistikzentrum","Industrieunternehmen","Hotel","Eventlocation","Einkaufszentrum"]},
  it_service:{id:"it_service",label:"IT-Service",ownServices:["IT-Support","Managed Services","Serverbetreuung","Netzwerkbetreuung","Microsoft 365","Cybersecurity","Cloud-Lösungen","Backup"],targetCustomerTypes:["Arztpraxen","Zahnarztpraxen","Steuerberater","Kanzleien","KMU","Schulen","Pflegeeinrichtungen","Handwerksbetriebe","Büros","Immobilienverwaltungen"],searchableBusinessCategories:["Arztpraxis","Zahnarztpraxis","Steuerberater","Rechtsanwalt","Kanzlei","Pflegeheim","Schule","Handwerksbetrieb","Büro","Einzelhandel","Immobilienverwaltung","Logistikunternehmen","Unternehmensberatung","Ingenieurbüro"],negativeKeywords:["privat","gaming","job","karriere","ausbildung","computerhilfe privat","forum","blog"],badFitSignals:["privat","gaming","job","forum","einzelperson","haushaltsgerät"],searchKeywordVariants:{"Praxen":["Arztpraxis","Zahnarztpraxis","Ärztehaus","Medizinisches Versorgungszentrum"],"Kanzleien":["Rechtsanwalt","Kanzlei","Anwaltskanzlei","Steuerberater","Steuerberatung"],"KMU":["Handwerksbetrieb","Unternehmensberatung","Ingenieurbüro","Bürogebäude"],"Bildung":["Schule","Gymnasium","Bildungszentrum"],"Pflege":["Pflegeheim","Seniorenheim","Reha Zentrum"]},scoringSignals:["praxis","kanzlei","steuer","pflege","schule","verwaltung","daten","büro","handwerk","logistik"],queryPriority:["Arztpraxis","Zahnarztpraxis","Steuerberater","Rechtsanwalt","Kanzlei","Handwerksbetrieb","Pflegeheim","Schule"]},
  gartenbau:{id:"gartenbau",label:"Gartenbau",ownServices:["Gartenpflege","Grünanlagenpflege","Rasenpflege","Heckenschnitt","Baumpflege","Winterdienst","Außenanlagenpflege"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Wohnanlagen","Hotels","Gewerbeparks","Pflegeheime","Kitas","Schulen"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Wohnanlage","Hotel","Gewerbepark","Pflegeheim","Kindertagesstätte","Schule","Facility Management","Bürogebäude","Industrieunternehmen","Friedhof"],negativeKeywords:["privatgarten","privat","job","karriere","kleinanzeigen","gratis","selber machen"],badFitSignals:["privat","kleinanzeige","job","einzelgarten","hobby","selbst"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnanlage","WEG Verwaltung"],"Gewerbe":["Gewerbepark","Bürogebäude","Industriebetrieb"],"Sozial":["Pflegeheim","Kita","Schule","Altenheim"],"Hotel":["Hotel","Tagungshotel","Gasthof"]},scoringSignals:["anlage","grünfläche","verwaltung","wohnanlage","gewerbe","hotel","pflege","objekt","außenanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Hotel","Pflegeheim","Gewerbepark","Schule","Kita"]},
  catering:{id:"catering",label:"Catering",ownServices:["Business Catering","Event Catering","Kita Catering","Schulverpflegung","Kantinenservice","Tagungsverpflegung"],targetCustomerTypes:["Eventlocations","Tagungshotels","Seminarzentren","Messeveranstalter","Kitas","Schulen","Pflegeheime","Hotels"],searchableBusinessCategories:["Eventlocation","Tagungshotel","Seminarzentrum","Messeveranstalter","Kongresszentrum","Bürogebäude","Kindertagesstätte","Schule","Pflegeheim","Hotel","Coworking Space","Veranstalter","Unternehmensberatung"],negativeKeywords:["privat","hochzeit","geburtstag","familienfeier","job","karriere","kleinanzeigen","selbst kochen"],badFitSignals:["privat","hochzeit","geburtstag","kleinanzeige","familienfeier","selbst"],searchKeywordVariants:{"Event":["Eventlocation","Veranstalter","Messeveranstalter","Kongresszentrum","Eventhalle"],"Business":["Bürogebäude","Unternehmensberatung","Coworking Space","Business Center"],"Bildung":["Kindertagesstätte","Schule","Seminarzentrum","Bildungszentrum"],"Hotel":["Tagungshotel","Kongresshotel","Hotel"]},scoringSignals:["event","tagung","messe","seminar","unternehmen","büro","kita","schule","hotel","kongress","veranstaltung"],queryPriority:["Eventlocation","Tagungshotel","Kongresszentrum","Seminarzentrum","Bürogebäude","Kita","Schule"]},
  handwerk:{id:"handwerk",label:"Handwerk",ownServices:["Reparaturen","Instandhaltung","Renovierung","Montage","Wartung","Notdienst","Objektbetreuung"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Bauunternehmen","Hotels","Bürogebäude","Einzelhandel","Wohnungsbaugesellschaften"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Bauunternehmen","Facility Management","Hotel","Arztpraxis","Bürogebäude","Einzelhandel","Wohnungsbaugesellschaft","Gewerbeimmobilienverwaltung"],negativeKeywords:["privat","selber machen","diy","job","ausbildung","karriere","kleinanzeigen","forum"],badFitSignals:["privat","diy","job","kleinanzeige","selbst"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft","WEG Verwaltung"],"Gewerbe":["Bürogebäude","Einzelhandel","Hotel","Gewerbepark"],"Bau":["Bauunternehmen","Facility Management","Generalunternehmer"]},scoringSignals:["verwaltung","objekt","instandhaltung","gewerbe","hotel","bau","facility","wohnanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Bauunternehmen","Hotel","Bürogebäude","Einzelhandel"]},
  spedition_logistik:{id:"spedition_logistik",label:"Spedition / Logistik",ownServices:["Transport","Kurierdienst","Expresslieferung","Stückgut","Palettentransport","Lagerlogistik"],targetCustomerTypes:["Online-Shops","Großhändler","Produktionsbetriebe","Industriebetriebe","Möbelhäuser","Baustoffhändler"],searchableBusinessCategories:["Großhandel","Produktionsbetrieb","Industrieunternehmen","Möbelhaus","Baustoffhandel","Maschinenbau","Lebensmittelgroßhandel","Eventagentur","Einzelhandel","Versandhandel","Handelsunternehmen","Küchenstudio"],negativeKeywords:["privat","umzug privat","job","fahrer gesucht","karriere","kleinanzeigen"],badFitSignals:["privat","job","kleinanzeige","einzeltransport","möbel privat"],searchKeywordVariants:{"E-Commerce":["Versandhandel","Online Händler","Handelsunternehmen"],"Industrie":["Produktionsbetrieb","Industrieunternehmen","Maschinenbau"],"Handel":["Großhandel","Möbelhaus","Baustoffhandel","Lebensmittelgroßhandel"],"Event":["Eventagentur","Messeveranstalter","Veranstaltungstechnik"]},scoringSignals:["versand","logistik","lager","großhandel","produktion","lieferung","handel","import","export"],queryPriority:["Großhandel","Produktionsbetrieb","Industrieunternehmen","Möbelhaus","Maschinenbau","Baustoffhandel"]},
  gesundheit_medizin:{id:"gesundheit_medizin",label:"Gesundheit / Medizin",ownServices:["medizinische Dienstleistung","Therapie","Pflegebezogene Dienstleistung","Praxisservice","Gesundheitsberatung"],targetCustomerTypes:["Arztpraxen","Zahnarztpraxen","Therapiezentren","Pflegeheime","Apotheken","Reha-Zentren","Physiotherapien"],searchableBusinessCategories:["Arztpraxis","Zahnarztpraxis","Therapiezentrum","Pflegeheim","Seniorenheim","Apotheke","Reha Zentrum","Privatklinik","Gesundheitszentrum","Physiotherapie","Ergotherapie","Ärztehaus"],negativeKeywords:["privat","forum","job","karriere","ausbildung","selbsthilfe","blog"],badFitSignals:["forum","privat","job","erfahrung","selbsthilfe","blog"],searchKeywordVariants:{"Praxis":["Arztpraxis","Zahnarztpraxis","Ärztehaus","Medizinisches Versorgungszentrum"],"Therapie":["Physiotherapie","Ergotherapie","Therapiezentrum","Logopädie"],"Pflege":["Pflegeheim","Seniorenheim","Reha Zentrum","Klinik"]},scoringSignals:["praxis","gesundheit","pflege","therapie","reha","klinik","zentrum","apotheke","medizin"],queryPriority:["Arztpraxis","Zahnarztpraxis","Pflegeheim","Physiotherapie","Therapiezentrum","Ärztehaus"]},
  immobilien:{id:"immobilien",label:"Immobilien",ownServices:["Vermietung","Verwaltung","Verkauf","Gewerbeimmobilien","Projektentwicklung","Immobilienberatung"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","WEG-Verwaltungen","Bauträger","Projektentwickler","Wohnungsbaugesellschaften"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Bauträger","Projektentwickler","Wohnungsbaugesellschaft","Immobiliengesellschaft","Gewerbeimmobilienverwaltung","Property Management","Facility Management Immobilien","Mietverwaltung"],negativeKeywords:["privat","wohnung gesucht","mietgesuch","ferienwohnung","airbnb","job","karriere","ausbildung","vermiete privat","suche wohnung"],badFitSignals:["privat","mietgesuch","wohnung gesucht","ferienwohnung","job","airbnb"],searchKeywordVariants:{"Hausverwaltung":["Hausverwaltung","WEG Verwaltung","Immobilienverwaltung","Mietverwaltung","Objektverwaltung"],"Bauträger":["Bauträger","Wohnbaugesellschaft","Projektentwickler Immobilien"],"Gewerbe":["Gewerbeimmobilienverwaltung","Property Management","Facility Management Immobilien"]},scoringSignals:["verwaltung","weg","gewerbeimmobilien","bestand","objektverwaltung","property management","projektentwicklung","bauträger","wohnanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","WEG Verwaltung","Bauträger","Wohnungsbaugesellschaft","Property Management"]},
  lager_fulfillment:{id:"lager_fulfillment",label:"Lager / Fulfillment",ownServices:["Fulfillment","Lagerung","Kommissionierung","Versandabwicklung","Retourenmanagement","E-Commerce Logistik"],targetCustomerTypes:["Online-Shops","Großhändler","E-Commerce-Unternehmen","Kosmetikmarken","Textilhändler","Importeure"],searchableBusinessCategories:["Versandhandel","Großhandel","Kosmetikmarke","Lebensmittelhersteller","Textilhandel","Ersatzteilhandel","Importeur","Handelsunternehmen","Modehändler","Online Händler"],negativeKeywords:["privat","kleinanzeigen","job","karriere","ausbildung","ebay privat","zu verschenken"],badFitSignals:["privat","kleinanzeige","job","kein bestand","zu verschenken"],searchKeywordVariants:{"E-Commerce":["Versandhandel","Online Händler","Handelsunternehmen"],"Handel":["Großhandel","Importeur","Textilhandel","Modehändler"],"Produkte":["Kosmetikmarke","Lebensmittelhersteller","Ersatzteilhandel"]},scoringSignals:["shop","versand","handel","import","retouren","lager","ecommerce","online"],queryPriority:["Großhandel","Versandhandel","Importeur","Handelsunternehmen","Textilhandel"]},
  facility_service:{id:"facility_service",label:"Facility Service",ownServices:["Hausmeisterdienst","Objektbetreuung","Gebäudemanagement","Technische Betreuung","Reinigung","Winterdienst","Grünpflege","Kleinreparaturen"],targetCustomerTypes:["Hausverwaltungen","Gewerbeimmobilien","Bürogebäude","Hotels","Pflegeheime","Industriebetriebe","Schulen","Kitas","Wohnanlagen"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Gewerbeimmobilie","Bürogebäude","Hotel","Pflegeheim","Industrieunternehmen","Schule","Kindertagesstätte","Wohnanlage","Gewerbepark"],negativeKeywords:["privat","job","karriere","ausbildung","kleinanzeigen"],badFitSignals:["privat","job","kleinanzeige","einzelperson"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnanlage","WEG Verwaltung"],"Gewerbe":["Bürogebäude","Gewerbeimmobilie","Industrieunternehmen","Gewerbepark"],"Sozial":["Pflegeheim","Schule","Kita","Altenheim"]},scoringSignals:["objekt","verwaltung","gewerbe","facility","wohnanlage","technisch","gebäude","standort"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Bürogebäude","Hotel","Pflegeheim","Gewerbepark"]},
  entruempelung:{id:"entruempelung",label:"Entrümpelung",ownServices:["Entrümpelung","Haushaltsauflösung","Wohnungsauflösung","Nachlassauflösung","Kellerentrümpelung","Gewerbeauflösung","Räumung"],targetCustomerTypes:["Hausverwaltungen","Nachlassverwalter","Betreuungsbüros","Pflegeheime","Rechtsanwälte Erbrecht","Sozialdienste"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Nachlassverwaltung","Betreuungsbüro","Immobilienmakler","Wohnungsbaugesellschaft","Pflegeheim","Seniorenheim","Rechtsanwalt Erbrecht","Sozialdienst"],negativeKeywords:["privat","sperrmüll kostenlos","kleinanzeigen","job","karriere","zu verschenken"],badFitSignals:["privat","kleinanzeige","zu verschenken","job","sperrmüll kostenlos"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft"],"Nachlass":["Nachlassverwaltung","Rechtsanwalt Erbrecht","Betreuungsbüro","Nachlassverwalter"],"Sozial":["Sozialdienst","Pflegeheim","Seniorenheim","Sozialstation"]},scoringSignals:["verwaltung","nachlass","betreuung","erbrecht","wohnung","pflege","sozialdienst","objekt"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Sozialdienst","Pflegeheim","Betreuungsbüro","Rechtsanwalt Erbrecht"]},
  maler_renovierung:{id:"maler_renovierung",label:"Maler / Renovierung",ownServices:["Malerarbeiten","Renovierung","Tapezieren","Lackieren","Fassadenanstrich","Innenausbau","Trockenbau"],targetCustomerTypes:["Hausverwaltungen","Immobilienverwaltungen","Hotels","Bürogebäude","Wohnungsbaugesellschaften","Bauunternehmen"],searchableBusinessCategories:["Hausverwaltung","Immobilienverwaltung","Hotel","Bürogebäude","Arztpraxis","Einzelhandel","Wohnungsbaugesellschaft","Bauunternehmen","Facility Management","Gewerbeimmobilienverwaltung"],negativeKeywords:["privat","selber streichen","diy","job","ausbildung","kleinanzeigen","forum"],badFitSignals:["privat","diy","job","kleinanzeige","selbst streichen"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Immobilienverwaltung","Wohnungsbaugesellschaft"],"Gewerbe":["Hotel","Bürogebäude","Einzelhandel","Gewerbepark"],"Bau":["Bauunternehmen","Facility Management","Generalunternehmer"]},scoringSignals:["verwaltung","mieterwechsel","objekt","hotel","gewerbe","bau","renovierung","wohnanlage"],queryPriority:["Hausverwaltung","Immobilienverwaltung","Hotel","Bauunternehmen","Bürogebäude","Einzelhandel"]},
  elektro_gebaeudetechnik:{id:"elektro_gebaeudetechnik",label:"Elektro / Gebäudetechnik",ownServices:["Elektroinstallation","Gebäudetechnik","Wartung","E-Check","Beleuchtung","Smart Building","Photovoltaik","Ladestationen"],targetCustomerTypes:["Hausverwaltungen","Gewerbeobjekte","Industriebetriebe","Hotels","Bürogebäude","Bauunternehmen","Wohnungsbaugesellschaften"],searchableBusinessCategories:["Hausverwaltung","Gewerbeimmobilie","Industrieunternehmen","Hotel","Bürogebäude","Bauunternehmen","Facility Management","Einzelhandel","Wohnungsbaugesellschaft","Arztpraxis"],negativeKeywords:["privat","diy","job","karriere","ausbildung","forum"],badFitSignals:["privat","diy","job","forum","hobby"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Wohnungsbaugesellschaft","Gewerbeimmobilie"],"Gewerbe":["Bürogebäude","Hotel","Einzelhandel","Gewerbepark"],"Industrie":["Industrieunternehmen","Bauunternehmen","Facility Management"]},scoringSignals:["technik","gebäude","wartung","gewerbe","industrie","verwaltung","objekt","anlage"],queryPriority:["Hausverwaltung","Industrieunternehmen","Hotel","Bürogebäude","Bauunternehmen","Facility Management"]},
  shk:{id:"shk",label:"SHK / Sanitär / Heizung / Klima",ownServices:["Sanitär","Heizung","Klima","Wartung","Badsanierung","Rohrreinigung","Notdienst","Heizungsmodernisierung"],targetCustomerTypes:["Hausverwaltungen","Hotels","Pflegeheime","Gewerbeobjekte","Bürogebäude","Wohnungsbaugesellschaften"],searchableBusinessCategories:["Hausverwaltung","Hotel","Pflegeheim","Gewerbeimmobilie","Bürogebäude","Wohnungsbaugesellschaft","Facility Management","Industrieunternehmen","Arztpraxis","Gastronomie"],negativeKeywords:["privat","diy","job","ausbildung","forum","selber machen"],badFitSignals:["privat","diy","job","forum","selbst"],searchKeywordVariants:{"Verwaltung":["Hausverwaltung","Wohnungsbaugesellschaft","Gewerbeimmobilie"],"Gewerbe":["Hotel","Bürogebäude","Gastronomie","Gewerbepark"],"Pflege":["Pflegeheim","Seniorenheim","Facility Management"]},scoringSignals:["wartung","heizung","sanitär","gewerbe","hotel","pflege","verwaltung","objekt","anlage"],queryPriority:["Hausverwaltung","Hotel","Pflegeheim","Bürogebäude","Industrieunternehmen","Gastronomie"]},
  eventservice:{id:"eventservice",label:"Eventservice",ownServices:["Eventtechnik","Veranstaltungsservice","Aufbau","Abbau","Ton- und Lichttechnik","Messebau","Bühnenbau"],targetCustomerTypes:["Eventlocations","Messeveranstalter","Hotels","Marketingagenturen","Kongresszentren","Seminarzentren"],searchableBusinessCategories:["Eventlocation","Messeveranstalter","Hotel","Marketingagentur","Kongresszentrum","Seminarzentrum","Veranstalter","Messezentrum","Eventhalle","Tagungszentrum"],negativeKeywords:["privat","geburtstag","hochzeit","kleinanzeigen","job","karriere","familienfeier"],badFitSignals:["privat","geburtstag","hochzeit","job","familienfeier"],searchKeywordVariants:{"Event":["Eventlocation","Veranstalter","Kongresszentrum","Eventhalle"],"Messe":["Messeveranstalter","Messezentrum","Messebau"],"Business":["Tagungshotel","Marketingagentur","Seminarzentrum"]},scoringSignals:["event","messe","kongress","veranstaltung","hotel","agentur","b2b","tagung","bühne"],queryPriority:["Eventlocation","Kongresszentrum","Messeveranstalter","Hotel","Seminarzentrum","Marketingagentur"]},
  marketing_webdesign_werbung:{id:"marketing_webdesign_werbung",label:"Marketing / Webdesign / Werbung",ownServices:["Webdesign","SEO","Google Ads","Social Media","Branding","Grafikdesign","Online Marketing","Local SEO"],targetCustomerTypes:["Handwerksbetriebe","Arztpraxen","Steuerberater","Kanzleien","Restaurants","Hotels","Fitnessstudios","Einzelhandel"],searchableBusinessCategories:["Handwerksbetrieb","Arztpraxis","Steuerberater","Rechtsanwalt","Restaurant","Hotel","Immobilienmakler","Fitnessstudio","Einzelhandel","Unternehmensberatung","Zahnarztpraxis","Autohaus","Bauunternehmen"],negativeKeywords:["privat","hobby","gratis","job","karriere","ehrenamt"],badFitSignals:["privat","hobby","gratis","job","ehrenamt"],searchKeywordVariants:{"Lokale Dienstleister":["Handwerksbetrieb","Arztpraxis","Restaurant","Fitnessstudio"],"Beratung":["Steuerberater","Rechtsanwalt","Unternehmensberatung"],"Handel":["Einzelhandel","Autohaus","Hotel"]},scoringSignals:["lokal","dienstleister","praxis","kanzlei","hotel","shop","restaurant","handwerk","immobilien"],queryPriority:["Handwerksbetrieb","Arztpraxis","Restaurant","Steuerberater","Hotel","Fitnessstudio","Einzelhandel"]},
  personal_zeitarbeit:{id:"personal_zeitarbeit",label:"Personal / Zeitarbeit",ownServices:["Zeitarbeit","Personalvermittlung","Recruiting","Arbeitnehmerüberlassung","Fachkräftevermittlung","Industriepersonal"],targetCustomerTypes:["Logistikunternehmen","Industriebetriebe","Produktionsbetriebe","Pflegeheime","Hotels","Gastronomie"],searchableBusinessCategories:["Logistikunternehmen","Industrieunternehmen","Produktionsbetrieb","Pflegeheim","Hotel","Gastronomie","Bauunternehmen","Lagerbetrieb","Reinigungsunternehmen","Einzelhandel","Callcenter"],negativeKeywords:["bewerbung","jobs","stellenangebot","karriere","ausbildung","praktikum","job suche"],badFitSignals:["bewerbung","job","karriere","praktikum","stellengesuch","jobsuche"],searchKeywordVariants:{"Industrie":["Industrieunternehmen","Produktionsbetrieb","Maschinenbau"],"Logistik":["Logistikunternehmen","Lagerbetrieb","Spedition"],"Pflege":["Pflegeheim","Seniorenheim","Klinik","Pflegedienst"],"Gastronomie":["Hotel","Gastronomie","Restaurant"]},scoringSignals:["produktion","logistik","pflege","hotel","schicht","lager","personalbedarf","industrie"],queryPriority:["Logistikunternehmen","Industrieunternehmen","Pflegeheim","Produktionsbetrieb","Hotel","Gastronomie"]},
  buchhaltung_steuernahe_dienste:{id:"buchhaltung_steuernahe_dienste",label:"Buchhaltung / steuernahe Dienste",ownServices:["Buchhaltung","Lohnbuchhaltung","Belegsortierung","Rechnungswesen","Controlling","Büroservice"],targetCustomerTypes:["Kleinunternehmen","Handwerksbetriebe","Gastronomie","Einzelhandel","Freiberufler","Pflegedienste","Immobilienverwaltungen"],searchableBusinessCategories:["Handwerksbetrieb","Restaurant","Einzelhandel","Pflegedienst","Immobilienverwaltung","Agentur","Dienstleister","Gastronomie","Unternehmensberatung","Bauunternehmen"],negativeKeywords:["privat","job","karriere","ausbildung","kostenlos","forum"],badFitSignals:["privat","forum","job","kostenlos","selbst"],searchKeywordVariants:{"Lokale Unternehmen":["Handwerksbetrieb","Restaurant","Einzelhandel","Gastronomie"],"Dienstleister":["Agentur","Pflegedienst","Immobilienverwaltung"],"Beratung":["Unternehmensberatung","Dienstleister","Bauunternehmen"]},scoringSignals:["unternehmen","handel","handwerk","agentur","shop","dienstleister","pflege","büro"],queryPriority:["Handwerksbetrieb","Restaurant","Einzelhandel","Pflegedienst","Agentur","Immobilienverwaltung"]},
  industrieservice:{id:"industrieservice",label:"Industrieservice",ownServices:["Maschinenreinigung","Industriewartung","Anlagenservice","Werkshallenreinigung","Technischer Service","Instandhaltung"],targetCustomerTypes:["Produktionsbetriebe","Maschinenbauunternehmen","Metallbauunternehmen","Logistikzentren","Chemiebetriebe"],searchableBusinessCategories:["Produktionsbetrieb","Maschinenbau","Metallbau","Logistikzentrum","Chemiebetrieb","Lebensmittelhersteller","Industriepark","Automobilzulieferer","Kunststoffverarbeitung","Industrieunternehmen"],negativeKeywords:["privat","job","karriere","ausbildung","hobbywerkstatt"],badFitSignals:["privat","hobby","job","klein","werkstatt privat"],searchKeywordVariants:{"Produktion":["Produktionsbetrieb","Industrieunternehmen","Lebensmittelhersteller"],"Technik":["Maschinenbau","Metallbau","Kunststoffverarbeitung","Automobilzulieferer"],"Standorte":["Industriepark","Logistikzentrum","Chemiebetrieb"]},scoringSignals:["produktion","industrie","maschine","anlage","werk","halle","wartung","technik"],queryPriority:["Produktionsbetrieb","Industrieunternehmen","Maschinenbau","Logistikzentrum","Metallbau","Lebensmittelhersteller"]},
  fuhrparkservice_fahrzeugpflege:{id:"fuhrparkservice_fahrzeugpflege",label:"Fuhrparkservice / Fahrzeugpflege",ownServices:["Fahrzeugpflege","Fuhrparkreinigung","Innenreinigung","Außenreinigung","Aufbereitung","Flottenservice"],targetCustomerTypes:["Autohäuser","Taxiunternehmen","Pflegedienste","Handwerksbetriebe","Logistikunternehmen","Speditionen","Mietwagenfirmen"],searchableBusinessCategories:["Autohaus","Taxiunternehmen","Pflegedienst","Handwerksbetrieb","Logistikunternehmen","Spedition","Mietwagenfirma","Fahrschule","Lieferdienst","Kommunaler Betrieb","Fuhrparkbetrieb"],negativeKeywords:["privat","gebrauchtwagen privat","job","kleinanzeigen","selber reinigen"],badFitSignals:["privat","kleinanzeige","job","einzelfahrzeug","gebrauchtwagen privat"],searchKeywordVariants:{"Flotte":["Taxiunternehmen","Pflegedienst","Lieferdienst","Mietwagenfirma"],"Auto":["Autohaus","Fahrschule","Fuhrparkbetrieb"],"Gewerbe":["Handwerksbetrieb","Logistikunternehmen","Spedition"]},scoringSignals:["flotte","fahrzeuge","lieferung","taxi","pflege","autohaus","logistik","fuhrpark"],queryPriority:["Autohaus","Taxiunternehmen","Logistikunternehmen","Handwerksbetrieb","Pflegedienst","Mietwagenfirma"]},
  pflege_betreuung:{id:"pflege_betreuung",label:"Pflege / Betreuung",ownServices:["Pflege","Betreuung","Alltagsbegleitung","Seniorenbetreuung","Ambulante Pflege","Haushaltshilfe"],targetCustomerTypes:["Pflegeheime","Seniorenresidenzen","Betreutes Wohnen","Kliniken","Reha-Zentren","Sozialdienste"],searchableBusinessCategories:["Pflegeheim","Seniorenresidenz","Betreutes Wohnen","Klinik","Reha Zentrum","Sozialdienst","Betreuungsverein","Ärztehaus","Pflegedienst","Sozialstation"],negativeKeywords:["job","karriere","ausbildung","forum","privat","erfahrung","selbsthilfe"],badFitSignals:["job","forum","privat","erfahrung","selbsthilfe"],searchKeywordVariants:{"Senioren":["Pflegeheim","Seniorenresidenz","Betreutes Wohnen","Altenheim"],"Medizin":["Klinik","Reha Zentrum","Ärztehaus","Pflegedienst"],"Sozial":["Sozialdienst","Betreuungsverein","Sozialstation"]},scoringSignals:["pflege","senioren","betreuung","sozial","reha","klinik","wohnen","station"],queryPriority:["Pflegeheim","Seniorenresidenz","Klinik","Reha Zentrum","Sozialdienst","Pflegedienst"]},
  schulungen_weiterbildung:{id:"schulungen_weiterbildung",label:"Schulungen / Weiterbildung",ownServices:["Schulungen","Weiterbildung","Seminare","Mitarbeiterschulung","Arbeitssicherheit","Verkaufstraining","Pflichtunterweisungen"],targetCustomerTypes:["Unternehmen","Industriebetriebe","Pflegeheime","Hotels","Logistikunternehmen","Handwerksbetriebe"],searchableBusinessCategories:["Industrieunternehmen","Pflegeheim","Hotel","Logistikunternehmen","Handwerksbetrieb","Bildungsträger","Schule","Einzelhandel","Callcenter","Unternehmensberatung","Produktionsbetrieb"],negativeKeywords:["privat","nachhilfe","hobby","job","karriere","kostenlos"],badFitSignals:["privat","nachhilfe","hobby","job","kostenlos"],searchKeywordVariants:{"Industrie":["Industrieunternehmen","Logistikunternehmen","Produktionsbetrieb"],"Sozial":["Pflegeheim","Hotel","Einzelhandel","Callcenter"],"Öffentlich":["Bildungsträger","Schule","Handwerksbetrieb"]},scoringSignals:["mitarbeiter","schulung","industrie","pflege","logistik","compliance","unternehmen","betrieb"],queryPriority:["Industrieunternehmen","Pflegeheim","Hotel","Logistikunternehmen","Handwerksbetrieb","Bildungsträger"]},
};

const LEGACY_INDUSTRY_MAP = {
  "Gebäudereinigung":"gebaeudereinigung","Gartenbau / Gartenpflege":"gartenbau","Gartenbau":"gartenbau",
  "Hausmeisterdienst / Facility Service":"facility_service","Facility Service":"facility_service",
  "Sicherheitsdienst":"sicherheitsdienst","IT-Service":"it_service","Handwerk":"handwerk",
  "Maler / Renovierung":"maler_renovierung","Maler":"maler_renovierung",
  "Elektro / Gebäudetechnik":"elektro_gebaeudetechnik","Elektro":"elektro_gebaeudetechnik",
  "SHK / Sanitär / Heizung / Klima":"shk","SHK":"shk",
  "Catering":"catering","Spedition / Logistik":"spedition_logistik","Spedition":"spedition_logistik",
  "Gesundheit / Medizin":"gesundheit_medizin","Immobilien":"immobilien",
  "Personal / Zeitarbeit":"personal_zeitarbeit","Marketing / Webdesign / Werbung":"marketing_webdesign_werbung",
  "Pflege / Betreuung":"pflege_betreuung","Schulungen / Weiterbildung":"schulungen_weiterbildung",
  "Industrieservice":"industrieservice","Entrümpelung":"entruempelung","Buchhaltung":"buchhaltung_steuernahe_dienste",
  "Fuhrparkservice / Fahrzeugpflege":"fuhrparkservice_fahrzeugpflege",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normStr(str) {
  return String(str || "").toLowerCase().replace(/ä/g,"ae").replace(/ö/g,"oe").replace(/ü/g,"ue").replace(/ß/g,"ss").trim();
}

function normalizeIndustryId(value) {
  if (!value) return null;
  const str = String(value).trim();
  if (LEAD_SEARCH_TAXONOMY[str]) return str;
  if (LEGACY_INDUSTRY_MAP[str]) return LEGACY_INDUSTRY_MAP[str];
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
  for (const tc of (profile?.targetCustomerTypes || [])) if (text.includes(normStr(tc))) { matched_target_customer_type = tc; break; }

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

function buildQueriesForIndustry(industry, targetCustomerTypes, excludedCustomerTypes, trialStage) {
  const industryId = normalizeIndustryId(industry);
  const profile = LEAD_SEARCH_TAXONOMY[industryId] || null;
  const queries = [];
  const seen = new Set();
  const maxQ = trialStage === 'free_preview' ? 5 : 20;
  const excludedNorm = excludedCustomerTypes.map(e => normStr(e));

  if (profile) {
    // Kategorien filtern: explizite Ausschlüsse + targetCustomerTypes als Override-Filter
    const usedCats = (profile.searchableBusinessCategories || []).filter(c => {
      const cn = normStr(c);
      // Ausschluss durch excludedCustomerTypes
      if (excludedNorm.some(ex => cn.includes(ex) || ex.includes(cn))) return false;
      return true;
    });

    // Wenn der Nutzer eigene targetCustomerTypes gesetzt hat, diese bevorzugen
    // und in searchKeywordVariants nach passenden Gruppen suchen
    let prioritized;
    if (targetCustomerTypes.length > 0) {
      // Nutzer-definierte Zielkunden → als Bonus-Queries voranstellen
      const userQueryPriority = [];
      for (const tc of targetCustomerTypes) {
        const tcNorm = normStr(tc);
        for (const cat of usedCats) {
          if (normStr(cat).includes(tcNorm) || tcNorm.includes(normStr(cat))) {
            if (!userQueryPriority.includes(cat)) userQueryPriority.push(cat);
          }
        }
      }
      const staticPrio = (profile.queryPriority || []).filter(c => usedCats.includes(c) && !userQueryPriority.includes(c));
      const rest = usedCats.filter(c => !userQueryPriority.includes(c) && !staticPrio.includes(c));
      prioritized = [...userQueryPriority, ...staticPrio, ...rest];
    } else {
      const staticPrio = (profile.queryPriority || []).filter(c => usedCats.includes(c));
      const rest = usedCats.filter(c => !(profile.queryPriority || []).includes(c));
      prioritized = [...staticPrio, ...rest];
    }

    const maxVariants = trialStage === 'free_preview' ? 2 : 3;
    for (const cat of prioritized) {
      if (queries.length >= maxQ) break;
      const variants = (profile.searchKeywordVariants?.[cat] ? profile.searchKeywordVariants[cat] : [cat]).slice(0, maxVariants);
      for (const v of variants) {
        if (!seen.has(v)) { seen.add(v); queries.push({ query: v, category: cat, variant: v, source: 'taxonomy' }); }
        if (queries.length >= maxQ) break;
      }
    }
  }

  // Fallback: Nutzer-definierte targetCustomerTypes direkt als Queries
  if (queries.length === 0 && targetCustomerTypes.length > 0) {
    for (const tc of targetCustomerTypes.slice(0, maxQ)) {
      if (excludedNorm.some(ex => normStr(tc).includes(ex))) continue;
      if (!seen.has(tc)) { seen.add(tc); queries.push({ query: tc, category: tc, variant: tc, source: 'user_target' }); }
    }
  }

  return { queries, profile };
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
  const MAX_BATCH_MS = 18000; // 18s pro Batch-Call

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

    // Bereits abgeschlossen?
    if (run.status === 'completed' || run.status === 'failed') {
      return Response.json({
        success: true,
        done: true,
        status: run.status,
        leads_saved: run.leads_saved || 0,
        progress_percent: run.progress_percent || 100,
        message: run.status === 'completed'
          ? `Recherche abgeschlossen: ${run.leads_saved || 0} neue Firmenkontakte gefunden.`
          : `Recherche fehlgeschlagen: ${run.error_message || 'Unbekannter Fehler'}`,
      });
    }

    // Suchplan aus ResearchRun lesen
    let searchPlan;
    try {
      searchPlan = JSON.parse(run.search_plan_json || '{}');
    } catch {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, { status: 'failed', error_message: 'Suchplan ungültig', finished_at: new Date().toISOString() });
      return Response.json({ success: false, error: 'Suchplan ungültig', done: true, status: 'failed' }, { status: 400 });
    }

    const { industry, city, radiusKm, radiusMeters, targetCustomerTypes = [], excludedCustomerTypes = [], trialStage, cityCoords, allPoints = [], allCenters = [], effectiveTarget } = searchPlan;

    // ── Queries bauen ────────────────────────────────────────────────────────
    const { queries: allQueries, profile } = buildQueriesForIndustry(industry, targetCustomerTypes, excludedCustomerTypes, trialStage);
    if (allQueries.length === 0) {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'failed', error_message: 'Keine Suchkategorien gefunden.', finished_at: new Date().toISOString()
      });
      return Response.json({ success: false, error: 'Keine Suchkategorien gefunden.', done: true, status: 'failed' });
    }

    // ── Status auf running setzen ────────────────────────────────────────────
    if (run.status === 'queued') {
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: 'running', current_step: 'Firmenprofile werden gesucht…', progress_percent: 5
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
    // Pro Call: max 3 Queries × 1 Point = klein und schnell
    const batchIndex = run.batch_index || 0;
    const QUERIES_PER_BATCH = trialStage === 'free_preview' ? 2 : 3;
    const PLACE_DETAILS_PER_BATCH = 15;

    const batchStart = batchIndex * QUERIES_PER_BATCH;
    const batchQueries = allQueries.slice(batchStart, batchStart + QUERIES_PER_BATCH);

    // Wenn keine weiteren Queries: fertig
    if (batchQueries.length === 0) {
      const finalStatus = currentLeadsSaved > 0 ? 'completed' : 'completed';
      await base44.asServiceRole.entities.ResearchRun.update(research_run_id, {
        status: finalStatus, progress_percent: 100,
        current_step: currentLeadsSaved > 0 ? `${currentLeadsSaved} Firmenkontakte gefunden` : 'Keine neuen Kontakte gefunden',
        finished_at: new Date().toISOString(),
      });
      return Response.json({ success: true, done: true, status: finalStatus, leads_saved: currentLeadsSaved, progress_percent: 100 });
    }

    // ── Search Points für diesen Batch (max 3 Punkte) ────────────────────────
    const pointsToSearch = (allPoints.length > 0 ? allPoints : [{ lat: cityCoords.lat, lng: cityCoords.lng, label:'center', centerLat: cityCoords.lat, centerLng: cityCoords.lng, centerCity: city }]).slice(0, 3);
    const pointRadiusMeters = Math.min(15000, Math.max(8000, radiusMeters / Math.max(pointsToSearch.length, 1)));

    let newLeadsSavedThisBatch = 0;
    let rawHitsThisBatch = 0;
    let dupSkippedThisBatch = 0;
    let noMatchThisBatch = 0;
    let outsideRadiusThisBatch = 0;
    let placeDetailsUsed = 0;

    outer:
    for (const point of pointsToSearch) {
      const pointCenter = { lat: point.centerLat || cityCoords.lat, lng: point.centerLng || cityCoords.lng, city: point.centerCity || city };

      for (const { query, category, variant } of batchQueries) {
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
            const nearAnyCenter = (allCenters.length > 0 ? allCenters : [{ lat: cityCoords.lat, lng: cityCoords.lng }])
              .some(sc => haversineKm(sc.lat, sc.lng, placeLat, placeLng) <= radiusKm * 1.05);
            if (!nearAnyCenter) { outsideRadiusThisBatch++; continue; }
            distanceKm = Math.min(...(allCenters.length > 0 ? allCenters : [{ lat: cityCoords.lat, lng: cityCoords.lng }])
              .map(sc => haversineKm(sc.lat, sc.lng, placeLat, placeLng)));
          }

          // Chain-Check
          if (isLikelyChain(place).isChain) { noMatchThisBatch++; continue; }

          // Duplikat-Check
          if (existingNames.has(normStr(place.name || ''))) { dupSkippedThisBatch++; continue; }

          // Scoring
          const scoring = profile
            ? scoreCandidate(place, profile, distanceKm, radiusKm, category)
            : { score: 60, matched_search_category: category, matched_target_customer_type: null, relevance_reason: `Legacy:${category}`, shouldSave: !isBadFit(place, {}).bad };

          if (!scoring.shouldSave) { noMatchThisBatch++; continue; }

          // Place Details holen
          const details = await getPlaceDetails(place.place_id, GOOGLE_PLACES_API_KEY);
          placeDetailsUsed++;
          const { plz, ort, adresse } = extractAddress(details?.address_components || []);

          const company = await base44.asServiceRole.entities.Company.create({
            organization_id,
            name: place.name || '',
            branche: scoring.matched_target_customer_type || scoring.matched_search_category || category,
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
          });

          existingNames.add(normStr(place.name || ''));
          newLeadsSavedThisBatch++;
          console.info(`[processResearchRun] SAVED "${place.name}" run=${research_run_id} batch=${batchIndex} score=${scoring.score}`);
        }
      }
    }

    // ── Fortschritt berechnen ────────────────────────────────────────────────
    const totalLeadsSaved = currentLeadsSaved + newLeadsSavedThisBatch;
    const nextBatchIndex = batchIndex + 1;
    const totalBatches = Math.ceil(allQueries.length / QUERIES_PER_BATCH);
    const progressPercent = Math.min(95, Math.round((nextBatchIndex / totalBatches) * 90) + 5);
    const isDone = nextBatchIndex >= totalBatches || totalLeadsSaved >= effectiveTarget;

    // ── Usage Log updaten (nur für tatsächlich gespeicherte Leads) ───────────
    if (newLeadsSavedThisBatch > 0) {
      await upsertUsageLog(base44, organization_id, newLeadsSavedThisBatch);

      // trial_leads_granted nur bei free_preview erhöhen
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
    });

    console.info(`[processResearchRun] Batch ${batchIndex} done: newSaved=${newLeadsSavedThisBatch} totalSaved=${totalLeadsSaved} done=${isDone}`);

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
    // Versuche den Run als partial zu markieren
    try {
      const base44 = createClientFromRequest(req);
      const body2 = await req.clone().json().catch(() => ({}));
      if (body2.research_run_id) {
        await base44.asServiceRole.entities.ResearchRun.update(body2.research_run_id, {
          status: 'partial',
          error_message: error?.message,
          current_step: 'Fehler – Recherche teilweise abgeschlossen',
        });
      }
    } catch {}
    return Response.json({ error: error?.message || 'Unbekannter Fehler', success: false }, { status: 500 });
  }
});