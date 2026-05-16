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