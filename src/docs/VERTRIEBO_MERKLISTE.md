# VERTRIEBO ARCHITEKTUR-MERKLISTE
## Stand: 2026-05-17 | v4-db — FINAL VERIFIZIERT

> **PFLICHTREGEL: Nicht "akzeptabel" — produktionsreif, kundenreif, robust.**
> Jede Entscheidung muss diese Standards erfüllen. Keine Dummy-Logik, keine doppelte Wahrheit, keine technischen Schulden an der Kernfunktion.

---

## 1. TAXONOMIE — EINZIGE WAHRHEITSQUELLE: DATENBANK

### Architektur (produktionsreif ab v4-db-2026-05)

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
processResearchRun (Backend)
    ├── liest taxonomyProfile aus searchPlan
    ├── KEINE eigene Taxonomie-Kopie
    └── buildQueriesFromProfile(taxonomyProfile, ...)
```

### Regeln
- **EINE Wahrheitsquelle:** TaxonomyEntry in der DB. `utils/leadSearchTaxonomy.js` ist KEIN Runtime-Datum mehr — nur historische Referenz.
- **Kein Copy-Paste** zwischen Frontend und Backend.
- **Kein Inline-Taxonomy-Objekt** in processResearchRun.
- **Self-Seeding:** getTaxonomy initialisiert DB automatisch beim ersten Aufruf.
- **Admin-Reset:** `getTaxonomy({ action: "seed_reset" })` setzt Seed neu.
- **Hash-Tracking:** `taxonomy_hash` in jedem ResearchRun → vollständige Rückverfolgung.
- **taxonomy_profile_missing = HARD FAIL:** processResearchRun bricht sofort mit status=failed ab wenn kein Profil im Plan.

### Taxonomie ändern
1. `TAXONOMY_SEED` in `functions/getTaxonomy` aktualisieren
2. `TAXONOMY_VERSION` erhöhen (Format: `v{N}-db-{YYYY-MM}`)
3. In DB: `getTaxonomy({ action: "seed_reset" })` aufrufen (Admin)
4. Nächster ResearchRun nutzt neue Daten mit neuem Hash
5. **Kein Frontend-Code ändern nötig** — Adapter lädt frische Daten

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
   - buildQueriesFromProfile(taxonomyProfile, targetCustomerTypes, excluded, ...)
   - city_mode='geo_only' wenn Koordinaten vorhanden
   - Queries mit Metadaten: family, weight, source, matched_target_customer
   - Scoring via scoreCandidate(place, taxonomyProfile, ...)
   - Speichert Company mit matched_target_customer_type, matched_service_context
   - UsageLog nur bei tatsächlich gespeicherten Companies
   ↓
4. Frontend zeigt done=true → onSuccess() → refetch()
```

### Scoring-Schwellwert
- `score >= 55` → Lead wird gespeichert
- `badFit = true` → immer verwerfen (negativeKeywords, badFitSignals aus DB-Profil)

### Zero-Result-Diagnose (zero_result_cause)
- `taxonomy_profile_missing` → **HARD FAIL**: kein Profil in search_plan_json.taxonomyProfile → sofortiger Abbruch mit status=failed, kein stilles Weiterlaufen
- `no_queries_built` → Profil vorhanden, aber keine Kategorien aus Zielkunden ableitbar
- `no_geo_coords` → Stadt nicht aufgelöst
- `no_google_results` → Google API hat nichts zurückgegeben
- `all_duplicates` → alle Treffer schon in DB
- `no_match_score` → Scoring zu streng oder BadFit
- `all_queries_exhausted` → alle Batches fertig, 0 Leads

**KRITISCHE REGEL:** processResearchRun darf NIEMALS ohne taxonomyProfile weiterlaufen.
Fehlendes Profil = sofortiger status='failed' + error='taxonomy_profile_missing'. Kein Fallback-Score.

---

## 4. TAXONOMIE-FELDER (TaxonomyEntry)

| Feld | Zweck | Genutzt von |
|---|---|---|
| `industry_id` | Kanonische ID | Alle |
| `label` | Anzeigename | UI |
| `own_services` | Eigene Leistungen | E-Mail-Vorlagen, KI-Skripte, Follow-up |
| `target_customer_types` | Zielkunden | UI, Query-Priorität, Scoring |
| `excluded_customer_types` | Ausschlüsse | Query-Filter |
| `searchable_business_categories` | Google-Suchkategorien | Query-Building |
| `search_keyword_variants` | Suchbegriff-Varianten | Query-Building |
| `negative_keywords` | Ausschluss-Keywords | Scoring (BadFit) |
| `bad_fit_signals` | BadFit-Signale | Scoring |
| `scoring_signals` | Relevanz-Signale | Scoring (+15 Punkte) |
| `query_priority` | Kategorie-Reihenfolge | Query-Building |
| `ideal_customer_profiles` | Qualitative Profile | NUR KI/Scoring, NICHT als rohe Queries |
| `google_place_types` | Place-Types | Zukünftig für Type-Filter |
| `content_hash` | Sync-Validierung | taxonomy_hash im ResearchRun |

---

## 5. UI-KOMPONENTEN (Stand 2026-05-17)

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

## 6. VERBOTENE PATTERNS (hart, keine Ausnahmen)

1. **Eigene Taxonomie-Daten in UI-Komponenten** → immer `useTaxonomy` / `industryTargetPresets.js`
2. **Inline-Taxonomie in Backend-Functions** → getTaxonomy ist die Quelle
3. **Manueller Sync zwischen Frontend und Backend** → nicht mehr nötig, DB ist SSOT
4. **Settings-Keys ohne Legacy-Aliases** → immer vollständige Tabelle aus §2
5. **InvokeLLM für Suche** → nur für Scoring, Empfehlung, Skripte, Follow-up
6. **Nested setTimeout/setInterval in Backend-Functions** → Deno Deploy unterstützt das nicht
7. **KI ohne echte Daten** → matched_target_customer_type, services etc. müssen aus echten Settings kommen
8. **UsageLog erhöhen ohne echte Company-Erstellung** → IllegalState, Sofort-Fix erforderlich
9. **runUnifiedResearch im Live-Kundenflow** → nicht nutzen bis Queue-Architektur stabil

---

## 7. BACKEND-FUNCTIONS (aktuell)

| Function | Zweck | Auth |
|---|---|---|
| `getTaxonomy` | Kanonische Taxonomie laden | public read |
| `startResearchRun` | ResearchRun erstellen + Taxonomie einbetten | user |
| `processResearchRun` | Batches ausführen, Companies speichern | user |
| `getResearchRunStatus` | Status-Polling | user |
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

## 8. TAXONOMIE-CHANGELOG

| Version | Datum | Architektur |
|---|---|---|
| v1 | 2024 | Initial, ~8 Branchen, inline in Functions |
| v2 | 2025-01 | 15 Branchen, utils/leadSearchTaxonomy.js |
| v3-async | 2025-06 | 23 Branchen, async batch, Frontend-SSOT |
| v4-ssot-2026-05 | 2026-05-17 | Frontend-SSOT via industryTargetPresets.js |
| **v4-db-2026-05** | **2026-05-17** | **DB als SSOT, TaxonomyEntry Entity, kein Copy-Paste** |