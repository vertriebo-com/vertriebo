# VERTRIEBO ARCHITEKTUR-MERKLISTE
## Stand: 2026-05-17 | v4-ssot

> **PFLICHTLEKTÜRE vor jedem Feature.** Verstöße gegen diese Regeln führen zu inkonsistentem Verhalten, Datenverlust und schwer debuggbaren Fehlern.

---

## 1. SINGLE SOURCE OF TRUTH — TAXONOMIE

### Frontend: `utils/leadSearchTaxonomy.js`
Die **einzige** autorisierte Quelle für:
- Branchen-IDs und Labels
- `targetCustomerTypes` (Zielkunden)
- `ownServices` (Dienstleistungen)
- `excludedCustomerTypes` (Ausschlüsse)
- `searchableBusinessCategories` (Google-Suchkategorien)
- `searchKeywordVariants` (Suchbegriff-Varianten)
- `negativeKeywords` / `badFitSignals`
- `scoringSignals`
- `queryPriority`
- `idealCustomerProfiles` (nur Scoring/KI, NICHT für rohe Suche)
- `googlePlaceTypes`

### Backend: `functions/processResearchRun` (TAXONOMY_DATA)
- Die `TAXONOMY_DATA`-Konstante in `processResearchRun` ist eine **1:1-Kopie** von `leadSearchTaxonomy.js`.
- Deno Deploy erlaubt keine lokalen Imports → Kopie ist technisch notwendig.
- **Bei jeder Taxonomie-Änderung: BEIDE Dateien aktualisieren.**
- `TAXONOMY_VERSION` im Backend muss bei inhaltlichen Änderungen erhöht werden (Format: `v{N}-{slug}-{YYYY-MM}`).
- `taxonomy_version` wird in jedem ResearchRun gespeichert → Rückverfolgung möglich.

### Adapter: `utils/industryTargetPresets.js`
- **Enthält KEINE eigenen Daten** — leitet ausschließlich aus `leadSearchTaxonomy.js` weiter.
- Alle UI-Komponenten importieren von hier (Onboarding, CompanySettings, TargetingStep).
- Stellt `INDUSTRY_PRESETS`, `getIndustryPreset`, `getIndustryIdByLabel`, `getIndustryLabels` bereit.

**VERBOTEN:**
- Eigene Branchen-Arrays in Components, Pages oder Utility-Dateien.
- Hardcodierte Keyword-Listen außerhalb der Taxonomy.
- `ZIELKUNDEN_SEARCH_MAPPING` oder ähnliche lokale Mappings.

---

## 2. KANONISCHE SETTING-KEYS (OrganizationSettings)

Beim Speichern IMMER **alle** dieser Keys synchron befüllen:

| Canonical Key | Legacy-Aliases (auch schreiben) |
|---|---|
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

---

## 3. RESEARCH ENGINE — processResearchRun

### Query-Building
- `hasGeoCoords = true` → `cityMode = 'geo_only'` → **kein Stadtname im Query-String** (Google nutzt `locationBias`)
- `hasGeoCoords = false` → `cityMode = 'keyword_with_city'` → Stadt ggf. in Query
- Queries haben Metadaten: `family`, `weight`, `source`, `city_mode`, `matched_target_customer`, `excluded_terms_applied`

### Ausschlüsse
- `excludedCustomerTypes` aus den Settings → werden beim Query-Building gefiltert (Kategorien werden entfernt)
- `negativeKeywords` + `badFitSignals` aus Taxonomy → Scoring-Penalty (-40 Punkte → shouldSave = false)

### Zielkunden-Wirkung
- Nutzer-definierte `targetCustomerTypes` → höchste Query-Priorität (weight 10)
- Taxonomy-`queryPriority` → zweite Priorität
- Rest der `searchableBusinessCategories` → dritte Priorität

### ResearchRun-Felder (NEU in v4)
| Feld | Beschreibung |
|---|---|
| `taxonomy_version` | Version der genutzten Taxonomie |
| `industry_id` | Normalisierte Branchen-ID |
| `selected_target_customer_types` | Gewählte Zielkunden |
| `selected_services` | Gewählte Dienstleistungen |
| `excluded_customer_types` | Aktive Ausschlüsse |
| `query_families_used` | JSON-Array der genutzten Keyword-Familien |
| `search_queries_used` | JSON mit allen Queries + Metadaten |
| `city_mode` | geo_only oder keyword_with_city |
| `search_centers_used` | JSON-Array der genutzten Geo-Zentren |
| `zero_result_cause` | Diagnose-Feld bei 0 Leads |
| `raw_hits` | Anzahl geprüfter Google-Treffer |

### Scoring-Schwellwert
- `score >= 55` → Lead wird gespeichert
- `badFit = true` → immer verwerfen

---

## 4. ONBOARDING → SETTINGS → RESEARCH SYNCHRONISATION

```
Onboarding (TargetingStep)
  → getIndustryPreset(industryId) aus industryTargetPresets.js
  → speichert: target_customer_types, excluded_customer_types, services

CompanySettings
  → liest: map.target_customer_types || map.zielkunden
  → schreibt: ALLE kanonischen Keys (Tabelle oben)
  → Zielkunden-Optionen: currentPreset?.targetCustomerTypes || BASE_ZIELKUNDEN_OPTIONS

startResearchRun (Backend)
  → liest OrganizationSettings: target_customer_types, excluded_customer_types, services
  → baut search_plan_json mit diesen Werten

processResearchRun (Backend)
  → liest search_plan_json.targetCustomerTypes
  → buildQueriesForIndustry() filtert mit excludedCustomerTypes
  → speichert matched_target_customer_type auf jede Company
```

---

## 5. UI-KOMPONENTEN — ZUSTAND (2026-05-17)

| Komponente | Status | Anmerkung |
|---|---|---|
| `TargetingStep` | ✅ Taxonomy-basiert | nutzt `getIndustryPreset` |
| `CompanySettings` | ✅ Taxonomy-basiert | kein lokales Mapping mehr |
| `ResearchDialog` | ✅ Funktional | pollt `getResearchRunStatus` |
| `ActiveResearchBanner` | ✅ Funktional | zeigt Fortschritt |
| `Leads` | ✅ Funktional | filter + sort korrekt |
| `LeadDetail/EngineBox` | ✅ Funktional | zeigt engine_analysis_json |
| `Dashboard` | ✅ Funktional | getDashboardData korrekt |
| `SettingsPage` | ✅ Tabs korrekt | Admin vs Sales Rep |
| `BillingSettings` | ✅ Stripe Checkout | createCheckoutSession |
| `PlatformAdmin` | ✅ Funktional | getPlatformAdminData |

**GELÖSCHT (bewusst entfernt):**
- `LeadGenSettings` → war obsolet, doppelte Logik

---

## 6. BACKEND-FUNCTIONS — ÜBERSICHT

| Function | Zweck | Auth |
|---|---|---|
| `startResearchRun` | Erstellt ResearchRun, baut Suchplan | user |
| `processResearchRun` | Führt Batches aus, speichert Companies | user |
| `getResearchRunStatus` | Pollt Status eines Runs | user |
| `analyzeLeadEngine` | Phase-1 Engine-Analyse eines Leads | user |
| `analyzeLeadTemperature` | Temperatur-Analyse (hot/warm/cold) | user |
| `getKiRecommendation` | KI-Empfehlung für Lead | user |
| `getDashboardData` | Dashboard-Aggregation | user |
| `checkAccess` | Organisations-Berechtigungsprüfung | user |
| `enrichCompany` | Firmen-Anreicherung (Kontaktdaten) | user |
| `generateLeads` | Legacy-Endpoint (nutzt processResearchRun) | user |
| `startResearchRun` | Suchplan aufbauen + queuen | user |
| `geocodeCity` | Stadt → Koordinaten | user |
| `sendBrevoEmail` | E-Mail via Brevo | user |
| `sendSmtpEmail` | E-Mail via SMTP | user |
| `salesCoach` | KI-Anrufcoach | user |
| `morningReport` | Tagesreport-Generator | user |
| `priorityAgent` | Prioritätslisten-Agent | user |
| `followUpAgent` | Follow-up-Vorschläge | user |
| `cleanupAgent` | Daten-Bereinigung | admin |
| `platformAdmin` | Plattform-Verwaltungsoperationen | admin |
| `createCheckoutSession` | Stripe Checkout | user |
| `createPortalSession` | Stripe Kundenportal | user |
| `stripeWebhook` | Stripe-Webhook-Handler | webhook |

---

## 7. VERBOTENE PATTERNS

1. **Eigene Taxonomie-Daten in UI-Komponenten** → immer `utils/industryTargetPresets.js`
2. **`processResearchRun` Taxonomy ohne Sync** → beide Dateien müssen identisch sein
3. **Settings-Keys ohne Legacy-Aliases** → immer vollständige Tabelle aus §2
4. **Lokale Imports in Deno Functions** → technisch unmöglich, Inlining verwenden
5. **InvokeLLM für Suche** → nur für Scoring, Empfehlung, Skripte, Follow-up
6. **Nested setTimeout/setInterval in Backend-Functions** → Deno Deploy unterstützt das nicht
7. **KI ohne echte Daten** → matched_target_customer_type, services etc. müssen aus echten Settings kommen

---

## 8. TAXONOMIE-CHANGELOG

| Version | Datum | Änderung |
|---|---|---|
| v1 | 2024-xx | Initial, ~8 Branchen |
| v2 | 2025-01 | Erweiterung auf 15 Branchen |
| v3-async | 2025-06 | Async batch processing, 23 Branchen |
| v4-ssot-2026-05 | 2026-05-17 | SSOT-Konsolidierung, Query-Metadaten, zero_result_cause, city_mode, Taxonomie-Sync Frontend↔Backend |