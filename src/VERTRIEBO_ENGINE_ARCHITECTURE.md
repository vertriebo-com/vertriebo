# Vertriebo Engine – Signal-basierte Architektur

## Überblick

Die Vertriebo Engine ist nicht nur ein Score-Kalkulator, sondern ein **Vertriebsleiter im Frontend**. Sie denkt wie ein erfahrener Vertriebler:

- **Was weiß ich über diesen Lead?** → Signale detektieren
- **Was fehlt mir noch?** → Missing Data identifizieren  
- **Wie dringend ist er?** → Temperature berechnen mit Guardrails
- **Was ist der nächste Schritt?** → Konkrete, zielgerichtete Aktion
- **Warum genau?** → Evidence-basierte Begründung, nicht generisch

---

## Architektur-Schichten

### 1. LeadContext Builder
```javascript
buildLeadContext(company, contactLogs, tasks)
```
Normalisierte Datenbasis aus echten Feldern:
- Kontaktdaten (Telefon, E-Mail, Website, Ansprechpartner)
- Pipeline-Status
- Kontakthistorie (Anzahl Versuche, Ergebnisse)
- Offene Aufgaben (heute, überdfällig, geplant)
- Zeitberechnung (Tage seit Kontakt)

Wichtig: **Organization-ID Isolation** – nur Daten der selben Org

### 2. Signal-Detektoren
```javascript
detectBuyingSignals(context)      // +30 bis +8 Punkte
detectRiskSignals(context)        // -50 bis -6 Punkte  
detectMissingData(context)        // -3 Punkte pro Feld
```

Jedes Signal ist ein Objekt mit:
- `type`: Eindeutige ID (z.B. "callback_due_today")
- `label`: Kurzer Name
- `weight`: Punkte (+/-)
- `evidence`: Konkrete Begründung aus Lead-Daten
- `actionHint`: Was soll der Vertriebler tun?

**Beispiel:**
```json
{
  "type": "callback_due_today",
  "label": "Rückruf heute",
  "weight": 20,
  "evidence": "1 Aufgabe 'Anrufen' ist heute fällig",
  "actionHint": "Heute anrufen und Bedarf klären"
}
```

### 3. Score-Berechnung
```javascript
calculateTemperatureScore(context, signals, risks, missingData)
```

- Baseline: 50 Punkte
- Addiere alle Kaufsignal-Gewichte
- Subtrahiere alle Risiko-Gewichte
- Subtrahiere 3 Punkte pro fehlendes Datenfeld
- Min: 0, Max: 100

### 4. Temperature Classification mit Guardrails

**Nicht blind nach Score**, sondern mit Regeln:

```javascript
classifyTemperature(score, context, signals, risks)
```

**Guardrails:**

1. **Explizit negativ → Cold**
   - Status: Verloren
   - Ergebnis: Kein Interesse
   - Falsche Zielgruppe

2. **Hot nur mit echtem Kaufsignal**
   - Score >= 70 UND
   - Mindestens eines davon:
     - Angebot angefragt (status: Angebot)
     - Termin vereinbart (status: Termin, oder task vorhanden)
     - Rückruf vereinbart (ContactLog-Ergebnis)
     - Angebot versendet (ContactLog-Ergebnis)

3. **Warm/Cold nach Score**
   - Score >= 50 → Warm (wenn nicht Hot)
   - Score < 50 → Cold

### 5. Copy Builder – Evidence-basiert

#### buildTemperatureReason()
Nicht: "Mehrere positive Signale und hoher Engagement-Score"

Sondern: konkrete Gründe aus Signalen

Struktur: [Stärkstes Signal] + [Stärkstes Risiko] + [Nächster Schritt]

**Beispiele:**

- **Hot:** "Angebot wurde angefragt. Jetzt zeitnah nachfassen und Entscheidungsprozess voranbringen."
- **Warm:** "Rückruf ist heute fällig. Vorher Bedarf und Entscheider recherchieren."
- **Cold:** "Lead wurde als Verloren markiert. Nur wieder kontaktieren bei Bedarf- oder Ansprechpartner-Wechsel."

#### buildNextBestAction()
Konkrete Aktion, nicht generisch

Priorität:
1. Überfällige Aufgaben
2. Heute fällige Aufgaben
3. Status-basiert (Angebot → nachfassen, Termin → vorbereiten)
4. Aufgaben-basiert (Termin in Kalender, Rückruf in Kalender)
5. Kontakt-basiert (nach letztem Ergebnis)
6. Noch kein Kontakt → Erstkontakt herstellen

**Beispiele:**

- "Überfällige Aufgabe abarbeiten: Anrufen"
- "Heute durchführen: Bedarf klären"
- "Angebot nachfassen – Feedback einholen und nächsten Entscheidungsschritt sichern"
- "Erneut anrufen – Bedarf und Entscheider klären"
- "Erstkontakt herstellen und klären, wer über externe Dienstleister entscheidet"

#### buildFirstContactSummary()
Nicht nur zählen, sondern Status zeigen

- **Noch kein Kontakt:** "Noch kein Kontakt dokumentiert."
- **Nicht erreicht:** "Bisheriger Kontaktversuch: nicht erreicht."
- **Mit Notiz:** "Anruf: Erreicht. 'Möchte am besten per E-Mail weitere Infos…'"

### 6. Engine Result JSON (standardisiert)

```json
{
  "temperature": "warm",
  "score": 48,
  "confidence": 0.72,
  
  "reason": "Passende Branche und Kontaktdaten, aber kein erfolgreicher Erstkontakt.",
  "nextBestAction": "Zum geplanten Rückruf erneut anrufen und Entscheider sowie Bedarf klären.",
  "firstContactSummary": "Bisheriger Kontaktversuch: nicht erreicht.",
  
  "signals": {
    "buying": [
      {
        "label": "Passende Branche",
        "evidence": "Produktionsbetrieb passt zur Zielgruppe",
        "weight": 14
      },
      ...
    ],
    "risks": [
      {
        "label": "Bedarf nicht bestätigt",
        "evidence": "Kein ContactLog mit Bedarf vorhanden",
        "weight": -14
      },
      ...
    ],
    "missing": ["Entscheiderrolle", "konkreter Bedarf"]
  },
  
  "engine_version": "vertriebo-engine-v1-signal-based",
  "analyzed_at": "2026-05-14T10:30:00.000Z"
}
```

---

## WOW-Test-Cases

### 1. Neuer Lead ohne Kontakt
**Input:**
- Branche passt ✓
- Telefon vorhanden ✓
- E-Mail vorhanden ✓
- Kein ContactLog
- Keine Tasks

**Erwartet:**
- Temperature: **Warm** (nicht Cold, weil Daten passen)
- Reason: "Passende Branche und gute Kontaktdaten vorhanden, aber noch kein Kontakt."
- NextAction: "Erstkontakt herstellen und klären, wer über externe Dienstleister entscheidet."

### 2. Lead: Nicht erreicht
**Input:**
- ContactLog: Anruf, nicht erreicht
- Rückruf geplant: nein
- Telefon vorhanden ✓

**Erwartet:**
- Temperature: **Cold** (hasOnlyFailedContact)
- Reason: "Bisher nicht erreicht. Neu bewerten oder mit anderem Kontaktweg versuchen."
- NextAction: "Erneut anrufen – Bedarf und Entscheider klären."
- NOT: "Mehrere positive Signale"

### 3. Rückruf heute
**Input:**
- Branche passt ✓
- Rückruf Task: fällig heute
- ContactLog: nicht erreicht

**Erwartet:**
- Temperature: **Warm** (mindestens)
- Reason: "Rückruf heute fällig. Bedarf und Entscheider klären."
- NextAction: "Heute anrufen – Bedarf und Entscheider klären."

### 4. Angebot angefragt
**Input:**
- Status: Angebot
- ContactLog: Angebot gesendet
- Telefon, E-Mail vorhanden

**Erwartet:**
- Temperature: **Hot**
- Reason: "Angebot wurde angefragt. Jetzt zeitnah nachfassen."
- NextAction: "Angebot nachfassen – Feedback einholen."

### 5. Kein Interesse
**Input:**
- ContactLog: Ergebnis = "Kein Interesse"
- Status: beliebig

**Erwartet:**
- Temperature: **Cold**
- Reason: "Kein Interesse signalisiert. Nicht priorisieren."
- NextAction: "Lead deprioritisieren. Nur bei neuen Informationen erneut prüfen."

### 6. Passend, aber unklar
**Input:**
- Branche passt ✓
- Vollständige Daten ✓
- ContactLog: Anruf, erreicht
- Aber: keine Notiz, kein Bedarf dokumentiert

**Erwartet:**
- Temperature: **Warm**
- Reason: "Erfolgreich erreicht, passende Branche. Bedarf muss noch dokumentiert werden."
- NextAction: "Nächsten Kontakt durchführen und Bedarf konkretisieren."

---

## Produktstandard

**Ab jetzt bei Vertriebo immer:**

Nicht: "Funktion ist eingebaut."

Sondern: "Würde ein echter Vertriebler dadurch sofort besser handeln?"

Die Engine muss nicht nur anzeigen, sondern **führen**.

---

## Zukünftige Erweiterungen (geplant, nicht MVP)

1. **Backend-Persistenz**
   - analyzeLeadEngine Backend-Funktion
   - Company-Entity: lead_temperature, lead_temperature_score, etc.

2. **Branchenlogik (Industry Playbooks)**
   - Unterschiedliche Kaufsignale pro Branche
   - Gebäudereinigung: Objektgröße, Frequenz
   - IT-Service: Arbeitsplätze, Server
   - Sicherheitsdienst: Zeiten, Objekt

3. **Vergessen-Risiko (Forgotten Risk)**
   - Rückruf überfällig?
   - Angebot ohne Follow-up?
   - Heißer Lead ohne nächsten Schritt?

4. **Deal-Momentum**
   - Lead wird wärmer/kälter über Zeit
   - Positive Kontakte = Momentum hoch
   - Lange keine Aktivität = Momentum sinkt

5. **Gesprächsziele**
   - Nicht nur "anrufen", sondern "Bedarf klären, Entscheider finden"
   - Jede Aktion hat klares Ziel

---

## Implementierung (Frontend MVP)

Die Engine läuft bereits als Frontend-MVP:
- `/utils/analyzeLeadTemperature.js` – Signal-basierte Logik
- `/components/lead-detail/EngineBox.jsx` – UI-Darstellung
- `/components/leads/EngineStatsBox.jsx` – Übersicht

**Wichtig:**
- KEINE KI auf Render
- KEINE generischen Texte
- KEINE Persistierung (kommt später)
- Architektur ist aber **Backend-ready**

---

## Checkliste für WOW-Engine

- ✅ Signal-basierte Architektur (nicht nur Score)
- ✅ LeadContext als zentrale Datenbasis  
- ✅ Konkrete Kaufsignale (nicht "mehrere positive")
- ✅ Konkrete Risiken (nicht "engagement-signale")
- ✅ Guardrails für Temperatur (Hot = echtes Kaufsignal)
- ✅ Evidence-basierte Begründungen
- ✅ Zielgerichtete nächste Schritte
- ✅ Intelligente Erstkontakt-Zusammenfassung
- ✅ Standardisiertes JSON-Output
- ✅ WOW-Test-Cases bestanden