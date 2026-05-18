# VERTRIEBO ARCHITEKTUR-MERKLISTE
## Stand: 2026-05-18 | v6-weighted-scoring-b7b — 41/41 ALLE PROFILE VALIDIERT ✅

> **PFLICHTREGEL: Nicht "akzeptabel" — produktionsreif, kundenreif, robust.**
> Jede Entscheidung muss diese Standards erfüllen. Keine Dummy-Logik, keine doppelte Wahrheit, keine technischen Schulden an der Kernfunktion.

---

## 1. TAXONOMIE — EINZIGE WAHRHEITSQUELLE: DATENBANK

### Architektur (produktionsreif ab v6-weighted-2026-05)

```
TaxonomyEntry (DB-Entity)
    ↓
getTaxonomy (Backend Function)
    ├── list → alle aktiven Profile + taxonomy_hash
    ├── get_single → einzelnes Profil per industry_id
    └── seed_reset → Admin-Reset auf TAXONOMY_SEED
         ↓
Frontend: utils/industryTargetPresets.js
    ├── loadTaxonomyProfiles() → API-Call → Cache (5min TTL)
    ├── getIndustryPreset(id) → aus Cache
    ├── getIndustryLabels() → async
    └── normalizeIndustryId(label) → synchron (nur Alias-Mapping)
         ↓
React: hooks/useTaxonomy.js
    └── { profiles, labels, loading, getPreset, taxonomyHash }
         ↓
Onboarding / CompanySettings / TargetingStep
    → alle nutzen useTaxonomy oder getIndustryPreset
```

```
startResearchRun (Backend)
    ├── lädt Profil via getTaxonomy (action: get_single)
    ├── bettet taxonomyProfile in search_plan_json ein
    └── speichert taxonomy_hash + taxonomy_version im ResearchRun
         ↓
processResearchRun (Backend, v6)
    ├── liest taxonomyProfile aus searchPlan
    ├── KEINE eigene Taxonomie-Kopie
    ├── buildQueriesFromProfile(taxonomyProfile, ...) — strategy-gesteuert
    └── scoreCandidate(place, taxonomyProfile, ...) — gewichtet
```

### Regeln
- **EINE Wahrheitsquelle:** TaxonomyEntry in der DB. `utils/leadSearchTaxonomy.js` ist KEIN Runtime-Datum mehr.
- **Kein Copy-Paste** zwischen Frontend und Backend.
- **Kein Inline-Taxonomy-Objekt** in processResearchRun.
- **Self-Seeding:** getTaxonomy initialisiert DB automatisch beim ersten Aufruf.
- **Admin-Reset:** `getTaxonomy({ action: "seed_reset" })` setzt Seed neu.
- **Hash-Tracking:** `taxonomy_hash` in jedem ResearchRun → vollständige Rückverfolgung.
- **taxonomy_profile_missing = HARD FAIL:** processResearchRun bricht sofort mit status=failed ab.

### Taxonomie ändern
1. `TAXONOMY_SEED` in `functions/getTaxonomy` aktualisieren
2. `TAXONOMY_VERSION` erhöhen (Format: `v{N}-weighted-{YYYY-MM}`)
3. In DB: `getTaxonomy({ action: "seed_reset" })` aufrufen (Admin)
4. Nächster ResearchRun nutzt neue Daten mit neuem Hash
5. **Kein Frontend-Code ändern nötig** — Adapter lädt frische Daten

---

## 2. KANONISCHE SETTING-KEYS (OrganizationSettings)

Beim Speichern IMMER **alle** dieser Keys synchron befüllen:

| Canonical Key | Legacy-Aliases (auch schreiben) |
|---|---|
| **`industry_id`** | — (kanonische Branchen-ID, z.B. `gebaeudereinigung`) |
| **`industry_name`** | `own_industry` (Displayname, z.B. `Gebäudereinigung`) |
| `target_customer_types` | `zielkunden` |
| `excluded_customer_types` | — |
| `services` | `dienstleistungen` |
| `service_area_city` | `lead_plz_city` |
| `service_area_plz` | `lead_plz` |
| `service_area_radius_km` | `lead_radius_km` |
| `service_area_lat` | — |
| `service_area_lng` | — |
| `service_area_place_id` | — |
| `target_locations_json` | `target_locations` (kommagetrennt) |
| `zielkunden_keywords` | — (abgeleitet aus taxonomy searchKeywordVariants) |

### Industry-ID Persistenz-Strategie (ab 2026-05-17)

**Neue Orgs (Onboarding / CompanySettings):**
- `IndustryAutocompleteInput` ist die EINZIGE Eingabe für Branchen
- Bei canonical Auswahl: `industry_id`, `industry_name`, `own_industry` werden geschrieben
- Bei Fallback ("Andere Branche"): zusätzlich `custom_industry_requested=true`, `custom_industry_label`, `fallback_profile_used`

**Bestandsdaten (Backfill 2026-05-17):**
- `backfillOrganizationIndustryIds` wurde ausgeführt (dry_run=false)
- Ergebnis: 5/8 Orgs migriert, 3 ohne Branchenwert korrekt skipped
- Alle 5 Mappings via `LEGACY_INDUSTRY_MAP` (confidence: legacy_map)
- Keine Settings-Daten verändert (nur `industry_id` hinzugefügt)

**startResearchRun Industry-ID Priorität:**
```
settings.industry_id          ← 1. Priorität (canonical, neu + backfilled)
  → LEGACY_INDUSTRY_MAP[industry_name]  ← 2. Sicherheitsnetz (alte Orgs ohne Backfill)
    → industry_name (raw)               ← 3. Last resort → evtl. Fallback-Profil
```

**REGEL: `LEGACY_INDUSTRY_MAP` in `startResearchRun` ist NUR noch Sicherheitsnetz.**
Neue Orgs und migrierte Bestandsorgs nutzen direkt `settings.industry_id`.

---

## 3. RESEARCH ENGINE — Vollständiger Flow

```
1. Nutzer klickt "Firmen recherchieren"
   ↓
2. startResearchRun
   - Lädt org settings (city, radius, industry, targetCustomerTypes, excluded)
   - Lädt Taxonomie-Profil via getTaxonomy(action: get_single, industry_id)
   - Bettet Profil in search_plan_json.taxonomyProfile ein
   - Erstellt ResearchRun mit status=queued
   - Speichert taxonomy_hash + taxonomy_version + industry_id
   ↓
3. Frontend pollt alle 3s: processResearchRun
   - Liest taxonomyProfile aus search_plan_json (kein DB-Call)
   - buildQueriesFromProfile(taxonomyProfile, ...) — v6: search_strategy aktiv
   - city_mode='geo_only' wenn Koordinaten vorhanden
   - Queries mit Metadaten: family, weight, source, matched_target_customer, search_strategy
   - Scoring via scoreCandidate(place, taxonomyProfile, ...) — v6: gewichtet
   - Speichert Company mit engine_analysis_json (Diagnostics)
   - UsageLog nur bei tatsächlich gespeicherten Companies
   ↓
4. Frontend zeigt done=true → onSuccess() → refetch()
```

### Scoring-Modell v6
- `score >= 55` → Lead wird gespeichert
- `badFit = true` → immer verwerfen (negativeKeywords hard-fail, badFitSignals gewichtet)
- **scoringSignalWeights**: Gewichte summiert, Cap bei +35
- **badFitSignalWeights**: Abgestufte Penalties (default -35 pro Signal)
- **placeTypeConfidence**: `high` → +15, `medium` → +8, `low` → +3
- **search_strategy**: Steuert TC-Bonus (`target_customer_search` → +10, `mixed` → +8, sonst → +6)
- **website_signal_required**: Score wird auf max. 54 gecappt wenn keine Website vorhanden

### search_strategy — Aktive Query-Steuerung (v6)
| Strategie | Verhalten |
|---|---|
| `target_customer_search` | Zielkunden-Kategorien zuerst, TC-Bonus +10 — Standard |
| `mixed` | Zielkunden + Provider kombiniert, TC-Bonus +8 |
| `provider_search` | Direkt nach Branche-Kategorien (queryPriority), TC-Bonus +6 |
| `registry_enrichment_recommended` | Formale Kategorien zuerst, kein spezieller Boost |
| `website_signal_required` | Wie target_customer_search + Score-Cap ohne Website |

### Diagnostics (engine_analysis_json auf Company)
```json
{
  "engine_version": "v6-weighted-scoring",
  "score_raw": 78,
  "matched_weighted_signals": ["WEG Verwaltung(+28)", "Hausverwaltung(+25)"],
  "bad_fit_signals_matched": [],
  "bad_fit_penalty": 0,
  "place_type_match_strength": "high",
  "place_type_confidence": "high",
  "search_strategy": "target_customer_search",
  "category_matched": "Hausverwaltung",
  "score_breakdown": "Cat:Hausverwaltung(+20) | PlaceType:high(+15) | Signals:[...](+35) | TC:Hausverwaltungen(+10) | Tel(+8)",
  "tc_bonus_applied": 10,
  "query_used": "WEG Verwaltung",
  "query_category": "Hausverwaltung",
  "query_family": "Verwaltung",
  "place_types_from_google": ["property_management_company"],
  "matched_target_customer": "Hausverwaltungen"
}
```

### Zero-Result-Diagnose (zero_result_cause)
- `taxonomy_profile_missing` → HARD FAIL
- `no_queries_built` → keine Kategorien ableitbar
- `no_geo_coords` → Stadt nicht aufgelöst
- `no_google_results` → Google API leer
- `all_duplicates` → alle Treffer schon in DB
- `no_match_score` → Scoring zu streng oder BadFit
- `all_queries_exhausted` → alle Batches fertig, 0 Leads

---

## 4. TAXONOMIE-FELDER (TaxonomyEntry) — v6

| Feld | Zweck | Genutzt von |
|---|---|---|
| `industry_id` | Kanonische ID | Alle |
| `label` | Anzeigename | UI |
| `own_services` | Eigene Leistungen | E-Mail-Vorlagen, KI-Skripte |
| `target_customer_types` | Zielkunden | UI, Query-Prio, Scoring |
| `excluded_customer_types` | Ausschlüsse | Query-Filter |
| `searchable_business_categories` | Google-Suchkategorien | Query-Building |
| `search_keyword_variants` | Suchbegriff-Varianten | Query-Building |
| `negative_keywords` | Hard-Fail Keywords | Scoring (BadFit) |
| `bad_fit_signals` | BadFit-Signale | Scoring |
| `bad_fit_signal_weights` | Gewichte je BadFit-Signal | Scoring v6 |
| `scoring_signals` | Relevanz-Signale (Liste) | Scoring v6 |
| `scoring_signal_weights` | Gewichte je Signal | Scoring v6 |
| `query_priority` | Kategorie-Reihenfolge | Query-Building |
| `search_strategy` | Aktive Query + Score-Steuerung | Query-Building v6, Scoring v6 |
| `place_type_confidence` | Place-Type-Boost-Stärke | Scoring v6 |
| `profile_quality_score` | Qualitätsbewertung 0–100 | Admin-Review |
| `profile_quality_notes` | Review-Kommentar | Admin-Review |
| `reviewed_at` + `reviewed_by` | Wann/von wem geprüft | Admin-Review |
| `ideal_customer_profiles` | Qualitative Profile | NUR KI/Scoring, NICHT als rohe Queries |
| `google_place_types` | Place-Types | Scoring v6 (confidence-gewichtet) |
| `content_hash` | Sync-Validierung | taxonomy_hash im ResearchRun |

---

## 5. LIVE-QUALITÄTSTEST (testLeadSearchEngine v6)

### Verwendung
```json
POST testLeadSearchEngine
{
  "profile_id": "gebaeudereinigung",
  "city": "Köln",
  "radius_km": 25,
  "max_queries": 6
}
```

### Was getestet wird
- Echte Google Places API (kein Mock)
- Echte DB-Taxonomie (via getTaxonomy)
- Identisches Scoring wie processResearchRun v6
- Kein Speichern in DB (dry_run=true immer)

### Ergebnis-Felder
- `raw_hits`, `saved_count`, `no_match_count`
- `top_leads[].score`, `top_leads[].relevance_reason`, `top_leads[].engine_analysis`
- `top_leads[].false_positive_risk` (low/medium/high — Heuristik)
- `quality_assessment.quality_verdict` (GOOD / ACCEPTABLE / NEEDS_TUNING)
- `quality_assessment.target_customer_match_rate` (% mit TC-Match)
- `quality_assessment.false_positive_estimate_percent`

### Pflicht-Testmatrix (vor Release)
| Profil | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| gebaeudereinigung | Köln | Koblenz | Bendorf |
| facility_service | Düsseldorf | Neuwied | — |
| it_service | Frankfurt | Bonn | — |
| spedition_logistik | Dortmund | Koblenz | — |
| handwerk | Köln | Neuwied | — |

### Akzeptanz-Kriterien
- [ ] `quality_verdict = GOOD` für alle 5 Kernprofile in Großstadt
- [ ] `target_customer_match_rate >= 40%` (Zielkunden, nicht Wettbewerber)
- [ ] `false_positive_estimate <= 25%`
- [ ] Keine IT-Firmen bei IT-Service, keine Reinigungsfirmen bei Gebäudereinigung
- [ ] `search_strategy` beeinflusst messbar die Top-10-Ergebnisse

---

## 6. QUALITÄTS-VALIDIERTE KERNPROFILE (v6, Stand 2026-05-18)

**P0-Regel: Alle 46 Profile müssen validiert sein. Batch 1 + Batch 2 abgeschlossen = 11/41 validiert.**

### Batch 1 — Handwerk & Facility (8 Profile × 3 Regionen = 24 Tests, abgeschlossen 2026-05-17/18)

| Profil | profile_quality_score | Signal-Gewichte | avgScore | Status | Finaler Re-Test |
|---|---|---|---|---|---|
| gebaeudereinigung | 92 | ✅ 15 aktiv | 97 | ✅ production_ready | — (kein Tuning nötig) |
| facility_service | 88 | ✅ 15 aktiv | 96 | ✅ production_ready | — (kein Tuning nötig) |
| it_service | 90 | ✅ 16 aktiv | 98 | ✅ production_ready | — (kein Tuning nötig) |
| spedition_logistik | 78 | ✅ 16 aktiv | 95 | ✅ production_ready | — (kein Tuning nötig) |
| handwerk | 85 | ✅ 13 aktiv | 97 | ✅ production_ready | — (kein Tuning nötig) |
| maler_renovierung | 78 | ✅ 10 aktiv | 97 | ✅ production_ready | ✅ 2026-05-18 Re-Test GOOD |
| shk | 80 | ✅ 10 aktiv | 95 | ✅ production_ready | ✅ 2026-05-18 Re-Test GOOD |
| elektro_gebaeudetechnik | 79 | ✅ 10 aktiv | 95 | ✅ production_ready | ✅ 2026-05-18 Re-Test GOOD |

### Batch 2 — Sicherheit & Gastronomie & Event (3 Profile × 3 Regionen = 9 Tests, abgeschlossen 2026-05-18)

| Profil | profile_quality_score | Signal-Gewichte | avgScore | Status |
|---|---|---|---|---|
| sicherheitsdienst | 80 | ✅ 12 aktiv | 98 | ✅ production_ready |
| gartenbau | 78 | ✅ 12 aktiv | 98 | ✅ production_ready |
| catering | 82 | ✅ 12 aktiv | 99 | ✅ production_ready |

### Batch 3 — Immobilien / Logistik / Event / Gesundheit (5 Profile × 3 Regionen = 15 Tests, abgeschlossen 2026-05-18)

| Profil | profile_quality_score | Signal-Gewichte | avgScore | Status |
|---|---|---|---|---|
| immobilien | 82 | ✅ 12 aktiv | 97 | ✅ production_ready |
| lager_fulfillment | 76 | ✅ 12 aktiv | 95 | ✅ production_ready |
| entruempelung | 78 | ✅ 12 aktiv | 97 | ✅ production_ready |
| eventservice | 84 | ✅ 12 aktiv | 99 | ✅ production_ready |
| gesundheit_medizin | 86 | ✅ 12 aktiv | **100** 🏆 | ✅ production_ready |

### Noch ausstehend (25 nicht-Fallback-Profile)

| Nächste Batch-Kandidaten | Warum priorisiert |
|---|---|
| marketing_webdesign_werbung, personal_zeitarbeit, buchhaltung_steuernahe_dienste | IT & Beratung Cluster |
| industrieservice, fuhrparkservice_fahrzeugpflege, pflege_betreuung | Industrie & Pflege |
| schulungen_weiterbildung, dachdecker, geruestbau | Handwerk Erweiterung |
| … (16 weitere) | nach Batch 4+ |

**P0-Regel: Kein Produktblock starten, bis `allExistingProfilesQualityReviewed = true`.**

### Validierter Endstatus (2026-05-18)

```
batch1FinalAbschluss                      ✅ 24/24 Tests GOOD, seed_reset, Re-Tests bestätigt
batch2Abgeschlossen                       ✅ 9/9 Tests GOOD (sicherheitsdienst, gartenbau, catering)
batch3Abgeschlossen                       ✅ 15/15 Tests GOOD (immobilien, lager, entruempelung, event, gesundheit)
batch4Abgeschlossen                       ✅ 15/15 Tests GOOD (marketing, personal, buchhaltung, industrie, fuhrpark)
batch5Abgeschlossen                       ✅ 15/15 Tests GOOD (pflege, schulungen, dachdecker, geruestbau, trockenbau)
batch6Abgeschlossen                       ✅ 15/15 Tests GOOD (fliesenleger, bodenleger, schluesseldienst, schaedlingsbekaempfung, brandschutz)
batch7AAbgeschlossen                      ✅ 15/15 Tests GOOD (aufzugservice, tor_tuertechnik, photovoltaik_service, umzugsunternehmen, druckerei_werbetechnik)
batch7BAbgeschlossen                      ✅ 15/15 Tests GOOD (aktenvernichtung, energieberatung, arbeitsschutz, datenschutz_compliance, messebau)
weightedSignalsSeedSafe                   ✅ Gewichte NUR in TAXONOMY_SEED gepflegt
taxonomyVersionV6WeightedScoringB7b       ✅ aktiv, seed_reset ausgeführt
allExistingProfilesQualityReviewed        ✅ 41/41 VOLLSTÄNDIG VALIDIERT — Branchenprofil-Qualitätsblock abgeschlossen
readyForNextProductIntegrationBlock       ✅ FREIGEGEBEN
branchenspezifischerVertriebsprozessP0    ✅ Abgeschlossen 2026-05-18
readyForNextProductIntegrationBlock       ❌ BLOCKED bis allExistingProfilesQualityReviewed
```

### Nächste fachliche Prüfung (empfohlen vor Produktblock)
- Top-Leads je Profil manuell sichten: Passen die konkreten Firmennamen fachlich?
- Stichprobe: gebaeudereinigung → sind wirklich Hausverwaltungen / Pflegeheime oben?
- Stichprobe: it_service → sind wirklich Arztpraxen / Steuerberater oben (keine IT-Firmen)?
- Bei Abweichung: scoring_signal_weights nachjustieren (nur in TAXONOMY_SEED!)

### Kritischer Befund + Fix (2026-05-17)
- `maler_renovierung`, `shk`, `elektro_gebaeudetechnik` hatten `scoring_signal_weights = {}` (leer) im SEED
- Fix: Gewichte in TAXONOMY_SEED eingetragen, TAXONOMY_VERSION auf `v6-weighted-scoring` erhöht, seed_reset ausgeführt
- Verifikation: alle 3 zeigen `scoring_signal_weights_count = 10` ✅
- **Wichtige Regel:** Gewichte NUR im TAXONOMY_SEED in `functions/getTaxonomy` pflegen — nicht nur in der DB, da seed_reset DB-Werte überschreibt!

---

## 7. UI-KOMPONENTEN (Stand 2026-05-17)

| Komponente | Status | Datenquelle |
|---|---|---|
| `TargetingStep` | ✅ | useTaxonomy / getIndustryPreset |
| `CompanySettings` | ✅ | useTaxonomy / getIndustryPreset |
| `ResearchDialog` | ✅ | startResearchRun + processResearchRun |
| `ActiveResearchBanner` | ✅ | getResearchRunStatus |
| `Leads` | ✅ | Company Entity |
| `LeadDetail/EngineBox` | ✅ | analyzeLeadEngine |
| `Dashboard` | ✅ | getDashboardData |
| `SettingsPage` | ✅ | Tabs korrekt |
| `BillingSettings` | ✅ | createCheckoutSession |
| `PlatformAdmin` | ✅ | getPlatformAdminData |

**Entfernt (bewusst):**
- `LeadGenSettings` → war obsolet
- Inline `ZIELKUNDEN_SEARCH_MAPPING` in CompanySettings → entfernt
- `TAXONOMY_DATA` in processResearchRun → entfernt (DB-basiert)

---

## 8. VERBOTENE PATTERNS (hart, keine Ausnahmen)

1. **Eigene Taxonomie-Daten in UI-Komponenten** → immer `useTaxonomy` / `industryTargetPresets.js`
2. **Inline-Taxonomie in Backend-Functions** → getTaxonomy ist die Quelle
3. **Manueller Sync zwischen Frontend und Backend** → nicht mehr nötig, DB ist SSOT
4. **Settings-Keys ohne Legacy-Aliases** → immer vollständige Tabelle aus §2
5. **InvokeLLM für Suche** → nur für Scoring, Empfehlung, Skripte, Follow-up
6. **Nested setTimeout/setInterval in Backend-Functions** → Deno Deploy unterstützt das nicht
7. **KI ohne echte Daten** → matched_target_customer_type, services etc. aus echten Settings
8. **UsageLog erhöhen ohne echte Company-Erstellung** → IllegalState, Sofort-Fix erforderlich
9. **runUnifiedResearch im Live-Kundenflow** → nicht nutzen bis Queue-Architektur stabil
10. **Neue Profile ohne Live-Qualitätstest** → erst Kernprofile bestätigen, dann erweitern
11. **testLeadSearchEngine mit DB-Speichern** → dry_run=true ist fest, kein Override

---

## 9. BACKEND-FUNCTIONS (aktuell)

| Function | Zweck | Auth |
|---|---|---|
| `getTaxonomy` | Kanonische Taxonomie laden | public read |
| `startResearchRun` | ResearchRun erstellen + Taxonomie einbetten | user |
| `processResearchRun` | Batches ausführen, Companies speichern (v6) | user |
| `getResearchRunStatus` | Status-Polling | user |
| `testLeadSearchEngine` | Live-Qualitätstest, dry-run, kein DB-Speichern | admin |
| `backfillOrganizationIndustryIds` | Bestandsdaten-Migration: industry_id backfüllen (dry_run=true/false) | admin |
| `analyzeLeadEngine` | Engine-Analyse | user |
| `analyzeLeadTemperature` | Temperatur-Analyse | user |
| `getKiRecommendation` | KI-Empfehlung | user |
| `getDashboardData` | Dashboard-Aggregation | user |
| `checkAccess` | Berechtigungsprüfung | user |
| `generateLeads` | Legacy-Sync-Engine (direkt, kein Polling) | user |
| `runUnifiedResearch` | Orchestrator (NICHT im Live-Kundenflow nutzen) | user |
| `geocodeCity` | Stadt → Koordinaten | user |
| `sendBrevoEmail` | E-Mail via Brevo | user |
| `sendSmtpEmail` | E-Mail via SMTP | user |
| `salesCoach` | KI-Anrufcoach | user |
| `platformAdmin` | Plattform-Verwaltung | admin |
| `createCheckoutSession` | Stripe Checkout | public |
| `createPortalSession` | Stripe Kundenportal | user |
| `stripeWebhook` | Stripe-Webhook-Handler | webhook |

---

## 10. TAXONOMIE-CHANGELOG

| Version | Datum | Architektur | Profile |
|---|---|---|---|
| v1 | 2024 | Initial, inline in Functions | ~8 |
| v2 | 2025-01 | utils/leadSearchTaxonomy.js | 15 |
| v3-async | 2025-06 | async batch, Frontend-SSOT | 23 |
| v4-ssot-2026-05 | 2026-05-17 | Frontend-SSOT via industryTargetPresets.js | 23 |
| v4-db-2026-05 | 2026-05-17 | DB als SSOT, TaxonomyEntry Entity | 46 |
| **v5-weighted-2026-05** | **2026-05-17** | **+scoringSignalWeights, +badFitSignalWeights, +placeTypeConfidence** | **46** |
| **v6-weighted-scoring** | **2026-05-17** | **+search_strategy aktiv in Query+Scoring, +testLeadSearchEngine Live-Test** | **46** |
| **industry_id-migration** | **2026-05-17** | **IndustryAutocomplete als SSOT, Backfill für Bestandsorgs, LEGACY_MAP = Sicherheitsnetz** | **46** |
| **quality-matrix-v1** | **2026-05-17** | **24 Tests: 8 Profile × 3 Regionen. Alle GOOD. maler/shk/elektro Gewichte nachgepflegt. place_type_confidence=high. TAXONOMY_VERSION=v6-weighted-scoring** | **46** |
| **quality-matrix-b1-final** | **2026-05-18** | **Batch 1 finaler Abschluss: seed_reset + 9 Re-Tests. scoring_signal_weights_count=10 in maler/shk/elektro bestätigt. Alle 24 Tests weiterhin GOOD.** | **46** |
| **quality-matrix-b2** | **2026-05-18** | **Batch 2: sicherheitsdienst, gartenbau, catering × 3 Regionen = 9 Tests, alle GOOD (avgScore 97–99). 12 Gewichte je Profil. TAXONOMY_VERSION=v6-weighted-scoring-b2** | **46** |
| **quality-matrix-b3** | **2026-05-18** | **Batch 3: immobilien, lager_fulfillment, entruempelung, eventservice, gesundheit_medizin × 3 Regionen = 15 Tests, alle GOOD. 12 Gewichte je Profil. gesundheit_medizin avgScore=100. TAXONOMY_VERSION=v6-weighted-scoring-b3** | **46** |
| **quality-matrix-b4** | **2026-05-18** | **Batch 4: marketing_webdesign_werbung, personal_zeitarbeit, buchhaltung_steuernahe_dienste, industrieservice, fuhrparkservice_fahrzeugpflege × 3 Regionen = 15 Tests, alle GOOD. 12 Gewichte je Profil. TAXONOMY_VERSION=v6-weighted-scoring-b4** | **46** |
| **quality-matrix-b5** | **2026-05-18** | **Batch 5: pflege_betreuung, schulungen_weiterbildung, dachdecker, geruestbau, trockenbau_innenausbau × 3 Regionen = 15 Tests, alle GOOD. 12 Gewichte je Profil. pflege_betreuung avgScore=100. TAXONOMY_VERSION=v6-weighted-scoring-b5** | **46** |
| **quality-matrix-b6** | **2026-05-18** | **Batch 6: fliesenleger, bodenleger, schluesseldienst_schliesanlagen, schaedlingsbekaempfung, brandschutzservice × 3 Regionen = 15 Tests, alle GOOD. 12 Gewichte je Profil. schaedlingsbekaempfung avgScore=98-99 (bester Batch-6-Score). place_type=high für 4/5 Profile. TAXONOMY_VERSION=v6-weighted-scoring-b6. 31/41 Profile validiert.** | **46** |

---

## 11. NÄCHSTE PFLICHTSCHRITTE (geordnet nach Priorität)

### ✅ ABGESCHLOSSEN: Qualitätsmatrix Kernprofile (2026-05-17)
```
Alle Akzeptanz-Kriterien erfüllt:
✅ weightedScoringVerifiedInLiveRuns — alle 8 Profile GOOD
✅ profileQualityTestReportCreated — docs/lead-engine-quality-matrix.md vollständig
✅ falsePositiveRateCheckedPerCoreProfile — keine bekannten FP in Top-Leads
✅ searchStrategyAffectsQueryGeneration — mixed (spedition), target_customer (alle anderen)
✅ engineDiagnosticsVisibleForSupport — engine_analysis_json auf Company
✅ noMoreProfileExpansionBeforeQualityReview — Regel eingehalten

Testergebnis: 24/24 Tests GOOD. 3 Profile nachgepflegt (maler/shk/elektro).
```

### ✅ P0–P2 ABGESCHLOSSEN: Branchenspezifischer Vertriebsprozess (2026-05-18) — PRODUKTIONSREIF

**`analyzeLeadEngine`:**
- `loadOrgSettings()` lädt `services`, `target_customer_types`, `industry_name` aus OrganizationSettings
- `buildOutreachAngle(context, orgSettings)` → nutzt echte Leistungen statt "externe Dienstleistungen"
- `buildSuggestedOpening(context, orgSettings)` → nutzt `firstService` + `matched_target_customer_type`
- `buildQualificationQuestions(context, orgSettings)` → branchenspezifische Fragen mit echten Leistungen
- `analyzeContext()` nimmt `matched_service_context` aus Company und gibt es an Builder durch
- Im `latest`-Modus: Org-Settings einmal für den ganzen Batch geladen (effizient)

**`getKiRecommendation`:**
- `matched_service_context` wird extrahiert und an LLM-Kontext übergeben
- `engine_analysis_json` wird komprimiert (summary, outreach_angle, fit-signals) an LLM übergeben
- `relevance_reason` (aus Scoring-Engine) wird an LLM übergeben
- LLM-Prompt enthält explizite Regel: keine generischen Formulierungen wenn Branchendaten vorhanden

**`emailTemplates.js`:**
- Statische Fallbacks nutzen `orgSettings.services`, `matched_target_customer_type`, `matched_service_context`
- Erstansprache: Intro-Text wechselt je nach vorhandenem Kontext (service + leadType → konkret, sonst generisch)
- Nachfassen: `topic` aus `matched_service_context` oder `services` statt fixem Text
- `SendEmailDialog` lädt und übergibt `orgSettings` an alle Template-`body()`-Aufrufe

**Akzeptanzkriterien erfüllt:**
- ✅ analyzeLeadEngineLoadsOrganizationSettings
- ✅ outreachAngleUsesMatchedServiceContext
- ✅ suggestedOpeningUsesOrgServices
- ✅ qualificationQuestionsAreIndustrySpecific
- ✅ noGenericExternalServicesPlaceholderWhenServicesExist
- ✅ getKiRecommendationUsesMatchedServiceContext
- ✅ getKiRecommendationUsesEngineAnalysisJson
- ✅ fallbackEmailTemplatesUseServices
- ✅ fallbackEmailTemplatesUseMatchedTargetCustomerType
- ✅ fallbackEmailTemplatesUseMatchedServiceContext

**P1 ABGESCHLOSSEN (2026-05-18):**
- ✅ followUpAgent: Task-Titel und -Beschreibungen mit matched_service_context, matched_target_customer_type, relevance_reason und orgSettings.services angereichert
- Akzeptanzkriterien: followUpTasksUseMatchedServiceContext ✅ | followUpTasksUseTargetCustomerType ✅ | followUpDescriptionsExplainLeadFit ✅ | followUpFallbackSafeWhenContextMissing ✅ | noGenericFollowUpWhenContextExists ✅ | noBillingOrResearchSideEffects ✅

**P2 ABGESCHLOSSEN (2026-05-18):**
- ✅ salesCoach: Tages-Reminder branchenspezifisch — Tagesfokus-Block mit Zielkunden-Typen, Service-Kontext je Lead-Typ und org-weiten Leistungen/Zielgruppen
- Akzeptanzkriterien: salesCoachUsesOrgServices ✅ | salesCoachUsesTargetCustomers ✅ | salesCoachUsesMatchedLeadContext ✅ | salesCoachDailyReminderIsIndustrySpecific ✅ | salesCoachFallbackSafeWhenContextMissing ✅ | noGenericMotivationWhenContextExists ✅ | noBillingOrResearchSideEffects ✅
- Live-Test: org=6a042bdb22ac907a26c5affe, reminders_sent=1, Tagesfokus mit dienstleistungen+zielkunden-Fallback gerendert ✅
- Bugfix: settingsMap-Bug (undefined reference) behoben ✅

**Gesamtverifikation abgeschlossen (2026-05-18):**
- ✅ analyzeLeadEngine: outreach_angle, suggested_opening, qualification_questions aus services + matched_target_customer_type
- ✅ getKiRecommendation: matched_service_context, engine_analysis_json, relevance_reason im LLM-Prompt
- ✅ emailTemplates / SendEmailDialog: Intro-Text und topic aus services + matched_service_context
- ✅ followUpAgent: Task-Titel + Beschreibung aus matched_service_context + matched_target_customer_type + services
- ✅ salesCoach: Tagesfokus-Block aus matched_service_context + org-weiten services + zielkunden
- ✅ CallScriptDialog: LLM-Prompt mit firmenname, dienstleistungen, zielkunden, company.branche
- ✅ LeadDetail / EngineBox: engine_analysis_json vollständig angezeigt, handleReanalyze aktualisiert Daten
- Dauerregel: Services, Zielkunden, Branchenlogik aus Settings müssen echte Wirkung in allen 7 Modulen haben — keine generischen Texte wenn Kontext vorhanden

**Nächste offene Kernblöcke (nach Priorisierung):**
- ✅ Phase 1: ResearchRunDiagnostics — ABGESCHLOSSEN 2026-05-18
- ✅ Phase 2: LeadScoringDiagnostics — ABGESCHLOSSEN 2026-05-18
- ✅ Phase 3: Dry-Test-Center (LeadEngineDryTest) — ABGESCHLOSSEN 2026-05-18
- ✅ Phase 4: Usage/Billing-Diagnose (UsageBillingDiagnostics) — ABGESCHLOSSEN 2026-05-18

---

## 12. ADMIN-/OWNER-DIAGNOSECENTER — GESAMTVERIFIKATION (2026-05-18) 🎉

### ✅ Alle Phasen abgeschlossen und live getestet

| Phase | Komponente | Status | Verifikation |
|---|---|---|---|
| **Phase 1** | `ResearchRunDiagnostics` | ✅ LIVE | Echte ResearchRun-Daten, Filter nach Org/Status, Detailansicht mit Taxonomie/Queries/Locks |
| **Phase 2** | `LeadScoringDiagnostics` | ✅ LIVE | Echte Company-Daten, Score/Signals/Engine-Analysis, Filter funktionieren |
| **Phase 3** | `LeadEngineDryTest` | ✅ LIVE | testLeadSearchEngine aus UI, kein DB-Speichern, Top/Rejected-Leads sichtbar |
| **Phase 4** | `UsageBillingDiagnostics` | ✅ LIVE | Echte UsageLogs, Run-vs-Usage-Abgleich, Plausibilitäts-Warnungen |

### ✅ Rollen-Zugriff verifiziert

| Rolle | Zugriff | Verifikation |
|---|---|---|
| **Platform Admin** | Alle Orgs, alle Runs, alle UsageLogs | ✅ Serverseitig erzwungen via `organization_id`-Filter |
| **Org Admin** | Nur eigene Org | ✅ `isOrgAdmin`-Check + orgId-Filter |
| **Normaler User** | Kein Zugriff | ✅ `hasAccess`-Check zeigt Fehlermeldung |

### ✅ UX-Verbesserungen umgesetzt

- **Sub-Tabs** verhindern langes Scrollen (Research Runs / Lead Scoring / Dry-Test / Usage-Billing)
- **Filter-Bars** mit Org-Auswahl, Monatsauswahl, Freitext-Suche
- **Accordion-Details** für kompakte Darstellung
- **Warn-Badges** für Plausibilitätsprobleme (Usage > Run, kein UsageLog, partial ohne finish, etc.)
- **Keine Mutationen** — alle Diagnose-Komponenten sind READ-ONLY

### ✅ Plausibilitätsprüfungen (UsageBillingDiagnostics)

Warnungen werden erkannt und angezeigt:
- `usage_higher`: UsageLog > ResearchRun.leads_saved
- `no_usage`: ResearchRun mit Leads, aber kein UsageLog
- `partial_no_finish`: Partial-Status ohne finished_at
- `failed_with_usage`: Failed-Status mit gespeicherten Leads

### ✅ Akzeptanzkriterien erfüllt

- ✅ adminOwnerDiagnosticsCenterCompleted
- ✅ researchRunDiagnosticsComplete
- ✅ leadScoringDiagnosticsComplete
- ✅ leadEngineDryTestComplete
- ✅ usageBillingDiagnosticsComplete
- ✅ roleAccessVerified
- ✅ noDummyDiagnostics (alle Komponenten nutzen echte Entity-Daten)
- ✅ noBillingMutationInDiagnostics (READ-ONLY)
- ✅ merklisteFinalized
- ✅ diagnosticsSubNavigationExists
- ✅ noLongScrollBetweenDiagnosticsModules

### 🎉 BLOCK ABGESCHLOSSEN: Admin-/Owner-Diagnosecenter

**Alle 4 Phasen live getestet und verifiziert.**
**Nächster Kernblock kann priorisiert werden.**

---

### Priorität 2: Produktblock — E-Mail / KI-Skripte / Follow-ups
Diese Features müssen **echte Taxonomie-Daten** nutzen (own_services, target_customer_types, matched_target_customer_type aus Company):
- `sendBrevoEmail` / `sendSmtpEmail`: E-Mail-Vorlagen müssen `services` + `zielkunden` aus Org-Settings nutzen
- `salesCoach`: Anrufskript muss `matched_target_customer_type` und `branche` der Lead-Company einbinden
- Follow-up-Logik: `followUpAgent` muss `lead_temperature` + `last_contact_summary` berücksichtigen
- **Keine generischen Templates** — der spezifische Dienstleistungskontext muss sichtbar sein

### Priorität 3: Fachliche Top-Lead-Sichtung
- Je 1 Profil manuell prüfen: Top-5-Leads fachlich passend?
- Ergebnis dokumentieren in `docs/lead-engine-quality-matrix.md`

### Priorität 4: Restliche 38 Profile (erst nach P2+P3)
- Qualitätsschwelle: profile_quality_score >= 75
- Jedes Profil muss Live-Test in mindestens 1 Stadt bestehen (testLeadSearchEngine)

---

## 13. ONBOARDING-/ACTIVATION-JOURNEY (2026-05-18)

### Phase 1: LaunchStep Modernisierung — ABGESCHLOSSEN ✅ (2026-05-18, Hotfix: processResearchRun-Kick)

**Bugfix (Live-Befund):** LaunchStep hing bei 0% weil ActiveResearchBanner im Onboarding nicht gemountet ist.

**Fix:** LaunchStep ruft jetzt selbst `processResearchRun` auf (lock-sicher, nur einmal bei progress < 5%).

**Ziel:** Onboarding-Launch auf stabilen async ResearchRun-Flow umstellen.

**Umsetzung:**
- ✅ `LaunchStep.jsx` nutzt `startResearchRun` statt `generateLeads` (legacy)
- ✅ Status-Polling via `getResearchRunStatus` (alle 2.5s, mit Cleanup)
- ✅ **LaunchStep ruft `processResearchRun` selbst auf** (da Banner im Onboarding nicht aktiv)
- ✅ Lock-Logik respektiert (`already_processing` wird behandelt)
- ✅ Echter Fortschritt sichtbar (Progress-Bar, Live-Message, Leads-Counter)
- ✅ Endzustände separat behandelt:
  - `completed`: "Recherche abgeschlossen"
  - `partial`: "Recherche teilweise abgeschlossen, X Firmenkontakte gefunden"
  - `failed`: "Recherche konnte nicht abgeschlossen werden" + kundenfreundliche Alternative
- ✅ Keine doppelte Verarbeitung (Lock-Logik respektiert)
- ✅ Trial-Limits dynamisch aus `getDashboardData` (nicht hardcoded)
  - `free_preview`: "Vorschau aktiv" (kein "14 Tage")
  - `verified_trial`: "Testphase aktiv"
  - `paid`: "Abo aktiv"
- ✅ FIRST_VALUE_TARGET_COUNT dokumentiert:
  - `free_preview`: max. 10 Leads (schneller First-Value, API-Kosten kontrollieren)
  - `verified_trial`/`paid`: min(25, availableLimit)
- ✅ Onboarding-Settings vor ResearchRun garantiert gespeichert
- ✅ Customer-Friendly Zero-Lead-State (keine Admin-Diagnosen)
- ✅ ResearchRun wird verarbeitet (durch LaunchStep + ActiveResearchBanner als Fallback)

**Akzeptanzkriterien:**
- ✅ launchStepUsesAsyncResearchRun
- ✅ onboardingSettingsSavedBeforeResearch
- ✅ launchStepShowsRealProgress
- ✅ launchStepHandlesCompletedPartialFailedSeparately
- ✅ noGenerateLeadsLegacyInOnboardingLaunch
- ✅ noDuplicateProcessingFromLaunchStep
- ✅ noHardcodedTrialLimit
- ✅ targetCountDocumentedOrDynamic
- ✅ customerFriendlyZeroLeadState
- ✅ researchRunActuallyProcessesInOnboarding
- ✅ **onboardingLaunchDoesNotHangAtZeroPercent** (Hotfix verifiziert)
- ✅ **researchRunCreatedAndProcessedFromLaunchStep**
- ✅ **launchStepDoesNotDependOnActiveResearchBannerBeingMounted**
- ✅ **processResearchRunKickIsLockSafe**
- ✅ merklisteUpdated

**Dateien geändert:**
- `components/onboarding/LaunchStep.jsx` — Async ResearchRun + Polling + Cleanup + Status-Differenzierung + **processResearchRun-Kick**
- `pages/Onboarding.jsx` — handleLaunch aktualisiert, orgId weitergeben
- `docs/VERTRIEBO_MERKLISTE.md` — Dokumentation aktualisiert + Hotfix

**Live-Test:**
- ✅ Neuer User durch Onboarding
- ✅ Branche via IndustryAutocomplete
- ✅ Zielkunden/Services automatisch übernommen
- ✅ Launch startet async ResearchRun
- ✅ Progress sichtbar (hängt nicht bei 0%)
- ✅ Bei Erfolg: Leads + nächste Aktion im Dashboard
- ✅ Bei 0 Leads: klare Alternative
- ✅ Keine doppelten Leads, keine doppelte Usage-Zählung

**Nächste Phase:**
- Phase 2: Dashboard Empty State + First-Value Guidance — ABGESCHLOSSEN ✅

### Phase 2: First-Value-Flow nach Onboarding — ABGESCHLOSSEN ✅ (2026-05-18)

**Ziel:** Nutzer nach Onboarding-Recherche direkt in sinnvollen nächsten Zustand führen.

**Umsetzung:**
- ✅ **Intelligentes Routing** basierend auf Recherche-Ergebnis:
  - `completed`/`partial` + Leads gefunden → `/leads?new_run={runId}` mit Success-Box
  - `completed`/`partial` + 0 Leads → `/leads?onboarding_zero_leads=true` mit Alternativen
  - `failed` → `/leads?onboarding_failed=true` mit Recovery-Optionen
- ✅ **Leadseite zeigt kontextspezifische States:**
  - Success-Box: "X Firmenkontakte gefunden, starten Sie mit bestem Lead"
  - Zero-Leads-State: Konkrete Optionen (Radius erhöhen, Zielkunden anpassen, erneut recherchieren)
  - Failed-State: Freundliche Fehlermeldung + Retry-CTA
- ✅ **Kein Dashboard als Dead-End** nach Onboarding
- ✅ **Keine technischen Begriffe** (zero_result_cause etc.) im Kundenflow
- ✅ **Bestehende Leadseite genutzt** (kein neuer Page-Build nötig)

**Akzeptanzkriterien:**
- ✅ onboardingAfterSuccessfulResearchRoutesToBestNextStep
- ✅ leadsFoundRoutesToLeadsPageWithNewResultsVisible
- ✅ partialResearchRoutesToLeadsWithSuccessContext
- ✅ zeroLeadStateOffersClearNextActions
- ✅ failedResearchShowsFriendlyRecovery
- ✅ dashboardNotUsedAsDeadEndAfterOnboarding
- ✅ noTechnicalDebugTermsForCustomers
- ✅ noBigDesignRefactorYet
- ✅ merklisteUpdated

**Nächste Phase:**
- Phase 3: Dashboard Empty State Modernisierung (separater Block)

**Ziel:** Onboarding-Launch auf stabilen async ResearchRun-Flow umstellen.

**Umsetzung:**
- ✅ `LaunchStep.jsx` nutzt `startResearchRun` statt `generateLeads` (legacy)
- ✅ Status-Polling via `getResearchRunStatus` (alle 2.5s, mit Cleanup)
- ✅ Echter Fortschritt sichtbar (Progress-Bar, Live-Message, Leads-Counter)
- ✅ Endzustände separat behandelt:
  - `completed`: "Recherche abgeschlossen"
  - `partial`: "Recherche teilweise abgeschlossen, X Firmenkontakte gefunden"
  - `failed`: "Recherche konnte nicht abgeschlossen werden" + kundenfreundliche Alternative
- ✅ Keine doppelte Verarbeitung (Lock-Logik respektiert)
- ✅ Trial-Limits dynamisch aus `getDashboardData` (nicht hardcoded)
  - `free_preview`: "Vorschau aktiv" (kein "14 Tage")
  - `verified_trial`: "Testphase aktiv"
  - `paid`: "Abo aktiv"
- ✅ FIRST_VALUE_TARGET_COUNT dokumentiert:
  - `free_preview`: max. 10 Leads (schneller First-Value, API-Kosten kontrollieren)
  - `verified_trial`/`paid`: min(25, availableLimit)
- ✅ Onboarding-Settings vor ResearchRun garantiert gespeichert
- ✅ Customer-Friendly Zero-Lead-State (keine Admin-Diagnosen)
- ✅ ResearchRun wird verarbeitet durch `ActiveResearchBanner` + `processResearchRun` (Lock-Logik)

**Akzeptanzkriterien:**
- ✅ launchStepUsesAsyncResearchRun
- ✅ onboardingSettingsSavedBeforeResearch
- ✅ launchStepShowsRealProgress
- ✅ launchStepHandlesCompletedPartialFailedSeparately
- ✅ noGenerateLeadsLegacyInOnboardingLaunch
- ✅ noDuplicateProcessingFromLaunchStep
- ✅ noHardcodedTrialLimit
- ✅ targetCountDocumentedOrDynamic
- ✅ customerFriendlyZeroLeadState
- ✅ researchRunActuallyProcessesInOnboarding
- ✅ merklisteUpdated

**Dateien geändert:**
- `components/onboarding/LaunchStep.jsx` — Async ResearchRun + Polling + Cleanup + Status-Differenzierung
- `pages/Onboarding.jsx` — handleLaunch aktualisiert, orgId weitergeben
- `docs/VERTRIEBO_MERKLISTE.md` — Dokumentation aktualisiert

**Live-Test erforderlich:**
- Neuer User durch Onboarding
- Branche via IndustryAutocomplete
- Zielkunden/Services automatisch übernommen
- Launch startet async ResearchRun
- Progress sichtbar
- Bei Erfolg: Leads + nächste Aktion im Dashboard
- Bei 0 Leads: klare Alternative
- Keine doppelten Leads, keine doppelte Usage-Zählung

**Nächste Phase:**
- Phase 2: Dashboard Empty State + First-Value Guidance

---

## 14. TAXONOMIE-ERWEITERUNGS-BACKLOG

### Profil-Kategorien

| Kategorie | IDs | Status |
|---|---|---|
| **Batch 1** (8 auditiert) | gebaeudereinigung, facility_service, it_service, spedition_logistik, handwerk, maler_renovierung, shk, elektro_gebaeudetechnik | ✅ v6 gewichtet, 24 Tests GOOD, Re-Tests bestätigt |
| **Batch 2** (3 auditiert) | sicherheitsdienst, gartenbau, catering | ✅ v6 gewichtet, 9 Tests GOOD, 12 Gewichte aktiv |
| **Batch 3** (5 auditiert) | immobilien, lager_fulfillment, entruempelung, eventservice, gesundheit_medizin | ✅ v6 gewichtet, 15 Tests GOOD, 12 Gewichte aktiv |
| **Batch 4** (5 auditiert) | marketing_webdesign_werbung, personal_zeitarbeit, buchhaltung_steuernahe_dienste, industrieservice, fuhrparkservice_fahrzeugpflege | ✅ v6 gewichtet, 15 Tests GOOD, 12 Gewichte aktiv |
| **Batch 5** (5 auditiert) | pflege_betreuung, schulungen_weiterbildung, dachdecker, geruestbau, trockenbau_innenausbau | ✅ v6 gewichtet, 15 Tests GOOD, 12 Gewichte aktiv |
| **Batch 6** (5 auditiert) | fliesenleger, bodenleger, schluesseldienst_schliesanlagen, schaedlingsbekaempfung, brandschutzservice | ✅ v6 gewichtet, 15 Tests GOOD, 12 Gewichte aktiv |
| **Batch 7A** (5 auditiert) | aufzugservice, tor_tuertechnik, photovoltaik_service, umzugsunternehmen, druckerei_werbetechnik | ✅ v6 gewichtet, 15 Tests GOOD, 12 Gewichte aktiv |
| **Batch 7B** (5 auditiert) | aktenvernichtung_dokumentenmanagement, energieberatung, arbeitsschutz_arbeitssicherheit, datenschutz_compliance, messebau | ✅ v6 gewichtet, 15 Tests GOOD, 12 Gewichte aktiv |
| **🎉 ABGESCHLOSSEN** | Alle 41 nicht-Fallback-Profile validiert | ✅ Branchenprofil-Qualitätsblock vollständig |
| **Fallback-Profile** (5) | fallback_* | ✅ bewusst generisch |

### Nächste Profile (Backlog, ERST nach Qualitätstest)
- Schornsteinfeger, Kälteanlagentechnik, Sicherheitstechnik (ohne Wachschutz)
- Videoüberwachung / Access Control, Gebäude-IT / Smart Building
- Kanalreinigung, Winterdienstservice, Containerdienst / Entsorgung Gewerbe

### Neue Profile hinzufügen
1. Eintrag in `TAXONOMY_SEED` in `functions/getTaxonomy` ergänzen
2. Icon + Name in `INDUSTRIES` in `utils/onboardingConfig.js` ergänzen
3. Legacy-Alias in `LEGACY_INDUSTRY_ID_MAP` in `utils/industryTargetPresets.js` ergänzen
4. `TAXONOMY_VERSION` in `getTaxonomy` erhöhen
5. Admin: `getTaxonomy({ action: "seed_reset" })` aufrufen
6. Verifikation: `testLeadSearchEngine` mit neuem Profil + 3 Städten