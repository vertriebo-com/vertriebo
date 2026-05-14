# Vertriebo Engine Verbesserungsplan

## Überblick
Fokus: Engine von reiner Bewertungs-Box zu actionable Sales Intelligence transformieren.

**Leitfrage:** "Was soll ich mit diesem Lead JETZT tun?"

---

## Neues Engine-Output-Schema

```typescript
interface EngineAnalysis {
  // ═══ Temperatur + Score-Dimensionen ═══
  temperature: "hot" | "warm" | "cold" | "open";
  
  // Multi-dimensionale Scoring
  vertriebo_score: 0-100;      // Gesamt-Qualität
  urgency_score: 0-100;         // Wie dringend?
  fit_score: 0-100;             // Passt die Zielgruppe?
  contactability_score: 0-100;  // Können wir sie erreichen?
  timing_score: 0-100;          // Ist jetzt der richtige Zeitpunkt?
  confidence_score: 0-100;      // Wie sicher ist die Analyse?

  // ═══ Evidenz + Begründung ═══
  summary: string;              // Kurze, konkrete Einschätzung
  reason: string;               // Warum diese Scores?
  
  // ═══ Signale (strukturiert) ═══
  fit_signals: FitSignal[];
  contactability_signals: ContactabilitySignal[];
  engagement_signals: EngagementSignal[];
  timing_signals: TimingSignal[];
  risk_signals: RiskSignal[];
  missing_data: MissingDataItem[];

  // ═══ Handlungsempfehlung ═══
  next_best_action: {
    type: "call" | "email" | "research" | "wait" | "enrich" | "task";
    title: string;               // z.B. "Anrufen und qualifizieren"
    reason: string;              // Warum genau dieser Schritt?
    due?: "today" | "tomorrow" | "this_week" | null;
  };

  // ═══ Outreach Intelligence ═══
  outreach_angle: string;        // Gesprächsansatz (was ist der Hebel?)
  suggested_opening?: string;    // Optionaler erster Satz
  qualification_questions: string[];
  objections_to_expect: string[];
  recommended_status: CompanyStatus;

  // ═══ Metadata ═══
  engine_version: string;        // z.B. "2025-01-14-v2"
  analyzed_at: string;           // ISO timestamp
  confidence_factors: string[];  // z.B. ["vollständige Kontaktdaten", "Branche bestätigt"]
  uncertainty_factors: string[]; // z.B. ["kein Erstkontakt dokumentiert"]
}
```

---

## Signal-Gruppen (Modular)

### 1. Fit Signals
Passt die Zielgruppe?

```typescript
interface FitSignal {
  signal: "industry_match" | "region_match" | "company_type_match" | "website_match" | "category_match";
  present: boolean;
  confidence: 0-100;
  reason: string;
  // Beispiele:
  // { signal: "industry_match", present: true, confidence: 95, reason: "Branche 'Immobilienverwaltung' passt zu Zielkunden" }
  // { signal: "region_match", present: true, confidence: 100, reason: "Standort Koblenz liegt im Suchgebiet (25km)" }
  // { signal: "industry_match", present: false, confidence: 80, reason: "Branche 'Einzelhandel' passt nicht zu Zielkunden" }
}
```

### 2. Contactability Signals
Können wir sie erreichen?

```typescript
interface ContactabilitySignal {
  signal: "phone_available" | "email_available" | "website_available" | "contact_person_available" | "website_contact_form";
  present: boolean;
  quality: "complete" | "partial" | "outdated";
  last_verified?: string;
  // Beispiele:
  // { signal: "phone_available", present: true, quality: "complete" }
  // { signal: "email_available", present: false, quality: null }
  // { signal: "website_available", present: true, quality: "partial", last_verified: "2025-01-10" }
}
```

### 3. Engagement Signals
Gab es bereits Interaktion?

```typescript
interface EngagementSignal {
  signal: "contact_log_exists" | "callback_scheduled" | "interest_documented" | "offer_requested" | "response_received" | "task_assigned";
  present: boolean;
  count?: number;
  last_at?: string;
  // Beispiele:
  // { signal: "contact_log_exists", present: true, count: 2, last_at: "2025-01-12" }
  // { signal: "response_received", present: true, last_at: "2025-01-11" }
  // { signal: "callback_scheduled", present: false }
}
```

### 4. Timing Signals
Ist jetzt der richtige Zeitpunkt?

```typescript
interface TimingSignal {
  signal: "new_lead" | "recent_contact" | "task_due" | "callback_overdue" | "long_time_no_contact" | "last_contact_positive";
  present: boolean;
  days_since?: number;
  status?: "due" | "overdue" | "upcoming";
  // Beispiele:
  // { signal: "new_lead", present: true, days_since: 1 }
  // { signal: "callback_overdue", present: true, days_since: 3, status: "overdue" }
  // { signal: "long_time_no_contact", present: true, days_since: 45 }
  // { signal: "last_contact_positive", present: true, days_since: 2 }
}
```

### 5. Risk Signals
Was sind die Risiken?

```typescript
interface RiskSignal {
  signal: "no_contact_data" | "outside_radius" | "duplicate_suspected" | "lost_status" | "blacklisted" | "no_response" | "poor_data_quality" | "data_too_old";
  severity: "low" | "medium" | "high";
  reason: string;
  // Beispiele:
  // { signal: "no_contact_data", severity: "high", reason: "Weder Telefon noch E-Mail vorhanden" }
  // { signal: "no_response", severity: "medium", reason: "Bereits 2 Kontaktversuche ohne Reaktion" }
  // { signal: "poor_data_quality", severity: "low", reason: "Branche ist unsicher ('Verwaltung')" }
}
```

### 6. Missing Data
Was fehlt zur besseren Analyse?

```typescript
interface MissingDataItem {
  field: "contact_person" | "email" | "phone" | "website" | "industry" | "first_contact_log" | "clear_website_category" | "address_verified";
  priority: "high" | "medium" | "low";
  impact: string;
  // Beispiele:
  // { field: "contact_person", priority: "high", impact: "Erstkontakt ist möglich aber effektiver mit Ansprechpartner" }
  // { field: "email", priority: "high", impact: "Keine direkte E-Mail möglich, nur über Kontaktformular" }
  // { field: "first_contact_log", priority: "medium", impact: "Bessere Timing-Analyse mit dokumentiertem Erstkontakt" }
}
```

---

## Scoring-Logik (Dimensionen)

### 1. fit_score (0-100)
**Frage:** Passt dieser Lead zu meinen Zielkunden?

```
Inputs:
- industry_match (0-100)
- region_match (0-100)
- company_type_match (0-100)
- website_category_match (0-100)

fit_score = average(gewichtete Signale)
```

**Beispiele:**
- ✅ Industry Match + Region Match + Website Match = 85-95
- ⚠️ Industry Match + aber außerhalb Radius = 40-60
- ❌ Keine Matches = 0-20

### 2. contactability_score (0-100)
**Frage:** Wie gut können wir sie erreichen?

```
Inputs:
- phone_available (30 Punkte)
- email_available (20 Punkte)
- website_contact_form (15 Punkte)
- contact_person_available (20 Punkte)
- data_quality (15 Punkte)

contactability_score = sum + bonus für mehrfache Kanäle
```

**Beispiele:**
- ✅ Phone + Email + Website = 85-100
- ⚠️ Nur Website = 40-60
- ❌ Nur Website und Kontaktformular ist unsicher = 30-40
- ❌ Keine Kontaktdaten = 0-10

### 3. timing_score (0-100)
**Frage:** Ist jetzt der richtige Zeitpunkt?

```
Inputs:
- new_lead (25 Punkte)
- recent_contact (aber positiv) (30 Punkte)
- task_due / callback_overdue (50 Punkte)
- long_time_no_contact (20 Punkte)

timing_score = score je nach Situation + Trend
```

**Beispiele:**
- ✅ Callback überfällig = 80-100
- ✅ Neue Lead = 70-80
- ⚠️ Letzte Woche kontaktiert (positiv) = 50-60
- ❌ Letzte Woche kontaktiert (negativ) = 20-40
- ❌ Vor 3 Monaten kontaktiert = 10-30

### 4. engagement_score (0-100)
**Frage:** Gibt es bereits positive Signale?

```
Inputs:
- contact_log_exists (20 Punkte)
- callback_scheduled (30 Punkte)
- interest_documented (20 Punkte)
- response_received (20 Punkte)
- offer_requested (40 Punkte)

engagement_score = sum + bonus für Kombinationen
```

**Beispiele:**
- ✅ Angebot angefordert = 80-100
- ✅ Callback scheduled = 60-80
- ⚠️ Ein Kontakt dokumentiert = 30-50
- ❌ Keine Engagement-Signale = 0-20

### 5. urgency_score (0-100)
**Frage:** Wie dringend ist dieser Lead?

```
Inputs:
- timing_score (40%)
- callback_overdue (50 Punkte bonus)
- task_due (30 Punkte bonus)
- positive_engagement (20%)

urgency_score = gewichtete Kombination
```

**Beispiele:**
- 🔴 Callback 3 Tage überfällig = 85-100
- 🟡 Task fällig heute = 70-85
- 🟢 Neue Lead, aber gut auffindbar = 40-60
- ⚪ Kalter Lead, lange nicht kontaktiert = 20-40

### 6. confidence_score (0-100)
**Frage:** Wie zuverlässig ist diese Analyse?

```
Inputs:
- datenqualität (vollständig/unvollständig)
- anzahl_signale (mehr = höher)
- how_recent (je aktueller, desto höher)
- engagement_data (je mehr Interaktion dokumentiert, desto höher)

confidence_score = sum(Datenqualitäts-Faktoren)
```

**Beispiele:**
- ✅ Vollständige Kontaktdaten + Engagement dokumentiert = 85-100
- ⚠️ Nur Website-Daten + kein Kontakt = 50-70
- ❌ Unvollständige Daten + alt = 20-50

---

## temperature Bestimmung

```
if (urgency_score >= 70 AND (contactability_score >= 60 OR engagement_score >= 50)):
  temperature = "hot"
elif (fit_score >= 70 AND contactability_score >= 50):
  temperature = "warm"
elif (fit_score >= 40):
  temperature = "cold"
else:
  temperature = "open"  // Nicht klassifizierbar
```

---

## next_best_action Logik

```typescript
// Priority-basierte Entscheidung
if (callback_overdue) {
  return {
    type: "call",
    title: "Überfälligen Rückruf durchführen",
    reason: "Rückruf von ${days} Tagen überfällig",
    due: "today"
  };
}

if (task_due_today) {
  return {
    type: "task",
    title: "Aufgabe '${task_name}' durchführen",
    reason: "Aufgabe fällig heute",
    due: "today"
  };
}

if (engagement_signals.length === 0 AND contactability_score >= 70) {
  return {
    type: "call",
    title: "Anrufen und qualifizieren",
    reason: "Kontaktdaten vorhanden, aber noch keine Bedarfsinformationen",
    due: "this_week"
  };
}

if (missing_high_priority.length > 0) {
  return {
    type: "enrich",
    title: "Fehlende Daten nachrecherchieren",
    reason: "Datenqualität zu niedrig für gute Qualifizierung: ${missing.join(', ')}",
    due: "tomorrow"
  };
}

if (fit_score < 40) {
  return {
    type: "wait",
    title: "Vorerst nicht priorisieren",
    reason: "Passt nicht ausreichend zu Zielkunden",
    due: null
  };
}
```

---

## outreach_angle + suggested_opening

**Nicht generisch, sondern evidenzbasiert:**

### Beispiel 1: Warm Lead
```json
{
  "temperature": "warm",
  "fit_signals": [
    { "signal": "industry_match", "present": true },
    { "signal": "region_match", "present": true }
  ],
  "engagement_signals": [
    { "signal": "contact_log_exists", "present": true }
  ],
  "outreach_angle": "Folge-up nach bestehendem Kontakt + Branchenkompetenz",
  "suggested_opening": "Hallo ${name}, wir hatten vor ${days} Wochen kurz telefoniert. Ich wollte Sie mal wieder erreichen, weil sich bei uns zu Ihrem Thema ${service} gerade etwas Neues entwickelt hat..."
}
```

### Beispiel 2: Kalt Lead mit Fit
```json
{
  "temperature": "cold",
  "fit_signals": [
    { "signal": "industry_match", "present": true },
    { "signal": "region_match", "present": true }
  ],
  "engagement_signals": [],
  "risk_signals": [
    { "signal": "no_response", "severity": "low" }
  ],
  "outreach_angle": "Branchenkompetenz + regionale Präsenz",
  "suggested_opening": "Guten Morgen ${name}, ich bin ${your_name} von ${your_company}. Wir arbeiten speziell mit ${industry}-Unternehmen in der Region ${region}. Hast du kurz Zeit für eine schnelle Frage?"
}
```

### Beispiel 3: Lead mit Missing Data
```json
{
  "temperature": "open",
  "contactability_score": 40,
  "missing_data": [
    { "field": "contact_person", "priority": "high" },
    { "field": "email", "priority": "high" }
  ],
  "outreach_angle": "Research-freundliche Website + Newsletter",
  "suggested_opening": "Ich versuche gerade, den richtigen Ansprechpartner in Ihrer Firma zu erreichen. Können Sie mir helfen und mir sagen, wer für das Thema ${service} zuständig ist?"
}
```

---

## Backend-Persistenz auf Company

Neue Felder (strukturiert):

```typescript
// Score-Dimensionen
engine_temperature: "hot" | "warm" | "cold" | "open";
engine_score: number;                // 0-100 vertriebo_score
engine_confidence: number;           // 0-100
engine_urgency_score: number;        // 0-100
engine_fit_score: number;            // 0-100
engine_contactability_score: number; // 0-100
engine_timing_score: number;         // 0-100

// Text-Zusammenfassungen
engine_summary: string;              // Kurze Aussage
engine_reason: string;               // Warum diese Scores?

// JSON-Bundles (strukturiert + versioniert)
engine_signals_json: {
  version: "2025-01-14";
  fit_signals: FitSignal[];
  contactability_signals: ContactabilitySignal[];
  engagement_signals: EngagementSignal[];
  timing_signals: TimingSignal[];
  risk_signals: RiskSignal[];
  missing_data: MissingDataItem[];
};

engine_next_action_json: {
  type: "call" | "email" | "research" | "wait" | "enrich" | "task";
  title: string;
  reason: string;
  due?: "today" | "tomorrow" | "this_week" | null;
};

// Outreach Intelligence
engine_outreach_angle: string;
engine_suggested_opening: string;
engine_qualification_questions: string[];
engine_objections_to_expect: string[];
engine_recommended_status: CompanyStatus;

// Metadata
engine_version: string;             // z.B. "2025-01-14-v2"
engine_last_analyzed_at: string;    // ISO timestamp
engine_analyzed_by: "auto" | "manual";
engine_confidence_factors: string[];
engine_uncertainty_factors: string[];
```

---

## UI: EngineBox-Verbesserung

### LeadDetail - EngineBox Layout

```
┌─────────────────────────────────────────┐
│ Vertriebo Engine Analyse               │
├─────────────────────────────────────────┤
│ SCORE + TEMPERATUR (prominente Anzeige)│
│ Score: 72 | Temperatur: WARM | Confidence: 82%
│
│ KURZFAZIT (Nicht generisch!)           │
│ "Warm Lead: Kontaktdaten vorhanden,    │
│  Branche passt, aber noch kein        │
│  Erstkontakt dokumentiert."           │
│
│ WARUM?                                 │
│ ├─ fit_score: 85 (Branche + Region)    │
│ ├─ contactability: 75 (Phone + Email)  │
│ ├─ engagement: 20 (Kein Kontakt)       │
│ ├─ timing: 60 (1 Woche alt)            │
│ └─ urgency: 55 (Nicht dringend)        │
│
│ TOP-SIGNALE ✅                         │
│ ✅ Branche "GmbH" passt zu Zielkunden │
│ ✅ Standort Koblenz im Suchgebiet     │
│ ✅ Telefon + Website vorhanden         │
│
│ RISIKEN / FEHLENDE DATEN ⚠️           │
│ ⚠️ Kein Erstkontakt dokumentiert       │
│ ⚠️ E-Mail nicht verifiziert            │
│ ⚠️ Ansprechpartner fehlt               │
│
│ NÄCHSTER BESTER SCHRITT                │
│ 📞 ANRUFEN & QUALIFIZIEREN             │
│ Warum: Kontaktdaten vorhanden, aber    │
│ noch keine Bedarfsinformationen.       │
│ Fällig: Diese Woche                    │
│
│ GESPRÄCHSANSATZ                        │
│ "Hallo ${name}, ich bin ${your_name}  │
│  von ${company}. Wir arbeiten speziell│
│  mit ${industry}-Unternehmen in der   │
│  Region. Hast du kurz Zeit für eine   │
│  schnelle Frage?"                     │
│
│ QUALIFIZIERUNGSFRAGEN                 │
│ • Wer ist Ansprechpartner für...?     │
│ • Welche Herausforderungen...?        │
│ • Budget für...?                      │
│
│ EINWÄNDE (ERWARTBAR)                  │
│ • "Wir sind zufrieden mit unserem...  │
│ • "Kein Budget im Moment"              │
│ • "Passt nicht zu unseren Prozessen"   │
│
│ AKTIONEN                               │
│ [📋 Aufgabe erstellen] [🔄 Neu analysieren]
└─────────────────────────────────────────┘
```

### Leads-Seite - EngineStatsBox Verbesserung

```
┌─────────────────────────────────────────┐
│ Vertriebo Engine Status                │
├─────────────────────────────────────────┤
│ 🔥 HOT (15)  │  🟠 WARM (34)  │         │
│ 🔵 COLD (42) │  ⏳ OFFEN (8)  │         │
├─────────────────────────────────────────┤
│ HEUTE BEARBEITEN: 5                    │
│ RÜCKRUF FÄLLIG: 3                      │
│ DATEN FEHLEN: 12                       │
│ UNANALYSIERT: 0                        │
├─────────────────────────────────────────┤
│ TOP LEADS (Analysiert & Hot/Warm)     │
│ 1. Acme GmbH (92) - Heute anrufen     │
│ 2. Beta UG (78) - Diese Woche         │
│ 3. Gamma AG (76) - Rückruf fällig     │
└─────────────────────────────────────────┘
```

**Wichtig:** Nur persistierte engine_*_Felder verwenden. Keine schwere Echtzeit-Analyse.

---

## Implementierungs-Roadmap

### Phase 1: Backend-Schema (analyzeLeadEngine.js)
- [ ] Neue Signal-Klassen implementieren
- [ ] Scoring-Logik für alle 6 Dimensionen
- [ ] temperature Bestimmung
- [ ] next_best_action Logik
- [ ] outreach_angle + suggested_opening
- [ ] Company-Felder anpassen

### Phase 2: Frontend-EngineBox (components/lead-detail/EngineBox.jsx)
- [ ] Neues Layout mit Score-Dimensionen
- [ ] Signal-Visualisierung
- [ ] next_best_action prominent
- [ ] Outreach-Vorschläge
- [ ] Action Buttons

### Phase 3: EngineStatsBox-Verbesserung (components/leads/EngineStatsBox.jsx)
- [ ] Statistiken: Hot/Warm/Cold/Offen
- [ ] Aktions-Filter: Heute/Rückruf fällig/Daten fehlen
- [ ] Top Leads (nur persistierte Felder)
- [ ] Performance optimiert

### Phase 4: Test + Iterationen
- [ ] Real-Lead-Tests
- [ ] Feedback Nutzer
- [ ] Scoring-Anpassungen
- [ ] Outreach-Texte verfeinern

---

## WOW-Momente (Product Vision)

**Nutzer öffnet Lead:**
> "Ah ja, genau. Die Firma passt, aber ohne Ansprechpartner kann ich nicht anrufen. Lass mich schnell LinkedIn recherchieren."

→ Engine sagt: "Fehlende Daten: Ansprechpartner. Das ist wichtig für bessere Qualifizierung. Möchtest du das in 5min nachrecherchieren?"

**Nutzer hat vielen Leads:**
> "Welchen soll ich heute anrufen?"

→ Engine sagt: "Diese 3 sind heute wichtig: Rückruf überfällig, neue Lead mit guter Datenqualität, und eine GmbH die perfekt passt."

**Nutzer führt Anruf durch:**
> "Okay, was sage ich?"

→ Engine gibt Gesprächsansatz + erster Satz, basierend auf: Branche passt, Region passt, aber noch kein Kontakt → "Das ist die Situation, lass mich damit anfangen."

---

## Akzeptanz für Phase 1

```json
{
  "openRegisterPricingAndTestplanPaused": true,
  "focusReturnedToVertrieboEngine": true,
  "engineOutputSchemaImproved": true,
  "genericEngineTextsRemoved": true,
  "nextBestActionStructured": true,
  "signalGroupsImplemented": true,
  "engineBoxActionable": true,
  "engineStatsUsesPersistedFieldsOnly": true,
  "readyForEngineRetest": true
}
```

---

**Nächster Schritt:** Nutzer reviewt Plan → Dann Phase 1 Backend-Umsetzung starten.