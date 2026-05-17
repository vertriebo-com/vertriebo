# Vertriebo Merkliste – Architektur & Entscheidungen

_Zuletzt aktualisiert: 2026-05-17_

---

## ██████████████████████████████████████████████████████████
## P0 DAUERREGEL: Zentrale Bausteine statt Einzel-Fixes
## ██████████████████████████████████████████████████████████

> **Gilt ab sofort für ALLE Änderungen an Vertriebo.**
> Diese Regel hat die höchste Priorität. Sie ist keine Empfehlung, sondern Pflicht.

### Grundsatz

**VERBOTEN:**
- Eine einzelne Seite fixen, ohne die anderen zu prüfen
- Einen Key nur an einer Stelle ändern
- Ein Problem lokal lösen, ohne auf Duplikate zu prüfen
- Eine Logik zweimal implementieren (Onboarding ≠ Settings ≠ ResearchDialog)
- Zwei parallele Taxonomie-Systeme pflegen

**PFLICHT:**
- Zentralen Baustein / zentrale Resolver-Logik bauen
- Diesen Baustein überall verwenden
- Backend-Resolver absichern (Priorität: canonical > legacy)
- Legacy-Daten weiter unterstützen
- Diese Merkliste aktualisieren

---

### Pflicht-Check vor JEDER Änderung

Vor jeder Umsetzung folgende Fragen beantworten:

1. Gibt es dafür schon eine bestehende Logik? → Zuerst wiederverwenden.
2. Gibt es mehrere Stellen, die dasselbe machen? → Zusammenführen.
3. Muss daraus ein wiederverwendbarer Baustein werden?
4. Betrifft es **Onboarding**? → `pages/Onboarding` + `components/onboarding/*`
5. Betrifft es **Einstellungen**? → `pages/SettingsPage` + `components/settings/*`
6. Betrifft es **ResearchDialog**? → `components/leads/ResearchDialog`
7. Betrifft es **Leadseite / LeadDetail**? → `pages/Leads` + `pages/LeadDetail`
8. Betrifft es **Dashboard / Usage**? → `pages/Dashboard` + `UsageLog` Entity
9. Betrifft es **Billing / Limits**? → `components/settings/BillingSettings` + Plan-Entity
10. Betrifft es **Backend-Resolver oder Entity-Schema**? → `processResearchRun` / `startResearchRun`
11. Muss **diese Merkliste** aktualisiert werden? → Immer wenn neue Regel/Baustein entsteht.

---

### Gilt für diese Bereiche (vollständige Liste)

| Bereich | Zentraler Baustein / Resolver |
|---------|-------------------------------|
| Ortsauswahl / Suchgebiet | `components/LocationAutocomplete.jsx` |
| Zielkunden / Branche / Ausschlüsse | `utils/industryTargetPresets.js` → leitet aus `utils/leadSearchTaxonomy.js` ab |
| Branchen-Taxonomie (Single Source) | `utils/leadSearchTaxonomy.js` (NIEMALS duplizieren) |
| Lead-Recherche Settings | `resolveResearchSettings()` in `generateLeads` |
| Google / Places API | `functions/geocodeCity` (Backend-Proxy) |
| Zusätzliche Zielorte | `target_locations_json` (canonical) + Legacy-Kommaliste |
| Billing / Plan-Limits | `Plan`-Entity + `UsageLog` |
| Rollen / Zugriff | `OrganizationMember.role` + `OnboardingGuard` |
| E-Mail-Templates | `functions/initOrgEmailTemplates` |
| Engine / Temperatur-Analyse | `functions/analyzeLeadTemperature` |
| Async Research | `startResearchRun` → `processResearchRun` → `getResearchRunStatus` |

---

## ██████████████████████████████████████████████████████████
## ARCHITEKTUR: PRESET / KEYWORD ENGINE
## ██████████████████████████████████████████████████████████

### Single Source of Truth: leadSearchTaxonomy.js

```
utils/leadSearchTaxonomy.js   ← DIE EINZIGE TAXONOMIE-QUELLE
  └── utils/industryTargetPresets.js  (re-exportiert, kein Duplikat)
        └── components/onboarding/TargetingStep
        └── components/settings/CompanySettings
        └── components/onboarding/CompanyStep
  └── functions/processResearchRun  (Inline-Kopie nur als Fallback-Notlösung)
```

**Regel:** Jede Änderung an Branchen-Presets, Zielkunden, Keywords, Ausschlüssen
MUSS in `leadSearchTaxonomy.js` gemacht werden. Kein anderer Ort.

### Canonical Settings Keys (Lesen & Schreiben)

| Feld | Canonical Key | Legacy Keys (lesen, nicht schreiben) |
|------|---------------|--------------------------------------|
| Zielkunden | `target_customer_types` | `zielkunden` |
| Dienstleistungen | `services` | `dienstleistungen` |
| Ausschlüsse | `excluded_customer_types` | `zielkunden_ausschluss` |
| Branche | `industry_name` | `own_industry`, `org.industry` |
| Suchgebiet-Stadt | `service_area_city` | `lead_plz_city` |
| Koordinaten | `service_area_lat/lng` | — |
| Radius | `service_area_radius_km` | `lead_radius_km` |
| Zielorte (strukturiert) | `target_locations_json` | `target_locations`, `additional_cities` |

**Onboarding schreibt:** `target_customer_types`, `excluded_customer_types`, `services`  
**CompanySettings schreibt:** ALLE canonical Keys + Legacy Keys synchron  
**processResearchRun liest:** canonical > legacy (Resolver-Logik)

### Zielkunden / Dienstleistungen / Ausschlüsse — echte Wirkung

Diese Einstellungen beeinflussen systemweit:

| Einstellung | Wirkung |
|------------|---------|
| `target_customer_types` | → SearchPlan-Queries in processResearchRun |
| `target_customer_types` | → Lead-Scoring (matched_target_customer_type) |
| `excluded_customer_types` | → negative Suchbegriffe + badFitSignals-Prüfung |
| `services` | → E-Mail-Vorlagen (via initOrgEmailTemplates + Kontextvariablen) |
| `services` | → KI-Skripte (salesCoach / getKiRecommendation) |
| `services` | → Follow-up-Texte (followUpAgent) |

**WICHTIG:** UI-Text darf NICHT versprechen was das Backend nicht umsetzt.
Vor jedem neuen UI-Label prüfen: Hat das einen echten Backend-Effekt?

---

## ██████████████████████████████████████████████████████████
## ARCHITEKTUR: ASYNC RESEARCH RUN
## ██████████████████████████████████████████████████████████

### Flow

```
1. startResearchRun    → ResearchRun Entity erstellen (status: queued)
2. processResearchRun  → Batches abarbeiten (Google Places, Scoring, Speichern)
3. getResearchRunStatus → Frontend pollt alle 3 Sekunden
4. Leads-Seite         → zeigt ActiveResearchBanner während aktiv
5. Neue Leads          → erscheinen automatisch in der Leadliste
```

### Regeln

- `processResearchRun` läuft in kleinen Batches (idempotent, restartable)
- UsageLog zählt NUR echte Company-Erstellungen (kein raw_hits)
- `generateLeads` (alter direkter Flow) bleibt für Trial-Recherche erhalten
- `runUnifiedResearch` ist für zukünftige v2 reserviert, NICHT im Kundenflow

### Query-Generierung

- **City-free Queries:** Wenn `service_area_lat/lng` vorhanden → keine Stadt im Query
- **City-Fallback:** Nur wenn keine Koordinaten → `{keyword} {stadtname}`
- **Search Centers:** Hauptort + Zielorte aus `target_locations_json`
- **FastMode:** max. 3-4 Query-Stems pro Vertikal, Core-Terme only, früh stoppen
- **Normalmodus:** alle queryPriority-Einträge, Varianten, mehrere Runden

### ResearchRun-Metadaten (geplant / vorbereitet)

ResearchRun speichert bereits:
- `search_plan_json`: generierte Queries mit source/family/weight
- `target_customer_types`: genutzte Zielkunden
- `excluded_customer_types`: angewandte Ausschlüsse
- `summary`: Ergebnis-JSON mit Statistiken

Geplant (nächste Iteration):
- `preset_version`: Taxonomie-Version zum Zeitpunkt des Runs
- `vertical_slug`: Branche als Taxonomy-ID
- `query_families_json`: strukturierte Query-Familien

---

## Konkrete Beispiele für korrekte Umsetzung

### Ortsauswahl (umgesetzt 2026-05-16)
```
LocationAutocomplete (components/LocationAutocomplete.jsx)
  └── Onboarding (CompanyStep)
  └── Settings (CompanySettings via CityAutocomplete-Alias)
  └── ResearchDialog (bei fehlendem Ort)
```
Strukturierte Daten:
- `service_area_city`, `service_area_place_id`, `service_area_lat`, `service_area_lng`
- `target_locations_json`: `[{ city, label, place_id, lat, lng, country }]`
- Legacy weiter unterstützt: `lead_plz_city`, `target_locations`, `additional_cities`

### Zielkunden / Branche (umgesetzt 2026-05-17)
```
leadSearchTaxonomy.js (EINZIGE QUELLE)
  → industryTargetPresets.js (re-export, kein Duplikat)
    → TargetingStep (Onboarding)  speichert: target_customer_types, excluded_customer_types, services
    → CompanySettings (Settings)  liest + schreibt canonical + legacy Keys synchron
  → processResearchRun (Backend)  liest canonical, nutzt Taxonomy für Queries
```

---

## KRITISCHE ARCHITEKTUR-REGEL: Keine verschachtelten Function-Calls

> **Eingeführt: 2026-05-16 nach Timeout-Bug**

`runUnifiedResearch` hat per `base44.functions.invoke("generateLeads", ...)` eine Funktion in einer Funktion aufgerufen → **Timeout im Kundenflow**.

**Regel:** Orchestratoren dürfen NICHT andere schwere Backend-Functions aufrufen.

**Aktueller MVP-Zustand:**
- `ResearchDialog` → ruft direkt `startResearchRun` auf
- `processResearchRun` → läuft als Automation / per Polling
- `runUnifiedResearch` → für zukünftige v2 reserviert

---

## KRITISCHE ARCHITEKTUR-REGEL: Canonical Research Settings Resolver

> **Eingeführt: 2026-05-16 nach Settings-Key-Mismatch-Audit**

Priorität: `org.*` > canonical Settings > legacy Settings > Geocoding-Fallback

**Regeln**
- **Keine Stadt-Sonderfälle.** Kein Hardcode für Neuwied, Koblenz oder andere Städte.
- **Jede neue UI-Einstellung → Resolver updaten.**
- **`target_locations_json`** ist canonical für Zielorte mit Koordinaten.
- **Bei 0 Ergebnissen** → intern `zero_result_cause` setzen.

---

## Gelöschte / deprecated Komponenten

| Datei | Status | Grund |
|-------|--------|-------|
| `components/settings/LeadGenSettings` | **GELÖSCHT 2026-05-17** | Veraltete PLZ-Logik, wurde durch CompanySettings ersetzt, war nirgends mehr gerendert |
| `utils/industryTargetPresets.js` (alte hardcodierte Presets) | **Ersetzt 2026-05-17** | Leitet jetzt aus leadSearchTaxonomy.js ab, kein Duplikat mehr |

---

## Backlog

- [ ] processResearchRun: Inline-Taxonomy durch Import aus leadSearchTaxonomy.js ersetzen (sobald Backend-Imports unterstützt werden)
- [ ] preset_version + vertical_slug in ResearchRun speichern
- [ ] Register-Integration aktivieren (syncOpenRegister im Hintergrund)
- [ ] Admin-Dashboard: Überblick über Research-Runs + Auto-Matches
- [ ] Performance-Optimierung: parallele Grid-Punkte bei Google
- [ ] ResearchDialog: LocationAutocomplete wenn Ort fehlt oder überschrieben werden soll
- [ ] FastMode als eigener Modus mit eigenem Budget und Core-Terms-Only-Logik