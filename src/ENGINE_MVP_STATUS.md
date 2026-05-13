# Vertriebo Engine – MVP Status & Roadmap

## Aktueller Status: Frontend MVP Preview

### ✅ Implementiert (Frontend-Preview)

**EngineBox (LeadDetail)**
- Temperature-Berechnung: Hot/Warm/Cold mit Score 0-100
- Kaufsignale, Risiken, fehlende Daten anzeigen
- Nächster Schritt-Empfehlung
- Erstkontakt-Kontext
- Aufgaben-Integration

**EngineStatsBox (Leads-Seite)**
- Hot/Warm/Cold Übersichtsstatistik
- Top 3 Leads nach Score
- Gefiltert nach organization_id

**Daten-Isolation**
- ✓ Leads-Seite: Filter mit `organization_id`
- ✓ LeadDetail: Company-Filter mit `organization_id`
- ✓ ContactLogs: Filter mit `organization_id + company_id`
- ✓ Tasks: Filter mit `organization_id + company_id`
- ✓ EngineStatsBox: Arbeitet nur mit gefilterten Companies

### ⚠️ Nicht persistiert (nur Frontend)

```javascript
// analyzeLeadTemperature ist:
- Reine Frontend-Util-Funktion
- Deterministische lokale Berechnung
- Keine KI auf Render
- Keine Persistierung
- Keine Versionierung
- Keine Audit-Trail
```

### 🔴 Fehlend (Backend-Persistenz)

**Neue Company-Felder:**

```json
{
  "lead_temperature": "Hot|Warm|Cold",
  "lead_temperature_score": 0-100,
  "lead_temperature_reason": "Text",
  "next_best_action": "string",
  "buying_signals": ["signal1", "signal2"],
  "risk_signals": ["risk1", "risk2"],
  "missing_data": ["field1", "field2"],
  "first_contact_summary": "Text",
  "last_ai_analyzed_at": "ISO8601",
  "engine_version": 1
}
```

**Backend-Funktion `analyzeLeadEngine`**

Verantwortlichkeiten:
1. Organisation-ID-Validierung
2. Konsistente Analyse pro Org
3. KI-Prompt (Text-Zusammenfassung) mit timeout
4. Persistierung der Ergebnisse
5. Usage-Logging (AI-Aktionen)
6. Fehler-Handling mit Fallback

Trigger-Punkte:
- Manueller Button "Lead neu analysieren" auf LeadDetail
- Nach ContactLog-Create (optional, mit Rate-Limiting)
- Batch-Button "Neueste Leads analysieren" auf Leads-Seite

Nicht auf jedem Render:
- ❌ KEINE automatische Analyse bei Page-Load
- ❌ KEINE Analyse bei jedem contactLogs-Update
- ❌ KEINE Batch-Analyse ohne expliziten Click

**Integration mit existierender KI-Logik**

`getKiRecommendation` (exists):
- Generiert AI-gestützte Handlungsempfehlung
- Speichert cached `ki_recommendation` auf Company
- Wird integriert in analyzeLeadEngine, nicht ersetzt

→ `analyzeLeadEngine` ruft intern KI auf, speichert Ergebnis

**No Duplicate KI-Logic**
- EngineBox zeigt Temperatur + Signale (lokal deterministic)
- Wenn Backend live: EngineBox zeigt persistierte Werte
- KI-Empfehlung bleibt separate, integrierte Operation

---

## Kritische Punkte für Retest

### 1. Organization-ID Isolation
- ✅ Leads mit `organization_id` gefiltert
- ✅ LeadDetail mit `organization_id` gefiltert
- ✅ ContactLogs mit `organization_id + company_id`
- ✅ Tasks mit `organization_id + company_id`

### 2. Keine Analyse auf Render
- ✅ analyzeLeadTemperature läuft NICHT auf jedem Render
- ✅ Frontend-Util: deterministische Berechnung aus bestehenden Daten
- ✅ KEINE KI auf Render

### 3. Temperatur-Logik bei Rückruf
```
Lead mit Rückruf heute:
- nextBestAction = "heute_aufgaben_erledigen" → Warm/Hot möglich
- NICHT einfach Cold, wenn Rückruf geplant

Lead mit fehlendem Kontakt:
- risk_signals += "Kein erreichter Kontakt"
- reason zeigt transparente Begründung
```

### 4. Cold/Warm Begründung
```
✅ Korrekt:
- Lead ist Cold, weil: "Lange kein Kontakt (60+ Tage), keine offenen Aufgaben"
- Lead ist Warm, weil: "Rückruf heute geplant, 1 Kaufsignal"

❌ Falsch:
- Lead ist einfach Cold ohne Begründung
- Temperatur ändert sich ohne transparent documented Signal-Wechsel
```

---

## Next Steps

1. **UI-Retest**
   - EngineBox auf LeadDetail funktioniert?
   - EngineStatsBox auf Leads-Seite funktioniert?
   - Organization-ID Isolation OK?

2. **Backend vorbereiten** (nächste Phase)
   - Company-Entity erweitern (lead_temperature, etc.)
   - analyzeLeadEngine Backend-Function entwickeln
   - UI-Button für manuelle Analyse
   - Trigger nach ContactLog-Create (optional)

3. **KI-Integration** (später)
   - getKiRecommendation in analyzeLeadEngine integrieren
   - Caching & Usage-Limits
   - Auditierbarkeit / Engine-Version

---

## Summary

🎯 **MVP Status:**
- Engine-UI: ✅ Live (LeadDetail + Leads-Seite)
- Frontend-Logik: ✅ Implementiert (analyzeLeadTemperature)
- Daten-Isolation: ✅ Verifiziert (organization_id)
- Persistenz: ❌ Geplant (Backend-Phase)
- KI-Integration: ❌ Geplant (Backend-Phase)

🔄 **NICHT als finale Engine betrachten** – UI-MVP preview nur. Backend-persistenz folgt in nächster Iteration.