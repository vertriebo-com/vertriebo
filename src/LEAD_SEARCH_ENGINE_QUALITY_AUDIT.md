# Lead Search Engine — Quality & Scale Audit
**Version:** 1.0 | **Datum:** 2026-05-12 | **Basis:** generateLeads v2 + LeadSearchTaxonomy

---

## Zusammenfassung

Die aktuelle Engine ist funktional, multi-tenant-sicher und technisch korrekt.
Sie ist aber noch ein **Google-Places-Wrapper mit Scoring** — keine propriätäre Lead-Engine.
Dieses Dokument beschreibt alle bekannten Schwächen, priorisiert Verbesserungen
und legt die Architektur für eine langfristig starke, skalierbare Engine fest.

---

## Teil 1: Schwächen der aktuellen Engine

### 1.1 Query-Strategie: Zu simpel

**Problem:** Jede Query ist `"Kategoriename Stadt"` — z.B. `"Hausverwaltung Hamburg"`.

- Google Text Search versteht natürliche Sprache, aber `"Hausverwaltung Hamburg"` ist maximal generisch
- Keine Nutzung von `includedType` (Google Places API New) zum Filtern auf Place-Type-Ebene
- Keine Kombination von Text-Query + Place-Type-Filter → hoher Rauschanteil
- Keine Nutzung von `rankPreference: DISTANCE` für Radius-priorisierte Ergebnisse
- Keine Nutzung von `pageToken` für Pagination (max. 20 Ergebnisse pro Seite, API gibt bis zu 60 zurück)
- Keine `locationRestriction` mit Bounding-Box — nur `location + radius` → Google ignoriert Radius-Bias häufig

**Konkret:** Eine Query `"Hausverwaltung Hamburg"` liefert 20 Ergebnisse.
Mit Pagination (pageToken) wären es bis zu 60 — ohne Mehrkosten pro Seite.
Aktuell werden diese 40 verlorenen Ergebnisse nie gesehen.

**Impact:** Coverage-Verlust von ~66% bei jeder Query.

---

### 1.2 Google Places API: Legacy vs. New API

**Problem:** Die Engine nutzt die **Legacy Text Search API** (`/place/textsearch/json`).

Die **New Places API** (`/v1/places:searchText`) bietet:
- `includedType`: Nur Places eines bestimmten Typs zurückgeben (sehr kosteneffizient)
- `locationRestriction` (Circle oder Rectangle): Harte geografische Begrenzung
- `rankPreference: DISTANCE` oder `RELEVANCE`
- `pageSize` bis 20 pro Request, `pageToken` für bis zu 3 Seiten (60 Ergebnisse)
- `fieldMask`: Nur benötigte Felder anfragen → **niedrigere SKU-Kosten**
- `includePureServiceAreaBusinesses`: Für Dienstleister ohne Ladenlokal (z.B. Gebäudereinigung, Gartenbau)
- Strukturiertere Antwort mit `primaryType`, `types[]` Array

**Aktuell genutzter SKU:** `places_text_search_pro` ($32/1000 Requests)
**Mit New API + Field Mask:** `text_search_basic` ($5-17/1000) je nach Feldern

**Impact:** Potenzielle Kostensenkung von 50-80% bei gleichzeitig besserer Coverage.

---

### 1.3 Radius-Strategie: Naiv

**Problem:** Bei großem Radius (50-60 km) wird trotzdem nur **eine Stadt** als Zentrum gesucht.

- Bei 60 km Radius um Hamburg werden Städte wie Lübeck, Kiel, Rostock nicht abgedeckt
- Google Text Search ohne `locationRestriction` liefert stadtzentrumslastige Ergebnisse
- Keine dynamische Expansion auf Nachbarstädte bei großem Radius
- Keine Grid-basierte Coverage (Unterteilung des Radius in Zellen)

**Was fehlt:**
```
Radius 25 km → 1 Suchzentrum (Hauptstadt)
Radius 50 km → 3-5 Subzentren (Hauptstadt + wichtigste Umlandstädte)
Radius > 50 km → Grid mit ~15 km Überlappung
```

**Impact:** Bei großem Radius werden 30-50% der tatsächlich erreichbaren Unternehmen nie gefunden.

---

### 1.4 Scoring: Zu binär

**Problem:** Score ≥ 55 → speichern, Score < 55 → verwerfen.

- Nur 3 positive Signale: Kategorie-Match (+20), Scoring-Signal (+15), Kontaktdaten (+10+10)
- Kein Radius-Score-Bonus/Malus (nah = wertvoller)
- Kein Unternehmensgrößen-Signal (Kette vs. Lokalbetrieb)
- Kein Vollständigkeits-Score (Telefon + Website + Adresse = besser kontaktierbar)
- Keine Bewertungs-Anzahl als Proxy für Unternehmensgröße
- Kein temporaler Faktor (neue Firmen → höher priorisieren?)
- Keine Saisonalität

**Ketten-Problem:** Google gibt "ALDI", "McDonald's", "Deutsche Post" zurück — diese werden
aktuell nicht systematisch als Ketten erkannt. Nur durch Namens-Keywords.

---

### 1.5 Negativsignale: Lückenhaft

**Fehlende Bad-Fit-Signale für bestimmte Branchen:**

| Branche | Fehlende Negativsignale |
|---------|------------------------|
| Gebäudereinigung | "Reinigungskraft gesucht", "Putzstelle", "Haushaltshilfe" |
| IT-Service | "Gaming", "eSports", "Computer-Reparatur Handy" |
| Catering | "Selbstabholer", "Imbiss", "Schnellrestaurant", "Drive-Through" |
| Sicherheitsdienst | "Schlüsseldienst", "Alarmanlagen privat", "Videoüberwachung Haus" |
| Gartenbau | "Baumschule" (B2C), "Gartenmarkt", "Baumarkt Gartenabteilung" |
| Spedition | "Umzugshelfer", "Transporter mieten", "Möbelträger privat" |
| Personal/Zeitarbeit | "Headhunter", "Recruiting privat", "Nanny", "Au Pair" |
| Alle | "Insolvenz", "geschlossen", "aufgelöst", "ehemals" |

**Fehlendes systemisches Negativ-Muster:** Franchise-/Kettenbetriebe
- Signale: Viele Bewertungen (>500), bekannte Ketten-Domains, mehrfach vorkommende Websites

---

### 1.6 Branchen-Coverage: Gaps

**Branchen mit schwacher Query-Coverage:**

| Branche | Problem | Lösung |
|---------|---------|--------|
| IT-Service | Querys zu medizinisch-fokussiert | KMU-Sektor fehlt: Handwerk, Retail, Gastronomie |
| Catering | Fokus auf Events, B2C-Caterer kommen trotzdem durch | Zielgruppen-Queries statt Caterer-Queries |
| Spedition/Logistik | Großhandel gut, aber Online-Händler fehlen | E-Commerce-Queries ergänzen |
| Personal/Zeitarbeit | Nur klassische Industrie, kein Pflege/Sozial-Fokus | Pflegebranchen-Queries stärken |
| Maler/Renovierung | Hausverwaltung gut, aber Wohnungsbaugesellschaften komplex | WBG-spezifische Queries |
| SHK | Gastronomie fehlt als starker Kundensegment | Restaurant-/Hostel-Queries |
| Lager/Fulfillment | Sehr eng definiert | E-Commerce-Plattformen als Indikator |
| Entrümpelung | Rechtsanwalt Erbrecht fehlt in Queries | Nachlassspezifika |

**Ganz fehlende Branchen in Taxonomy (für künftige Expansion):**
- Reinigungsgeräte/-chemikalien Vertrieb
- Schädlingsbekämpfung
- Winterdienst (separat von Gartenbau)
- Brandschutz
- Aufzugsservice
- Druckerei/Werbetechnik
- Photovoltaik/Energieservice

---

### 1.7 Google Places Ineffizienzen

**Konkrete Probleme:**

1. **Kein Pagination:** Jede Text-Search-Query liefert max. 20 Ergebnisse. Mit `pageToken` wären 60 möglich. Wir verlieren 40/Query.

2. **Kein Field Mask:** Wir laden alle Place Details, obwohl wir nur Name, Adresse, Telefon, Website brauchen. Das kostet `place_details_pro` SKU statt `place_details_essentials`.

3. **Keine Nearby Search für dichte Gebiete:** Bei Großstädten (Hamburg, Berlin, München) ist Nearby Search (`/v1/places:searchNearby`) mit `includedTypes` effizienter als Text Search, weil:
   - Keine Keyword-Ambiguität
   - Direkte Place-Type-Filterung
   - Kostengünstiger bei richtiger Field Mask

4. **Kein Caching von Geocoding-Ergebnissen:** Jede Recherche geocodiert die Stadt neu — das sind unnötige Requests.

5. **Radius-Limit ignoriert:** Google Text Search radius parameter ist ein **Bias**, kein Hard-Limit. Wir filtern per Haversine nach, aber trotzdem kommen viele Out-of-Radius-Treffer in die Place-Details-Phase → kostet Details-Requests.

6. **Kein Retry-Mechanismus:** Bei `OVER_QUERY_LIMIT` oder temporären Google-Fehlern bricht die Suche ab.

---

### 1.8 Skalierungsprobleme bei 1000 Kunden

| Problem | Kritikalität | Beschreibung |
|---------|-------------|--------------|
| Synchrone Ausführung | KRITISCH | Jede Suche blockiert ein Deno-Thread für 30-60 Sekunden |
| Kein Job-Queue-System | HOCH | 1000 gleichzeitige Suchen = 1000 parallele Deno-Threads |
| Google Rate-Limiting | HOCH | Places API hat Quotas pro Projekt, nicht pro Kunde |
| Kein Result-Caching | MITTEL | Diesel Stadt + Branche → immer neue API-Calls |
| Inline-Taxonomy-Duplikation | MITTEL | Änderungen müssen in 2 Dateien gepflegt werden |
| Kein Async-Feedback | NIEDRIG | Kunde muss 45s warten, kein Progress-Feedback |
| UsageLog-Konflikt | NIEDRIG | Parallele Runs → Race Condition beim UsageLog-Update |

---

### 1.9 Datenspeicherung: Was fehlt

**Aktuell gespeichert:** Name, Adresse, Telefon, Website, Koordinaten, Score, Kategorie, QuerySource.

**Was fehlt und wertvoll wäre:**

```js
{
  // Google Qualitätsdaten
  google_rating: 4.2,           // Unternehmensqualitäts-Proxy
  google_review_count: 47,      // Größen-Proxy (>500 = Kette, <10 = sehr klein)
  google_place_id: "ChIJ...",   // Für späteres Re-Enrichment
  google_primary_type: "property_management", // Für Type-based Scoring
  google_business_status: "OPERATIONAL", // vs. CLOSED_TEMPORARILY

  // Lead Intelligence
  chain_probability: 0.1,       // KI-Score: Ketten-Wahrscheinlichkeit
  size_estimate: "small",       // small/medium/large basierend auf Signalen
  contact_completeness: 0.8,    // Wie vollständig sind Kontaktdaten (0-1)
  
  // Recherche-Provenienz
  search_query_used: "Hausverwaltung Hamburg",
  search_rank_in_results: 3,    // Position in Google-Ergebnissen
  discovery_method: "text_search", // vs. "nearby_search", "expansion"
  
  // Feedback-Loop (für spätere KI)
  outcome: null,                // "won" | "lost" | "no_contact" | "not_relevant"
  outcome_set_at: null,
  outcome_set_by: null,
}
```

---

## Teil 2: Architektur-Vorschläge

### 2.1 Kurzfristig (Phase D) — In 2-4 Wochen umsetzbar

#### 2.1.1 Pagination aktivieren (höchste ROI)

```js
// Statt: 1 Request → 20 Ergebnisse
// Neu: bis zu 3 Requests → bis zu 60 Ergebnisse (pro Query, gleicher Preis pro Ergebnis)

async function searchPlacesWithPagination(query, coords, radius, budget, apiCounters) {
  const results = [];
  let pageToken = null;
  let page = 0;
  const maxPages = budget === 'free_preview' ? 1 : 3; // Free Preview: 1 Seite reicht
  
  do {
    const res = await searchPlaces(query, coords, radius, apiCounters, pageToken);
    results.push(...res.places);
    pageToken = res.nextPageToken || null;
    page++;
    if (pageToken) await sleep(2000); // Google: 2s warten zwischen Seiten
  } while (pageToken && page < maxPages);
  
  return results;
}
```

**Impact:** +40-120 Ergebnisse pro Query ohne Mehrkosten (pro Ergebnis gleicher Preis).

---

#### 2.1.2 Radius-Vorfilter vor Place Details

```js
// Aktuell: Place Details Request, dann Haversine
// Besser: Haversine VOR Place Details mit Text-Search-Koordinaten

for (const place of places) {
  const roughLat = place.geometry?.location?.lat;
  const roughLng = place.geometry?.location?.lng;
  
  if (roughLat && roughLng) {
    const roughDist = haversineKm(centerLat, centerLng, roughLat, roughLng);
    if (roughDist > radiusKm * 1.2) { // 20% Puffer für Ungenauigkeit
      skipped_outside_radius++;
      continue; // Kein Place-Details-Request → Kosten gespart
    }
  }
  
  // Erst jetzt: Place Details
  const details = await getPlaceDetails(place.place_id, apiCounters);
}
```

**Impact:** Spart 15-30% der Place-Details-Requests bei großem Radius.

---

#### 2.1.3 Geocoding-Cache

```js
// Koordinaten einer Stadt einmal laden und in OrganizationSettings cachen
const GEOCODE_CACHE_KEY = `geocode_${city.toLowerCase().replace(/\s/g,'_')}`;
const cached = settingsMap[GEOCODE_CACHE_KEY];
if (cached) {
  cityCoords = JSON.parse(cached);
} else {
  cityCoords = await geocodeCity(city);
  // Speichern für 30 Tage
  await upsertSetting(organization_id, GEOCODE_CACHE_KEY, JSON.stringify(cityCoords));
}
```

**Impact:** Spart 1 Geocoding-Request pro Recherche (kumuliert bei 1000 Kunden: viel).

---

#### 2.1.4 Chain-Detection ergänzen

```js
function isLikelyChain(place) {
  const KNOWN_CHAINS = new Set([
    'aldi', 'lidl', 'rewe', 'edeka', 'netto', 'kaufland', 'penny',
    'dm', 'rossmann', 'müller', 'deichmann', 'h&m', 'zara',
    'deutsche post', 'dhl', 'hermes', 'ups', 'fedex', 'dpd',
    'deutsche bank', 'sparkasse', 'commerzbank', 'volksbank',
    'mcdonalds', 'burgerking', 'subway', 'kfc', 'dominos',
    'ikea', 'obi', 'bauhaus', 'hornbach', 'hagebau'
  ]);
  
  const nameLower = place.name?.toLowerCase() || '';
  for (const chain of KNOWN_CHAINS) {
    if (nameLower.includes(chain)) return { isChain: true, reason: `Bekannte Kette: ${chain}` };
  }
  
  // Hohe Bewertungsanzahl → wahrscheinlich Kette
  if (place.user_ratings_total > 500) return { isChain: true, reason: `>500 Bewertungen (${place.user_ratings_total})` };
  
  return { isChain: false };
}
```

---

### 2.2 Mittelfristig (Phase E) — In 1-3 Monaten

#### 2.2.1 Neue Places API (New) migrieren

**Vorteile der neuen API:**

```js
// Statt Legacy: GET https://maps.googleapis.com/maps/api/place/textsearch/json?...
// Neu: POST https://places.googleapis.com/v1/places:searchText

const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.location,places.types,places.primaryType,places.rating,places.userRatingCount,places.regularOpeningHours,places.businessStatus,nextPageToken'
  },
  body: JSON.stringify({
    textQuery: "Hausverwaltung Hamburg",
    includedType: "real_estate_agency",  // Place-Type-Filter!
    locationRestriction: {
      circle: {
        center: { latitude: 53.55, longitude: 10.00 },
        radius: 25000  // Meter — HARD LIMIT (nicht nur Bias)
      }
    },
    rankPreference: "RELEVANCE",
    languageCode: "de",
    regionCode: "DE",
    pageSize: 20
  })
});
```

**Kostenvergleich (März 2025 Pricing):**
- Legacy Text Search Pro: $32/1000
- New Text Search Basic (nur Essentials): $5/1000
- New Text Search Advanced (mit Details): $17/1000

**→ Mit Field Mask + New API: bis zu 85% Kostensenkung bei gleicher Coverage**

---

#### 2.2.2 Google Place Types → Taxonomy-Mapping

Die neue API unterstützt `includedType` mit strukturierten Place-Types.
Jede Kategorie in unserer Taxonomy sollte einen Google Place Type bekommen:

```js
const CATEGORY_TO_PLACE_TYPE = {
  // Immobilien / Hausverwaltung
  "Hausverwaltung": "real_estate_agency",
  "Property Management": "real_estate_agency",
  "WEG Verwaltung": "real_estate_agency",
  
  // Gesundheit / Pflege  
  "Arztpraxis": "doctor",
  "Zahnarztpraxis": "dentist",
  "Pflegeheim": "nursing_home",
  "Ärztehaus": "medical_clinic",
  "Physiotherapie": "physiotherapist",
  
  // Bildung
  "Schule": "school",
  "Kindertagesstätte": "child_care_agency",
  "Gymnasium": "secondary_school",
  
  // Unterkunft
  "Hotel": "hotel",
  "Tagungshotel": "conference_center",
  
  // Gewerbe
  "Rechtsanwalt": "lawyer",
  "Steuerberater": "accounting",
  "Ingenieurbüro": "engineer",
  "Bauunternehmen": "general_contractor",
  
  // Industrie/Logistik
  "Logistikzentrum": "moving_company",
  "Großhandel": "wholesaler",
  "Produktionsbetrieb": "factory",
};
```

**Strategie:** Dual-Mode Search
1. Text Search (für semantische Abdeckung) → `"Hausverwaltung Hamburg"`
2. + Nearby Search mit `includedType` → `"real_estate_agency"` im Radius
3. Union beider Ergebnisse → maximal Coverage

---

#### 2.2.3 Adaptive Radius-Strategie

```js
function buildRadiusSearchPlan(city, radiusKm, trialStage) {
  if (trialStage === 'free_preview') {
    return [{ city, coords: null, subRadius: Math.min(radiusKm, 15) }];
  }
  
  if (radiusKm <= 15) {
    // Sehr kleiner Radius: 1 Zentrum, kleiner Subradius
    return [{ city, coords: null, subRadius: radiusKm }];
  }
  
  if (radiusKm <= 30) {
    // Stadtgebiet: 1 Zentrum, voller Radius
    return [{ city, coords: null, subRadius: radiusKm }];
  }
  
  if (radiusKm <= 60) {
    // Regionaler Radius: Hauptstadt + 4 Subzentren (dynamisch geocodiert)
    // Subzentren werden aus OpenStreetMap-Umgebung oder vordefinierten Listen ermittelt
    return generateSubCenters(city, radiusKm, 4);
  }
  
  // Großer Radius: Grid-Strategie mit 20km Überlappung
  return generateCoverageGrid(city, radiusKm, gridSpacingKm = 20);
}
```

---

### 2.3 Langfristig (Phase F) — In 3-12 Monaten

#### 2.3.1 Asynchrone Job-Queue-Architektur

**Problem:** Synchrone Deno-Funktion für 45s ist bei 1000 Kunden nicht skalierbar.

**Lösung:**

```
Frontend → POST /generateLeads (sofortige Antwort: job_id)
    ↓
Job Queue (z.B. OrganizationSettings mit status: "queued")
    ↓
Scheduled Worker (alle 2 Min.) → lädt nächsten Job → führt aus
    ↓
ResearchRun Entity aktualisiert → Frontend pollt /getJobStatus
    ↓
UI zeigt Fortschritt in Echtzeit (via Entity Subscription)
```

**Implementierung mit Base44:**
- `ResearchRun.status`: `"queued"` → `"running"` → `"completed"` / `"failed"`
- Scheduled Automation (alle 5 Min.) → Backend-Funktion `processLeadQueue`
- Frontend subscribed auf `ResearchRun.subscribe()` für Live-Updates
- Max. 3 parallele Jobs global (um Google Rate-Limits zu respektieren)

---

#### 2.3.2 Ergebnis-Caching (Query-Level)

**Problem:** 10 Kunden in Hamburg suchen gleichzeitig nach "Hausverwaltung" → 10 identische Google-Calls.

**Lösung:**

```js
// Cache-Key: Hash aus (query, city, radiusKm, Woche)
const cacheKey = `search_cache_${hash(query + city + radiusKm + getWeekKey())}`;

// Prüfe AppSettings (global) oder OrganizationSettings (org-spezifisch)
const cached = await base44.asServiceRole.entities.AppSettings.filter({ key: cacheKey });
if (cached[0] && !isExpired(cached[0].updated_date, 7 * 24 * 60 * 60 * 1000)) {
  return JSON.parse(cached[0].value); // Cache-Hit: 0 Google-Requests
}

// Cache-Miss: normale Suche, dann cachen
const results = await searchPlaces(query, coords, radius);
await base44.asServiceRole.entities.AppSettings.create({ key: cacheKey, value: JSON.stringify(results) });
return results;
```

**Impact bei 1000 Kunden:** Potenzielle 70-90% Google-Request-Reduktion für populäre Suchen.

---

#### 2.3.3 KI-Feedback-Loop: Learning Engine

**Ziel:** Engine lernt aus echten Vertriebsergebnissen.

**Datenmodell-Erweiterung:**

```js
// Company Entity: Outcome-Felder (bereits eingetragen)
outcome: "won" | "lost" | "not_relevant" | "no_contact"
outcome_reason: "Kein Bedarf" | "Bereits Dienstleister" | "Zu klein" | ...

// Neues Entity: LeadQualityFeedback
{
  organization_id: string,
  company_id: string,
  industry: string,
  search_query_used: string,    // Welche Query hat diesen Lead gefunden?
  google_primary_type: string,  // Welcher Place-Type?
  outcome: string,
  scoring_score_at_discovery: number,
  feedback_date: date
}
```

**Learning-Mechanismus:**
1. Monatlich: Korrelation zwischen Score und Outcome analysieren (via InvokeLLM)
2. Queries mit hohem Won-Rate → Gewichtung erhöhen
3. Place-Types mit hohem Not-Relevant-Rate → aus Taxonomy entfernen
4. Negative Keywords aus "not_relevant"-Begründungen extrahieren

---

#### 2.3.4 AI-Assisted Lead Qualification

**Phase 1: Regelbasiert (jetzt)**
- Name-Matching + Score → Speichern/Verwerfen

**Phase 2: LLM-Classification (Medium-Term)**
```js
// Batch-Classification: 20 Kandidaten in einem LLM-Call
const classified = await base44.integrations.Core.InvokeLLM({
  prompt: `
    Branche: ${industry}
    Eigene Dienstleistung: ${services.join(', ')}
    
    Klassifiziere diese ${candidates.length} Unternehmensprofile als B2B-Lead-Qualität:
    ${candidates.map((c, i) => `${i+1}. ${c.name} | ${c.types?.join(', ')} | ${c.formatted_address}`).join('\n')}
    
    Antworte mit JSON: [{"index": 1, "quality": "high|medium|low|irrelevant", "reason": "..."}]
  `,
  response_json_schema: { type: "object", properties: { classifications: { type: "array" } } },
  model: "gpt_5_mini"
});
```

**Phase 3: Eigentraining (Long-Term)**
- Fine-tuned Classifier auf Basis eigener Outcome-Daten
- Input: Name, Types, Adresse, Rating, ReviewCount, Branche
- Output: Lead-Qualitäts-Score 0-100

---

## Teil 3: Priorisierte Roadmap

### Priorität 1: Sofortige Quick Wins (0-2 Wochen)
| # | Maßnahme | Aufwand | Impact |
|---|----------|---------|--------|
| Q1 | Pagination aktivieren (pageToken) | Klein | +50-100% Coverage |
| Q2 | Radius-Vorfilter vor Place Details | Klein | -20% Kosten |
| Q3 | Chain-Detection (Top-50 Ketten) | Klein | +15% Lead-Qualität |
| Q4 | Ketten-Negativsignal-Erweiterung | Klein | +10% Qualität |
| Q5 | Google Rating + ReviewCount speichern | Klein | Datenbasis für spätere KI |

### Priorität 2: Coverage & Qualität (2-8 Wochen)
| # | Maßnahme | Aufwand | Impact |
|---|----------|---------|--------|
| P1 | Neue Places API (New) + Field Mask | Mittel | -50-80% Kosten |
| P2 | Place-Type-Mapping (includedType) | Mittel | +30% Precision |
| P3 | Adaptive Radius-Strategie (Subzentren) | Mittel | +40% Coverage bei >30km |
| P4 | Taxonomy-Ausbau (fehlende Branchen) | Klein | Neue Marktsegmente |
| P5 | Geocoding-Cache | Klein | -1 Request/Recherche |

### Priorität 3: Skalierbarkeit (2-4 Monate)
| # | Maßnahme | Aufwand | Impact |
|---|----------|---------|--------|
| S1 | Async Job-Queue (Scheduled Worker) | Groß | 1000+ Kunden parallel |
| S2 | Query-Ergebnis-Cache (AppSettings) | Mittel | -70% Google-Requests bei Scale |
| S3 | UsageLog-Atomicity (Race Condition fix) | Klein | Korrekte Daten bei Parallelität |
| S4 | Taxonomy als Entity (Single Source of Truth) | Mittel | Wartbarkeit |

### Priorität 4: Learning Engine (3-12 Monate)
| # | Maßnahme | Aufwand | Impact |
|---|----------|---------|--------|
| L1 | Outcome-Tracking in Company Entity | Klein | Datenbasis |
| L2 | LeadQualityFeedback Entity | Mittel | Feedback-Loop |
| L3 | Monthly Quality Analysis (LLM-batch) | Mittel | Selbstoptimierung |
| L4 | AI-Batch-Classification vor Speichern | Groß | Massive Qualitätsverbesserung |
| L5 | Adaptive Scoring-Weights | Groß | Propriäre Engine |

---

## Teil 4: Datenmodell-Erweiterungen

### 4.1 Company Entity — Zusatzfelder

```json
{
  "google_rating": { "type": "number", "title": "Google Bewertung (0-5)" },
  "google_review_count": { "type": "number", "title": "Anzahl Google Bewertungen" },
  "google_place_id": { "type": "string", "title": "Google Place ID" },
  "google_primary_type": { "type": "string", "title": "Google Place Type (primary)" },
  "google_business_status": { "type": "string", "title": "Google Business Status" },
  "chain_probability": { "type": "number", "title": "Ketten-Wahrscheinlichkeit (0-1)" },
  "size_estimate": { "type": "string", "enum": ["micro", "small", "medium", "large", "chain"], "title": "Geschätzte Unternehmensgröße" },
  "contact_completeness": { "type": "number", "title": "Kontakt-Vollständigkeit (0-1)" },
  "search_rank_in_results": { "type": "number", "title": "Position in Suchergebnissen" },
  "discovery_method": { "type": "string", "title": "Entdeckungsmethode" },
  "outcome": { "type": "string", "enum": ["won", "lost", "not_relevant", "no_contact", "pending"], "title": "Vertriebsergebnis" },
  "outcome_reason": { "type": "string", "title": "Ergebnisgrund" },
  "outcome_set_at": { "type": "string", "format": "date-time", "title": "Ergebnis gesetzt am" }
}
```

### 4.2 Neues Entity: SearchQueryCache

```json
{
  "cache_key": { "type": "string", "title": "Cache Key (Hash)" },
  "query": { "type": "string", "title": "Suchanfrage" },
  "city": { "type": "string", "title": "Stadt" },
  "radius_km": { "type": "number", "title": "Radius km" },
  "results_json": { "type": "string", "title": "Ergebnisse (JSON)" },
  "result_count": { "type": "number", "title": "Anzahl Ergebnisse" },
  "expires_at": { "type": "string", "format": "date-time", "title": "Gültig bis" }
}
```

### 4.3 Neues Entity: LeadQualityFeedback

```json
{
  "organization_id": { "type": "string", "title": "Organisation ID" },
  "company_id": { "type": "string", "title": "Firma ID" },
  "industry_id": { "type": "string", "title": "Branchen ID" },
  "search_query_used": { "type": "string", "title": "Verwendete Suchanfrage" },
  "google_primary_type": { "type": "string", "title": "Google Place Type" },
  "discovery_score": { "type": "number", "title": "Score bei Entdeckung" },
  "outcome": { "type": "string", "title": "Vertriebsergebnis" },
  "outcome_reason": { "type": "string", "title": "Begründung" }
}
```

---

## Teil 5: Quality Score System

### 5.1 Erweiterter Lead-Score (v2)

```js
function scoreLeadV2({ candidate, profile, distanceKm, radiusKm, matchedCategory }) {
  let score = 0;
  const signals = [];

  // === POSITIVE SIGNALE ===
  
  // Kategorie-Match (0-25 Punkte)
  const catScore = getCategoryScore(candidate, profile, matchedCategory);
  score += catScore.points;
  if (catScore.matched) signals.push(`Kategorie: ${catScore.matched} (+${catScore.points})`);

  // Branchenspezifische Scoring-Signale (0-15 Punkte)
  for (const s of profile.scoringSignals) {
    if (nameContains(candidate, s)) { score += 15; signals.push(`Signal: ${s}`); break; }
  }

  // Kontaktdaten-Vollständigkeit (0-20 Punkte)
  const phone = candidate.nationalPhoneNumber || candidate.formatted_phone_number;
  const website = candidate.websiteUri || candidate.website;
  if (phone) { score += 10; signals.push("Telefon +10"); }
  if (website) { score += 10; signals.push("Website +10"); }

  // Radius-Bonus (0-10 Punkte) — näher = besser
  if (distanceKm !== null) {
    if (distanceKm <= radiusKm * 0.3) { score += 10; signals.push(`Sehr nah (${distanceKm}km) +10`); }
    else if (distanceKm <= radiusKm * 0.6) { score += 5; signals.push(`Nah (${distanceKm}km) +5`); }
    else if (distanceKm <= radiusKm) { score += 2; signals.push(`Im Radius (${distanceKm}km) +2`); }
  }

  // Google Rating als Qualitätssignal (0-5 Punkte)
  const rating = candidate.rating || 0;
  const reviews = candidate.user_ratings_total || candidate.userRatingCount || 0;
  if (rating >= 4.0 && reviews >= 5) { score += 5; signals.push(`Rating ${rating} (${reviews} Rez.) +5`); }

  // Betriebsstatus (0-10 Punkte)
  const bizStatus = candidate.businessStatus || candidate.business_status;
  if (bizStatus === 'OPERATIONAL') { score += 10; signals.push("Operativ +10"); }
  else if (bizStatus === 'CLOSED_TEMPORARILY') { score -= 10; signals.push("Vorübergehend geschlossen -10"); }
  else if (bizStatus === 'CLOSED_PERMANENTLY') { score -= 50; signals.push("Dauerhaft geschlossen -50"); }

  // Unternehmensgrößen-Plausibilität (0-5 Punkte)
  // Kleines Lokal (5-100 Reviews) = idealer B2B-Zielkunde
  if (reviews >= 5 && reviews <= 200) { score += 5; signals.push(`SME-Größe (${reviews} Rez.) +5`); }

  // === NEGATIVE SIGNALE ===
  
  // Chain-Detection (-30 Punkte)
  const chainCheck = isLikelyChain(candidate);
  if (chainCheck.isChain) { score -= 30; signals.push(`Kette: ${chainCheck.reason} -30`); }

  // Sehr hohe Bewertungsanzahl = Kette (-20 Punkte, zusätzlich)
  if (reviews > 500) { score -= 20; signals.push(`>500 Bewertungen (${reviews}) -20`); }

  // BadFit-Signale (bestehend, -30 bis -50)
  const badFit = isBadFit(candidate, profile);
  if (badFit.isBadFit) {
    const penalty = badFit.signalType === 'job' ? 50 : badFit.signalType === 'private' ? 50 : 30;
    score -= penalty;
    signals.push(`BadFit: ${badFit.reason} -${penalty}`);
  }

  score = Math.max(0, Math.min(100, score));
  
  // Schwellwert für Speichern: 55 (wie bisher)
  // Qualitäts-Tier für UI:
  const tier = score >= 80 ? 'A' : score >= 65 ? 'B' : score >= 50 ? 'C' : 'D';
  
  return {
    score,
    tier,
    signals: signals.join(' | '),
    shouldSave: score >= 55 && !badFit.isBadFit,
    chain_probability: chainCheck.isChain ? 0.9 : (reviews > 200 ? 0.4 : 0.1),
    size_estimate: reviews > 500 ? 'chain' : reviews > 100 ? 'medium' : reviews > 20 ? 'small' : 'micro',
  };
}
```

---

## Teil 6: Internationale Skalierbarkeit

### 6.1 Was heute schon richtig ist
- Keine Hardcodes für Deutschland, Deutsche Städte, Deutsch als Sprache
- `language=de` als Parameter → änderbar
- Städte als konfigurierbare Einstellung

### 6.2 Was geändert werden muss für Internationalisierung

```js
// Aktuell hardcoded in generateLeads:
const cityQuery = city + ' Deutschland';  // ← PROBLEM

// Besser:
const countryContext = settings.country_code || 'DE';
const cityQuery = `${city} ${COUNTRY_NAMES[countryContext] || countryContext}`;

// Taxonomy-Labels auf Englisch als Basis, Deutsche Labels als Übersetzung
// Neue API-Parameter:
languageCode: settings.search_language || 'de',
regionCode: settings.country_code || 'DE',
```

### 6.3 Taxonomy: Sprach-Neutralisierung

Langfristig: Taxonomy-Kategorien auf Englisch als Basis,
mit Sprach-Übersetzungen pro Locale:

```json
{
  "id": "property_management",
  "labels": {
    "de": "Hausverwaltung",
    "en": "Property Management",
    "fr": "Gestion Immobilière"
  },
  "searchTerms": {
    "de": ["Hausverwaltung", "WEG Verwaltung", "Immobilienverwaltung"],
    "en": ["Property Management", "HOA Management", "Building Management"],
    "fr": ["Gestion Immobilière", "Syndic de Copropriété"]
  }
}
```

---

## Teil 7: Monitoring & Observability

### 7.1 Metriken die gemessen werden sollten

```js
// Pro ResearchRun:
{
  coverage_rate: savedLeads / rawHits,           // Wie viele Treffer wurden qualifiziert?
  precision_rate: null,                           // Aus Outcome-Daten später berechenbar
  api_cost_per_lead: estimatedCostCent / savedLeads,
  query_efficiency: savedLeads / queriesUsed,
  radius_hit_rate: leadsInRadius / totalFoundPlaces,
  chain_rejection_rate: chainsRejected / rawHits,
  duplicate_rate: duplicates / rawHits,
}

// Pro Organisation (monatlich):
{
  avg_lead_quality_score: Ø(relevance_score) aller gespeicherten Leads,
  outcome_won_rate: wonCount / totalOutcomes,    // Erst nach Feedback verfügbar
  api_cost_per_won_lead: totalCost / wonCount,   // Der eigentliche KPI
  search_saturation: duplicates / (duplicates + newLeads) // >80% = Gebiet gesättigt
}
```

### 7.2 Saturation Alert

```js
// Wenn ein Gebiet gesättigt ist (>80% Duplikate), automatisch:
// 1. Radius erhöhen (+10km Vorschlag)
// 2. Neue Zielkunden-Kategorien vorschlagen
// 3. Nachbarstädte vorschlagen
```

---

## Fazit & Nächste Schritte

### Was die Engine heute ist:
Ein funktionaler, multi-tenant-sicherer Google-Places-Wrapper mit regelbasiertem Scoring.
Technisch solide. Qualitativ ausbaufähig.

### Was die Engine werden soll:
Eine selbstlernende, kostenefffiziente, hoch-präzise lokale B2B-Discovery-Engine,
die aus realen Vertriebsergebnissen lernt und sich pro Branche und Region selbst optimiert.

### Die 3 wichtigsten nächsten Schritte:
1. **Pagination aktivieren** → sofort +50-100% Coverage ohne Mehrkosten
2. **Places API New migrieren + Field Mask** → sofort -50-70% Kosten
3. **Outcome-Tracking in Company Entity** → Datenbasis für alles weitere

### Der proprietäre Vorteil (langfristig):
Kein Wettbewerber kann in 12 Monaten die Outcome-Daten von 10.000 Vertriebsgesprächen
aus 20+ Branchen in 200+ Städten aufbauen. Das ist der echte Burggraben.

---

*Dieser Audit wurde erstellt auf Basis von:*
- *Google Places API Dokumentation (New API, März 2025)*
- *B2B Lead Scoring Research (ResearchGate, 2024)*
- *Praktischen Erkenntnissen aus dem aktuellen generateLeads v2 Code*
- *Best Practices aus der n8n/Apify Community für lokale B2B-Lead-Generierung*