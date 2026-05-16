# Vertriebo Merkliste – Architektur & Entscheidungen

_Zuletzt aktualisiert: 2026-05-16_

---

## Ein-Klick-Firmenrecherche – Phase F (neu MVP)

### Kernkonzept
- **Kundenseite:** Ein Button "Firmen recherchieren" → Automatisch neue Firmenkontakte
- **Intern:** Orchestrator `runUnifiedResearch` nutzt Google + (optional) Register-Signale
- **Output:** Nur sichere Matches → automatisch als `Company` erstellt
- **Kunde sieht:** "X neue Firmenkontakte wurden erstellt. Sie finden die Kontakte in Ihrer Leadliste."
- **Kunde sieht NICHT:** Technische Details, Zwischenschritte, Inbound-Kandidaten

### Functions

**runUnifiedResearch** (neuer Orchestrator)
- **Eingabe:** organization_id, mode (standard/fast)
- **Intern:**
  1. Ruft `generateLeads` auf → Google Places Recherche
  2. (Optional) Prüft Register-Signale im Hintergrund
  3. Nutzt nur sichere Matches aus generateLeads
  4. Auto-Übernahme als `Company`: match_status=ready_for_review + enrichment_status=enriched + enrichment_confidence>=70
- **Output:** { success, created_contacts_count, monthly_usage, user_message }
- **UsageLog:** Nur echte Company-Erstellungen zählen gegen Monatslimit
- **Keine Auto-Engine:** analyzeLeadTemperature wird NICHT automatisch aufgerufen
- **Status:** ✅ MVP Production

**generateLeads** (unverändert, interne Nutzung)
- Wird von `runUnifiedResearch` aufgerufen (nicht direkt vom Frontend)
- Gibt weiterhin detaillierte debug-Infos zurück
- Erstellt Companies direkt (Google-Matches)

**syncOpenRegister** (optional, Hintergrund)
- Wird von `runUnifiedResearch` optional im Hintergrund aufgerufen
- Beeinflusst NICHT den Kundendialog
- Kandidaten mit enrichment_confidence < 70 werden NICHT auto-promoted

### Frontend-Changes

**ResearchDialog**
- Ruft jetzt `runUnifiedResearch` statt `generateLeads` auf
- Zeigt nur Kundenergebnis: "X Kontakte erstellt" + Monatslimit
- Keine technischen Zwischenschritte sichtbar
- Einfache Fehler-Messages: Limit erreicht, Fehler, fertig

**Leadseite**
- Nur noch "Firmen recherchieren"-Button (für Admins)
- "Import-Kandidaten"-Einstieg ist aus normalem Kundendialog entfernt
- Interne Seite /import-kandidaten existiert noch, aber kein direkter Kunden-Link

---

## Wichtige Architektur-Entscheidungen

### Kandidaten vs. Auto-Companies
- Unsichere Kandidaten (enrichment_confidence < 70) → ExternalCompanySource, werden NICHT auto-promoted
- Sichere Matches (confidence >= 70) → direkt als Company erstellt
- Monatslimit: zählt NUR echte Company-Erstellungen, NICHT interne Kandidaten

### Keine Auto-Automatiken für Kunden
- Kein automatischer Engine-Analyse
- Kein SuccessScreen mit technischen Details
- Keine Anzeige von interne Register-Matches
- Kunde sieht nur: "Recherche fertig" + finale Kontaktzahl

### Register-Integration (optional)
- Register-Signale laufen im Hintergrund
- Beeinflussen nur die interne Validierung
- Werden NICHT an Kunde kommuniziert
- Zukünftig: können für weitere Validierungs-Layer genutzt werden

### Rollenmodell
- Platform Admin → darf alles
- Organization Owner → darf "Firmen recherchieren" aufrufen
- Organization Admin → darf "Firmen recherchieren" aufrufen
- Sales Rep → darf NUR bereits erstellte Leads sehen

---

## Akzeptanz-Checkliste Phase F

- [x] Leadseite: nur "Firmen recherchieren"-Button für Admins
- [x] ResearchDialog: vereinfacht, zeigt nur Kundenergebnis
- [x] runUnifiedResearch: orchestriert Google + Register + Auto-Übernahme
- [x] Sichere Matches (confidence >= 70): automatisch als Company erstellt
- [x] Unsichere Kandidaten: NICHT sichtbar für Kunden
- [x] UsageLog: nur echte Company-Erstellungen zählen gegen Monatslimit
- [x] Kundendialog: einfache Message "X Kontakte erstellt"
- [x] Keine automatische Engine-Analyse
- [x] Lead Detail: funktioniert für automatisch erstellte Leads
- [x] Leadseite: refresht nach Recherche

---

## KRITISCHE ARCHITEKTUR-REGEL: Keine verschachtelten Function-Calls

> **Eingeführt: 2026-05-16 nach Timeout-Bug**

`runUnifiedResearch` hat per `base44.functions.invoke("generateLeads", ...)` eine Funktion in einer Funktion aufgerufen. Das hat einen **Timeout im Kundenflow** verursacht, weil:
- `generateLeads` selbst schon schwer mit Google Places ist (bis zu 40s)
- Der zusätzliche Wrapper-Aufruf erhöht Gesamtlaufzeit über Frontend-Timeout
- Verschachtelte Functions sind unzuverlässig in Deno-Umgebung

**Regel:** Orchestratoren dürfen NICHT andere schwere Backend-Functions aufrufen.

**Erlaubte Alternativen für Orchestration:**
- Gemeinsame Utility-Helpers direkt inline
- Polling-basierte Queue-Architektur (Frontend fragt Status ab)
- generateLeads selbst orchestrierbar machen (mit `mode`-Parameter)

**Aktueller MVP-Zustand (stabil):**
- `ResearchDialog` → ruft direkt `generateLeads` auf (kein Wrapper)
- `runUnifiedResearch` existiert, wird aber NICHT im Kundenflow verwendet
- `runUnifiedResearch` ist für zukünftige v2 reserviert (dann mit korrekter Architektur)
- UsageLog wird nur von `generateLeads` geschrieben (kein `skip_usage_log` im direkten Aufruf)

---

---

## KRITISCHE ARCHITEKTUR-REGEL: Canonical Research Settings Resolver

> **Eingeführt: 2026-05-16 nach Settings-Key-Mismatch-Audit**

### Problem (behoben)
`CompanySettings` speicherte zusätzliche Zielorte unter `target_locations`.
`generateLeads` las nur `additional_cities`. → Zielorte wurden ignoriert.

### Lösung: Canonical Resolver in `generateLeads`
Alle Settings-Keys werden zentral aufgelöst, Priorität: `org.*` > canonical > legacy:

| Feld | Canonical Key | Legacy Keys |
|------|---------------|-------------|
| Hauptstadt | `org.service_area_city` | `settings.service_area_city`, `lead_plz_city`, `lead_plz` |
| Radius | `org.service_area_radius_km` | `settings.service_area_radius_km`, `lead_radius_km` |
| Zusätzliche Orte | `settings.target_locations` | `settings.additional_cities`, `settings.targetLocations` |
| Zielkunden | `settings.target_customer_types` | `settings.zielkunden` |
| Ausschlüsse | `settings.excluded_customer_types` | `settings.zielkunden_ausschluss` |
| Branche | `settings.industry_name` | `settings.own_industry`, `settings.industry`, `org.industry` |

### Regeln
- **Keine Stadt-Sonderfälle.** Kein Hardcode für Neuwied, Koblenz oder andere Städte.
- **Jede UI-Einstellung muss per Resolver ankommen.** Neuer Settings-Key → Resolver updaten.
- **`target_locations` ist der Canonical Key** für zusätzliche Zielorte (gespeichert von CompanySettings).
- **Fast Mode ignoriert `target_locations` nicht.** Max. 2 zusätzliche Städte werden übergeben.
- **Bei 0 Ergebnissen** wird intern `zero_result_cause` gesetzt und in `lastReport` + `ResearchRun.summary` gespeichert. Mögliche Werte: `no_search_queries`, `google_returned_zero_results`, `all_duplicates`, `all_outside_radius`, `time_budget_reached_before_save`, `place_details_limit_reached`, `scoring_too_strict_or_bad_fit`, `unknown`.

---

## Bekannte Risiken & Backlog

### ⚠️ Register-Integration noch nicht gebaut
- `runUnifiedResearch` hat Placeholder für Register-Prüfung
- Wird derzeit nicht aktiviert (nur Google ist aktiv)
- Zukünftig: Optional Enable/Disable für Register-Hintergrund-Checks

### ⚠️ Import-Kandidaten-Seite separiert
- `/import-kandidaten` existiert noch für interne Use-Cases
- Ist aber aus normalem Kundendialog entfernt
- Zukünftig: Optional für Power-User aktivierbar

### ⚠️ Keine Batch-Operationen
- Einzelne Recherche-Läufe, keine parallelen Batches
- Lock-Mechanismus verhindert overlapping runs
- Zukünftig: Erweitern für mehrere gleichzeitige Org-Recherchen

---

## Noch nicht gebaut (Backlog)

- [ ] Register-Integration aktivieren (syncOpenRegister im Hintergrund)
- [ ] Detaillierte Error-Messages pro Register-Signal
- [ ] Admin-Dashboard: Überblick über Research-Runs + Auto-Matches
- [ ] A/B-Tests: mit/ohne Register-Signale
- [ ] Performance-Optimierung: parallele Grid-Punkte bei Google
- [ ] Fallback zu Register-Daten wenn Google-Hit < 50% Confidence