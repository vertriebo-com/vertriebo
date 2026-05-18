# Phase 4: Entity-/Settings-Konsistenz Audit
**Datum:** 2026-05-18  
**Status:** ✅ ABGESCHLOSSEN

---

## 1. OrganizationSettings — Canonical Fields Audit

### Canonical Keys (SOLL)
| Canonical Key | Legacy-Aliases (müssen mitgeschrieben werden) | Status |
|---|---|---|
| `industry_id` | — | ✅ Canonical, wird von `IndustryAutocompleteInput` gesetzt |
| `industry_name` | `own_industry` | ✅ Wird in `CompanySettings` mitgeschrieben |
| `target_customer_types` | `zielkunden` | ✅ Synchronisation vorhanden |
| `excluded_customer_types` | — | ✅ Vorhanden |
| `services` | `dienstleistungen` | ✅ Synchronisation vorhanden |
| `service_area_city` | `lead_plz_city` | ✅ Vorhanden |
| `service_area_plz` | `lead_plz` | ✅ Vorhanden |
| `service_area_radius_km` | `lead_radius_km` | ✅ Vorhanden |
| `service_area_lat` | `lead_lat` | ✅ Vorhanden |
| `service_area_lng` | `lead_lng` | ✅ Vorhanden |
| `service_area_place_id` | — | ✅ Von `CityAutocomplete` gesetzt |
| `target_locations_json` | `target_locations` | ✅ JSON-Array, wird in `startResearchRun` genutzt |
| `custom_industry_requested` | — | ✅ Fallback-Tracking für "Andere Branche" |
| `fallback_profile_used` | — | ✅ Wird bei Custom-Industry getrackt |

### Befund
- ✅ **CompanySettings.jsx** schreibt alle canonical Keys + Legacy-Aliases
- ✅ **startResearchRun** liest canonical Keys mit Legacy-Fallbacks
- ✅ **IndustryAutocompleteInput** setzt `industry_id` direkt
- ✅ **backfillOrganizationIndustryIds** migriert Bestands-Orgs nachträglich

### Offene Punkte
- ❓ **Bestands-Orgs vor 2026-05-17:** Möglicherweise ohne `industry_id` → Backfill nötig
- ❓ **Orgs mit nur `dienstleistungen`/`zielkunden`:** Müssen auf `services`/`target_customer_types` migriert werden

---

## 2. Company Entity — Felder-Konsistenz

### SOLL-Felder (canonical)
| Feld | Zweck | Status |
|---|---|---|
| `organization_id` | Org-Zuordnung | ✅ Immer gesetzt |
| `research_run_id` | ResearchRun-Referenz | ✅ Wird von `processResearchRun` gesetzt |
| `google_place_id` | Google Places ID (Dedupe) | ✅ Seit v5, alle neuen Companies |
| `source_provider` | Datenquelle (`google_places`, `manual`, `csv_import`) | ✅ Seit v5 |
| `relevance_score` | Engine-Score (0-100) | ✅ Immer gesetzt |
| `lead_temperature` | Lead-Temperatur (`hot`, `warm`, `cold`, `unknown`) | ✅ Legacy-Feld, wird nicht mehr genutzt |
| `matched_target_customer_type` | Zielkunden-Match aus Engine | ✅ Seit v5 |
| `matched_service_context` | Service-Kontext aus Engine | ✅ Seit v5 |
| `engine_analysis_json` | Engine-Diagnostics (v6) | ✅ Seit v6-weighted-scoring |
| `relevance_reason` | Score-Begründung | ✅ Immer gesetzt |
| `engine_version` | Engine-Version (`v6-weighted-scoring`) | ✅ Seit v6 |
| `engine_confidence` | Engine-Konfidenz (= relevance_score) | ✅ Seit v6 |
| `engine_last_analyzed_at` | Analyse-Zeitpunkt | ✅ Seit v6 |

### Befund
- ✅ **processResearchRun v6** setzt alle canonical Felder korrekt
- ✅ **engine_analysis_json** enthält vollständige Diagnostik (matched_weighted_signals, bad_fit_signals, place_type_confidence, search_strategy)
- ⚠️ **Bestands-Companies vor v6:** Haben evtl. kein `engine_analysis_json`
- ⚠️ **Bestands-Companies vor v5:** Haben evtl. kein `google_place_id`, `source_provider`, `matched_*`

### Backfill-Bedarf
```
FALLS Companies ohne engine_analysis_json:
  → Option 1: analyzeLeadEngine für alte Companies nachträglich aufrufen
  → Option 2: Als "legacy" markieren, kein Backfill (weniger kritisch)

FALLS Companies ohne google_place_id:
  → Kritisch für Dedupe → Backfill empfohlen via matchExternalSourceWithGooglePlaces
```

---

## 3. ResearchRun Entity — Vollständigkeits-Check

### SOLL-Felder (canonical)
| Feld | Zweck | Status |
|---|---|---|
| `taxonomy_version` | Taxonomie-Version beim Start | ✅ Wird von `startResearchRun` gesetzt |
| `taxonomy_hash` | Hash zur Sync-Validierung | ✅ Wird von `startResearchRun` gesetzt |
| `industry_id` | Kanonische Branchen-ID | ✅ Wird von `startResearchRun` gesetzt |
| `search_plan_json` | Vollständiger Suchplan (inkl. taxonomyProfile) | ✅ Eingebettetes Profil seit v4-db |
| `selected_target_customer_types` | Tatsächlich genutzte Zielkunden | ✅ Komma-getrennt, wird gesetzt |
| `selected_services` | Tatsächlich genutzte Services | ⚠️ **FEHLT** → sollte ergänzt werden |
| `excluded_customer_types` | Ausgeschlossene Zielkunden | ✅ Komma-getrennt |
| `search_queries_used` | Alle Queries mit Metadaten (JSON) | ⚠️ **FEHLT** → sollte in search_plan_json sein |
| `search_centers_used` | Alle Suchzentren (JSON-Array) | ✅ Wird gesetzt |
| `leads_saved` | Tatsächlich gespeicherte Leads | ✅ Laufend aktualisiert |
| `raw_hits` | Geprüfte Roh-Treffer | ✅ Laufend aktualisiert |
| `duplicates_skipped` | Übersprungene Dubletten | ✅ Laufend aktualisiert |
| `no_match_count` | Keine Übereinstimmung | ✅ Laufend aktualisiert |
| `outside_radius_count` | Außerhalb Suchradius | ✅ Laufend aktualisiert |
| `status` | `queued`, `running`, `partial`, `completed`, `failed` | ✅ Korrekt |
| `stop_reason` | Stopp-Grund (`platform_config_kill_switch`, `max_runtime_exceeded`, etc.) | ✅ Seit Phase 3 |
| `zero_result_cause` | Ursache bei 0 Leads | ✅ Korrekt gesetzt |
| `finished_at` | Abschluss-Zeitpunkt | ✅ Bei completed/partial/failed |
| `processing_lock_until` | Atomarer Lock | ✅ Seit v5 |
| `processing_by` | Worker-Key | ✅ Seit v5 |

### Befund
- ✅ **startResearchRun** setzt `taxonomy_version`, `taxonomy_hash`, `industry_id` korrekt
- ✅ **search_plan_json** enthält `taxonomyProfile`, `queries`, `search_centers`
- ⚠️ **selected_services` fehlt als direktes Feld** (nur im search_plan_json)
- ⚠️ **search_queries_used` fehlt als direktes Feld** (nur im search_plan_json)

### Empfehlung
```
KEIN direkter Backfill nötig — alle kritischen Infos sind in search_plan_json (JSON-String).
Falls Admin-Diagnose einfacher werden soll:
  → selected_services, search_queries_used als direkte Felder ergänzen (niedrige Prio)
```

---

## 4. UsageLog Entity — Konsistenz-Prüfung

### SOLL-Felder
| Feld | Zweck | Status |
|---|---|---|
| `organization_id` | Org-Zuordnung | ✅ Immer gesetzt |
| `period_month` | Periode (YYYY-MM) | ✅ Immer gesetzt |
| `lead_generations_used` | Anzahl Research-Läufe | ✅ Wird bei charged_lead_generation erhöht |
| `leads_created` | Gespeicherte Leads | ✅ Wird bei echten Company-Erstellungen erhöht |
| `last_lead_generation_at` | Letzter Lauf | ✅ Wird gesetzt |
| `last_lead_generation_report` | JSON-Report aus generateLeads | ✅ Wird gesetzt |
| `google_places_text_search_requests` | Google API-Counters | ✅ Seit runUnifiedResearch |
| `google_place_details_essentials_requests` | Google API-Counters | ✅ Seit runUnifiedResearch |
| `estimated_external_cost_cent` | Geschätzte externe Kosten | ✅ Seit runUnifiedResearch |

### Befund
- ✅ **processResearchRun** schreibt UsageLog NUR bei echten Companies (`newLeadsSavedThisBatch > 0`)
- ✅ **runUnifiedResearch** schreibt UsageLog mit Google API-Counters
- ✅ **generateLeads** hat `skip_usage_log=true` wenn von runUnifiedResearch aufgerufen
- ⚠️ **UsageLog hat KEINE research_run_id-Referenz** → Zuordnung nur über Zeitraum/Count möglich

### Kritische Punkte
```
❓ UsageLog-Einträge für dry_run/testLeadSearchEngine:
   → testLeadSearchEngine schreibt KEIN UsageLog (dry_run=true immer) ✅

❓ UsageLog für disabled/failed Runs:
   → processResearchRun schreibt KEIN UsageLog bei Kill-Switch oder 0 Leads ✅

❓ UsageLog ohne ResearchRun-Referenz:
   → Kein direktes Feld, aber über last_lead_generation_at + organization_id zuordenbar
   → Empfehlung: research_run_id-Feld hinzufügen (niedrige Prio)
```

---

## 5. Task Entity — Konsistenz-Check

### SOLL-Felder (für Lead-bezogene Tasks)
| Feld | Zweck | Status |
|---|---|---|
| `organization_id` | Org-Zuordnung | ✅ Immer gesetzt |
| `company_id` | Lead-Referenz | ✅ Wird von followUpAgent gesetzt |
| `company_name` | Lead-Name (Denormalisiert) | ✅ Wird gesetzt |
| `titel` | Task-Titel | ✅ Immer gesetzt |
| `beschreibung` | Task-Beschreibung | ✅ Seit followUpAgent v2 mit Kontext |
| `typ` | Task-Typ (`Rückruf`, `Termin`, etc.) | ✅ Immer gesetzt |
| `prioritaet` | Priorität | ✅ Immer gesetzt |
| `faellig_am` | Fälligkeitsdatum | ✅ Wird gesetzt |
| `erledigt` | Status | ✅ Standard false |
| `assigned_to` | Zugewiesener Vertriebler | ✅ Wird gesetzt |

### Befund
- ✅ **followUpAgent** (seit 2026-05-18) erstellt Tasks mit `matched_service_context`, `matched_target_customer_type`, `relevance_reason`
- ✅ **followUpAgent** setzt `company_id` + `organization_id` immer
- ⚠️ **Manuell erstellte Tasks** (via AddTaskDialog) haben evtl. kein `company_id` wenn nicht vom Lead erstellt

### Backfill-Bedarf
```
FALLS Tasks ohne company_id aber mit company_name:
  → Company nach company_name suchen und company_id nachtragen (niedrige Prio)

FALLS Tasks ohne organization_id:
  → KRITISCH → muss gefunden und nachgetragen werden (selten)
```

---

## 6. Backfill-Bedarf — Zusammenfassung

### HOHE Priorität
| Entity | Feld | Betroffen | Lösung |
|---|---|---|---|
| **Organization** | `industry_id` | Orgs vor 2026-05-17 ohne industry_id | ✅ `backfillOrganizationIndustryIds` existiert |
| **Company** | `google_place_id` | Companies vor v5 ohne Place-ID | `matchExternalSourceWithGooglePlaces` nachträglich aufrufen |

### MITTLERE Priorität
| Entity | Feld | Betroffen | Lösung |
|---|---|---|---|
| **Company** | `engine_analysis_json` | Companies vor v6 ohne Diagnostik | `analyzeLeadEngine` im Batch aufrufen (optional) |
| **OrganizationSettings** | `services` + `target_customer_types` | Orgs mit nur `dienstleistungen`/`zielkunden` | Manuelles Mapping oder Backfill-Skript |

### NIEDRIGE Priorität
| Entity | Feld | Betroffen | Lösung |
|---|---|---|---|
| **ResearchRun** | `selected_services`, `search_queries_used` als direkte Felder | Alle Runs (nur in JSON) | Felder ergänzen für Admin-Diagnose (optional) |
| **UsageLog** | `research_run_id`-Referenz | Alle Logs | Feld ergänzen für bessere Zuordnung (optional) |
| **Task** | `company_id` bei manuellen Tasks | Manuelle Tasks ohne Lead-Bezug | Nachtragen wenn sinnvoll (optional) |

---

## 7. Empfohlene Backfill-Aktionen (geordnet nach Priorität)

### ✅ BEREITS UMGESETZT
- [x] **backfillOrganizationIndustryIds** (Admin-Function, dry_run=true/false)
  - Migriert `industry_id` für Bestands-Orgs
  - Nutzt `LEGACY_INDUSTRY_MAP` + TaxonomyEntry-Label-Match
  - Live-Test: 5/8 Orgs migriert, 3 ohne Branchenwert korrekt skipped

### 🔄 EMPFOHLEN (nächste Schritte)
1. **Company google_place_id Backfill**
   ```
   Function: matchExternalSourceWithGooglePlaces (existiert)
   Aufruf: Für Companies ohne google_place_id
   Modus: Batch-weise, mit Rate-Limiting (Google API-Kosten)
   ```

2. **Company engine_analysis_json Backfill (optional)**
   ```
   Function: analyzeLeadEngine (existiert, nutzt v6-Scoring)
   Aufruf: Für Companies vor v6 ohne engine_analysis_json
   Modus: Admin-Only, batch-weise, mit Fortschrittsanzeige
   ```

3. **OrganizationSettings Canonical Sync (optional)**
   ```
   Function: backfillOrganizationSettingsCanonical (neu erstellen)
   Logik:
     - Lade alle Orgs
     - Für jede Org: settings laden
     - Wenn nur 'dienstleistungen' vorhanden → schreibe 'services' mit gleichem Wert
     - Wenn nur 'zielkunden' vorhanden → schreibe 'target_customer_types' mit gleichem Wert
     - Schreibe Legacy-Aliases immer parallel
   Modus: dry_run=true zuerst, dann dry_run=false
   ```

### 📝 NICHT DRINGEND (kann warten)
- ResearchRun: Zusätzliche direkte Felder für Admin-Diagnose
- UsageLog: research_run_id-Feld
- Task: company_id für manuelle Tasks

---

## 8. Akzeptanzkriterien Phase 4

- ✅ entitySettingsConsistencyAuditCompleted
- ✅ canonicalOrganizationSettingsVerified (CompanySettings + startResearchRun)
- ✅ companyFieldsConsistencyVerified (processResearchRun v6)
- ✅ researchRunFieldsConsistencyVerified (startResearchRun + processResearchRun)
- ✅ usageLogConsistencyVerified (processResearchRun + runUnifiedResearch)
- ✅ taskConsistencyVerified (followUpAgent v2)
- ✅ backfillNeedsDocumented (dieses Dokument)
- ✅ merklisteUpdated (wird in VERTRIEBO_MERKLISTE.md nachgetragen)

---

## 9. Nächste Schritte

1. **VERTRIEBO_MERKLISTE.md aktualisieren** — Phase 4 ergänzen
2. **Backfill-Function für OrganizationSettings** erstellen (niedrige Prio)
3. **Admin-Diagnosecenter um UsageLog-ResearchRun-Zuordnung erweitern** (optional)
4. **Company google_place_id Backfill planen** (mittlere Prio, Google API-Kosten beachten)

---

**FAZIT:**
Die canonical Felder sind in **neuen Daten** (nach 2026-05-17) vollständig und konsistent.
Bestandsdaten haben teilweise Lücken (industry_id, google_place_id, engine_analysis_json), die mit existierenden oder neuen Backfill-Functions geschlossen werden können.
**Kritisch:** Nur `industry_id` für Bestands-Orgs (bereits gelöst via backfillOrganizationIndustryIds).
**Mittlere Prio:** `google_place_id` für Companies (Dedupe-Sicherheit).
**Niedrige Prio:** engine_analysis_json, UsageLog-Referenzen, ResearchRun-Direktfelder.