# OpenRegister Free Plan Teststrategie

## Überblick
- **Free Plan Kontingent:** 50 Requests/Monat
- **Zweck:** Prototyp-Validierung vor kostenpflichtiger Integration
- **Status:** Bewusste Nutzung für kontrollierte Tests

---

## Wichtige Erkenntnisse

### dry_run=true Verständnis
✅ **Was passiert:**
- Echter API-Request an OpenRegister (zählt zum Kontingent)
- KEINE Speicherung in ExternalCompanySource
- KEINE Company-Erstellung
- Preview/Schema-Test möglich

❌ **Was NICHT passiert:**
- Keine Datenpersistenz
- Keine Duplikatsprüfung gegen bestehende Daten

### Test-Philosophie
> **Nicht aus Angst vor Request-Verbrauch gar nicht testen**  
> Stattdessen: **Kontrolliert testen + daraus lernen**

---

## Testplan (35 Requests + 15 Reserve)

### Phase 1: Technischer Endpoint-Test (max. 5 Requests)
**Ziel:** Endpoint + Response-Format verstehen

| # | City | Limit | since_date | Zweck |
|---|------|-------|------------|-------|
| 1 | Berlin | 5 | null | Basis-Test, Endpoint erreichbar? |
| 2 | Koblenz | 5 | null | Zielregion-Test |
| 3 | Neuwied | 5 | null | Zielregion-Test |
| 4 | Hamburg | 5 | null | Großstadt-Test |
| 5 | (Fehlerfall) | 5 | null | Ungültiger Filter / leeres Ergebnis |

**Checkliste:**
- [ ] Auth-Header korrekt?
- [ ] Request-Body korrekt?
- [ ] Response-Schema wie erwartet?
- [ ] Welche Felder liefert OpenRegister wirklich?
- [ ] Gibt es Daten für Zielregionen?

---

### Phase 2: Vertriebo-Zielregion-Test (max. 10 Requests)
**Ziel:** Prüfen ob genug frische Unternehmen kommen

| # | City | Radius | since_date | Legal Form | Zweck |
|---|------|--------|------------|------------|-------|
| 6 | Koblenz | 25km | 30 Tage | null | Frische Firmen (30 Tage) |
| 7 | Koblenz | 25km | 90 Tage | null | Frische Firmen (90 Tage) |
| 8 | Neuwied | 25km | 30 Tage | null | Frische Firmen (30 Tage) |
| 9 | Bendorf | 25km | 90 Tage | null | Kleine Stadt Test |
| 10 | Bonn | 25km | 180 Tage | null | Größeres Zeitfenster |
| 11-15 | Variationen | 25km | 30-180 Tage | null | Weitere Zielregionen |

**Checkliste:**
- [ ] Wie viele frische Firmen pro Region?
- [ ] since_date Filter funktioniert?
- [ ] Datenqualität für Vertriebo brauchbar?

---

### Phase 3: Branchen-/Rechtsform-Test (max. 10 Requests)
**Ziel:** Welche Filter liefern brauchbare Leads?

| # | City | Legal Form | since_date | Zweck |
|---|------|------------|------------|-------|
| 16 | Koblenz | GmbH | 90 Tage | GmbH Filter Test |
| 17 | Koblenz | UG | 90 Tage | UG Filter Test |
| 18 | Koblenz | GmbH & Co. KG | 90 Tage | KG Filter Test |
| 19 | Neuwied | GmbH | 90 Tage | GmbH in kleiner Stadt |
| 20 | Bonn | UG | 90 Tage | UG in Großstadt |
| 21-25 | Variationen | Verschiedene | 30-180 Tage | Weitere Rechtsformen |

**Checkliste:**
- [ ] Legal-Form-Filter funktioniert?
- [ ] Welche Rechtsformen sind verfügbar?
- [ ] Wie viele Treffer pro Rechtsform?
- [ ] Datenqualität für Zielgruppen-Segmentierung?

---

### Phase 4: Produktlogik-Test (max. 10 Requests)
**Ziel:** Vertriebo-Logik validieren

| # | Test-Szenario | Zweck |
|---|---------------|-------|
| 26 | Freshness Score Berechnung | since_date → Score Mapping |
| 27 | official_company_score | Legal Form → Score Mapping |
| 28 | unknown_geo Handling | Firmen ohne Geo-Daten |
| 29 | Dedupe Logik | Gegen bestehende Companies |
| 30-35 | Kombinationen | Realistische Szenarien |

**Checkliste:**
- [ ] Freshness Score plausibel?
- [ ] official_company_score sinnvoll?
- [ ] unknown_geo korrekt markiert?
- [ ] Duplikatsprüfung funktioniert?
- [ ] Daten für Anreicherung mit Places geeignet?

---

## Reserve: 15 Requests
**Zweck:** Debugging + erneute Tests

- Für unerwartete Fehlerfälle
- Erneute Tests nach Code-Anpassungen
- Unerwartete Response-Schemata
- Additional edge cases

---

## Aktuelle Function-Strategie

### Phase A: Endpoint-Validierung (JETZT)
```json
{
  "dry_run": true,
  "city": "Koblenz",
  "radius_km": 25,
  "limit": 5
}
```

✅ **Erlaubt:**
- Echter Fetch an OpenRegister
- Response-Preview anzeigen
- Schema validieren

❌ **Blockiert:**
- Speicherung in ExternalCompanySource
- Company-Erstellung

### Phase B: ExternalCompanySource-Speicherung (NACH Validierung)
```json
{
  "dry_run": false
}
```

✅ **Erlaubt:**
- Speicherung in ExternalCompanySource
- Radius-Status berechnen
- Dedupe-Logik anwenden

❌ **Immer noch blockiert:**
- Automatische Company-Erstellung (separater Schritt)

### Phase C: Vollständige Integration (SPÄTER)
- Company-Erstellung mit Geo-Anreicherung
- Places API für Adressen
- Lead-Scoring + Priorisierung

---

## Kosten-Nutzen-Analyse

### Free Plan (50 Requests/Monat)
**Gut für:**
- ✅ Prototyp-Validierung
- ✅ Endpoint-Testing
- ✅ Schema-Verständnis
- ✅ Datenqualität prüfen

**Nicht gut für:**
- ❌ Produktive Lead-Generierung
- ❌ Große Datenmengen
- ❌ Kontinuierliche Synchronisation

### Nächste Schritte (nach Prototyp)

#### Option 1: Paid Plan
- **Basic:** ~$50-100/Monat für 500-1000 Requests
- **Pro:** ~$200-500/Monat für 2000-5000 Requests
- **Enterprise:** Individuell

#### Option 2: Pricing-Modell-Anpassung
**Inklusive Kontingente:**
- **Starter (€99):** 0-50 OpenRegister Requests/Monat
- **Professional (€199):** 200 Requests/Monat
- **Gold (€349):** 500 Requests/Monat
- **Agency (€599):** Individuell

**Add-on:**
- "Frische Firmensignale": €50/Monat für 500 Requests
- Pay-per-Use: €0.10-0.20 pro Request

#### Option 3: Hybrid
- Basis-Leads aus Places API (günstiger)
- OpenRegister nur für Premium/Verified-Leads
- Freshness-Score als Upsell-Feature

---

## UI-Strategie (Kunden-Kommunikation)

### Nicht sagen:
❌ "OpenRegister Requests"  
❌ "API Calls"  
❌ "Externe Datenquelle"

### Besser sagen:
✅ "Frische Firmensignale"  
✅ "Neue Unternehmen im Suchgebiet"  
✅ "Handelsregister-Updates"  
✅ "Firmen-Finder Premium"

### Beispiel-Texte:

**Starter Plan:**
> "Basis-Leads aus Google Places + manuelle Erfassung"

**Professional Plan:**
> "Inklusive 200 frische Firmensignale aus Handelsregistern pro Monat"

**Gold Plan:**
> "Inklusive 500 frische Firmensignale + erweiterte Firmen-Informationen"

**Add-on:**
> "Firmen-Finder Premium: 500 zusätzliche frische Signale für €50/Monat"

---

## Nächste Aktionen

### 1. Endpoint-Test (5 Requests)
```bash
# Test 1: Berlin
POST /functions/syncOpenRegister
{
  "dry_run": true,
  "city": "Berlin",
  "limit": 5
}

# Test 2-4: Zielregionen
# Test 5: Fehlerfall
```

### 2. Response dokumentieren
- [ ] Alle Felder im Response notieren
- [ ] Mit erwartetem Schema vergleichen
- [ ] Fehlende Felder identifizieren
- [ ] Mapping anpassen

### 3. Function anpassen
- [ ] Feld-Mapping korrigieren
- [ ] Error-Handling verbessern
- [ ] dry_run=false freigeben (nach Validierung)

### 4. Pricing kalkulieren
- [ ] OpenRegister-Kosten in Plan-Preise einrechnen
- [ ] Fair-Use-Kontingente definieren
- [ ] Add-on-Preise festlegen

---

## Akzeptanz-Kriterien für nächste Etappe

```json
{
  "freePlan50RequestsUsedForPrototypeTesting": true,
  "dryRunUnderstoodAsNoDatabaseWriteButExternalRequest": true,
  "controlledTestPlanPrepared": true,
  "endpointAndResponseSchemaWillBeValidatedBeforeSaving": true,
  "openRegisterCostsWillBeIncludedInFuturePricing": true,
  "freshLeadFeatureCanBecomePaidAddOnOrPlanBenefit": true
}
```

---

## Risikomanagement

### Risiko 1: Response-Schema weicht ab
**Mitigation:**
- dry_run=true verhindert Daten-Korruption
- Response logging für Debugging
- Flexibles Mapping implementieren

### Risiko 2: Zu wenige Treffer
**Mitigation:**
- since_date anpassen (längere Zeiträume)
- Legal-Form-Filter erweitern
- Alternative Datenquellen prüfen

### Risiko 3: Zu viele Treffer (Kosten)
**Mitigation:**
- Limit strikt einhalten
- Pagination implementieren
- Priorisierung nach Freshness

### Risiko 4: Datenqualität schlecht
**Mitigation:**
- Manuelle Stichproben
- Places API für Adress-Validierung
- User-Feedback-Schleife einbauen

---

## Erfolgskennzahlen

### Technische KPIs:
- ✅ Endpoint-Verfügbarkeit > 95%
- ✅ Response-Time < 5s
- ✅ Schema-Validität > 90%

### Business KPIs:
- ✅ Frische Leads pro Request > 0.5
- ✅ Duplikat-Rate < 20%
- ✅ Geo-Coding-Rate > 80%

### User Experience:
- ✅ Zeit bis erster Lead < 30s
- ✅ Datenqualität > 4/5 Sterne
- ✅ Filter-Genauigkeit > 85%

---

**Letztes Update:** 2025-01-14  
**Status:** Bereit für Phase 1 Tests  
**Nächster Schritt:** Endpoint-Test mit 5 Requests