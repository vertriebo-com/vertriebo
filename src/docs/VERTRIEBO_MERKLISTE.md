# Vertriebo Merkliste – Architektur & Entscheidungen

_Zuletzt aktualisiert: 2026-05-16_

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
10. Betrifft es **Backend-Resolver oder Entity-Schema**? → `generateLeads` Resolver updaten
11. Muss **diese Merkliste** aktualisiert werden? → Immer wenn neue Regel/Baustein entsteht.

---

### Gilt für diese Bereiche (vollständige Liste)

| Bereich | Zentraler Baustein / Resolver |
|---------|-------------------------------|
| Ortsauswahl / Suchgebiet | `components/LocationAutocomplete.jsx` |
| Zielkunden / Branche / Ausschlüsse | `components/settings/CompanySettings` + Resolver in `generateLeads` |
| Lead-Recherche Settings | `resolveResearchSettings()` in `generateLeads` |
| Google / Places API | `functions/geocodeCity` (Backend-Proxy) |
| Zusätzliche Zielorte | `target_locations_json` (canonical) + Legacy-Kompaliste |
| Billing / Plan-Limits | `Plan`-Entity + `UsageLog` |
| Rollen / Zugriff | `OrganizationMember.role` + `OnboardingGuard` |
| E-Mail-Templates | `functions/initOrgEmailTemplates` |
| Engine / Temperatur-Analyse | `functions/analyzeLeadTemperature` |

---

### Konkrete Beispiele für korrekte Umsetzung

#### Ortsauswahl (umgesetzt 2026-05-16)
```
LocationAutocomplete (components/LocationAutocomplete.jsx)
  └── Onboarding (CompanyStep)
  └── Settings (CompanySettings via CityAutocomplete-Alias)
  └── ResearchDialog (bei fehlendem Ort)
  └── zukünftige Admin-/Support-Tools
```
Strukturierte Daten:
- `service_area_city`, `service_area_place_id`, `service_area_lat`, `service_area_lng`
- `target_locations_json`: `[{ city, label, place_id, lat, lng, country }]`
- Legacy weiter unterstützt: `lead_plz_city`, `target_locations`, `additional_cities`

#### Zielkunden / Branche (Regel)
```
TargetingStep (Onboarding) und CompanySettings (Einstellungen)
  → speichern DIESELBEN Keys: target_customer_types, excluded_customer_types, services
  → nutzen DIESELBEN Presets: industryTargetPresets.js
  → generateLeads liest canonical Keys mit Legacy-Fallback
```

#### Lead-Recherche Settings (Resolver)
```
generateLeads → resolveResearchSettings(settings, org)
  → Branche: industry_name > own_industry > org.industry
  → Zielkunden: target_customer_types > zielkunden
  → Suchgebiet: service_area_lat/lng (canonical) > Google-Geocoding (Fallback)
  → Zusätzliche Orte: target_locations_json > target_locations > additional_cities
  → Radius: org.service_area_radius_km > service_area_radius_km > lead_radius_km
```

---

## Ein-Klick-Firmenrecherche – Phase F (MVP)

### Kernkonzept
- **Kundenseite:** Ein Button "Firmen recherchieren" → Automatisch neue Firmenkontakte
- **Intern:** Orchestrator `runUnifiedResearch` nutzt Google + (optional) Register-Signale
- **Output:** Nur sichere Matches → automatisch als `Company` erstellt
- **Kunde sieht:** "X neue Firmenkontakte wurden erstellt. Sie finden die Kontakte in Ihrer Leadliste."
- **Kunde sieht NICHT:** Technische Details, Zwischenschritte, Inbound-Kandidaten

### Functions

**generateLeads** (Haupt-Recherche-Funktion, direkt vom ResearchDialog aufgerufen)
- Canonical Settings Resolver: bevorzugt strukturierte Ortsdaten (place_id/lat/lng)
- Erstellt Companies direkt (Google-Matches)
- Schreibt UsageLog, ResearchRun, zählt gegen Monatslimit
- Status: ✅ MVP Production

**runUnifiedResearch** (Orchestrator, reserviert für v2)
- Existiert, wird aber NICHT im aktiven Kundenflow verwendet
- Keine verschachtelten Function-Calls (→ Timeout-Regel beachten)

**syncOpenRegister** (optional, Hintergrund)
- Wird nicht im Kundenflow aktiviert
- Kandidaten mit enrichment_confidence < 70 werden NICHT auto-promoted

### Frontend-Flow
- `ResearchDialog` → ruft direkt `generateLeads` auf
- Zeigt nur Kundenergebnis: "X Kontakte erstellt" + Monatslimit
- Keine technischen Zwischenschritte sichtbar

---

## Wichtige Architektur-Entscheidungen

### Kandidaten vs. Auto-Companies
- Unsichere Kandidaten (enrichment_confidence < 70) → ExternalCompanySource, nicht auto-promoted
- Sichere Matches (confidence >= 70) → direkt als Company erstellt
- Monatslimit: zählt NUR echte Company-Erstellungen

### Rollenmodell
- Platform Admin → darf alles
- Organization Owner/Admin → darf "Firmen recherchieren" aufrufen
- Sales Rep → darf NUR bereits erstellte Leads sehen

---

## KRITISCHE ARCHITEKTUR-REGEL: Keine verschachtelten Function-Calls

> **Eingeführt: 2026-05-16 nach Timeout-Bug**

`runUnifiedResearch` hat per `base44.functions.invoke("generateLeads", ...)` eine Funktion in einer Funktion aufgerufen → **Timeout im Kundenflow**.

**Regel:** Orchestratoren dürfen NICHT andere schwere Backend-Functions aufrufen.

**Erlaubte Alternativen:**
- Gemeinsame Utility-Helpers direkt inline
- Polling-basierte Queue-Architektur
- `generateLeads` selbst orchestrierbar machen (mit `mode`-Parameter)

**Aktueller MVP-Zustand:**
- `ResearchDialog` → ruft direkt `generateLeads` auf (kein Wrapper)
- `runUnifiedResearch` → für zukünftige v2 reserviert

---

## KRITISCHE ARCHITEKTUR-REGEL: Canonical Research Settings Resolver

> **Eingeführt: 2026-05-16 nach Settings-Key-Mismatch-Audit**

### Problem (behoben)
`CompanySettings` speicherte Zielorte unter `target_locations`.
`generateLeads` las nur `additional_cities`. → Zielorte wurden ignoriert.

### Lösung: Canonical Resolver in `generateLeads`

Priorität: `org.*` > canonical Settings > legacy Settings > Geocoding-Fallback

| Feld | Canonical Key | Legacy Keys |
|------|---------------|-------------|
| Hauptstadt | `org.service_area_city` | `settings.service_area_city`, `lead_plz_city` |
| Koordinaten | `settings.service_area_lat/lng` | Google-Geocoding als Fallback |
| Place ID | `settings.service_area_place_id` | — |
| Radius | `org.service_area_radius_km` | `settings.service_area_radius_km`, `lead_radius_km` |
| Zusätzliche Orte (strukturiert) | `settings.target_locations_json` | `settings.target_locations`, `additional_cities` |
| Zielkunden | `settings.target_customer_types` | `settings.zielkunden` |
| Ausschlüsse | `settings.excluded_customer_types` | `settings.zielkunden_ausschluss` |
| Branche | `settings.industry_name` | `settings.own_industry`, `org.industry` |

### Regeln
- **Keine Stadt-Sonderfälle.** Kein Hardcode für Neuwied, Koblenz oder andere Städte.
- **Jede neue UI-Einstellung → Resolver updaten.**
- **`target_locations_json`** ist canonical für Zielorte mit Koordinaten.
- **`target_locations`** ist canonical (Legacy) als Kommaliste.
- **Bei 0 Ergebnissen** → intern `zero_result_cause` setzen: `no_search_queries`, `google_returned_zero_results`, `all_duplicates`, `all_outside_radius`, `time_budget_reached_before_save`, `place_details_limit_reached`, `scoring_too_strict_or_bad_fit`, `unknown`.

---

## Bekannte Risiken & Backlog

### ⚠️ Register-Integration noch nicht aktiviert
- `runUnifiedResearch` hat Placeholder für Register-Prüfung
- Derzeit nur Google aktiv
- Zukünftig: Optional Enable/Disable

### ⚠️ Import-Kandidaten-Seite separiert
- `/import-kandidaten` existiert für interne Use-Cases
- Kein direkter Kunden-Link

### ⚠️ Keine Batch-Operationen
- Einzelne Recherche-Läufe, Lock-Mechanismus verhindert overlapping runs

---

## Backlog

- [ ] Register-Integration aktivieren (syncOpenRegister im Hintergrund)
- [ ] Admin-Dashboard: Überblick über Research-Runs + Auto-Matches
- [ ] Performance-Optimierung: parallele Grid-Punkte bei Google
- [ ] Fallback zu Register-Daten wenn Google-Hit < 50% Confidence
- [ ] ResearchDialog: LocationAutocomplete wenn Ort fehlt oder überschrieben werden soll