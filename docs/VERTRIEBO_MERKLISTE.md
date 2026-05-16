# Vertriebo Merkliste

Diese Datei ist die zentrale Merkliste für Entscheidungen, Risiken, Produktregeln und Zukunftspunkte. Sie soll bei neuen Erkenntnissen fortlaufend aktualisiert werden.

---

## 1. Immer den Gesamtfluss prüfen

Bei jeder Änderung muss der komplette Vertriebo-Flow mitgedacht werden:

```txt
Onboarding → Dashboard → Leadseite → LeadDetail → Engine → Leitfaden → Billing/Pricing
```

Keine isolierten Änderungen, die nur eine Seite verbessern und an anderer Stelle Verwirrung erzeugen.

Akzeptanzregel für künftige Aufgaben:

```json
{
  "onboardingImpactChecked": true,
  "dashboardImpactChecked": true,
  "leadPageImpactChecked": true,
  "leadDetailImpactChecked": true,
  "billingImpactChecked": true,
  "terminologyConsistentAcrossFlow": true
}
```

---

## 2. Lead-Recherche / Phase 2 – MVP-Stand

Phase 2 gilt für den MVP als erledigt.

Bestätigt:

- Mobile Recherche funktioniert nach Fast-Mode.
- Desktop bleibt bei maximal 25 Firmenkontakten pro Recherchelauf.
- Mobile Fast-Mode nutzt maximal 10 Kontakte pro Lauf.
- Monatslimit und Per-Run-Limit sind getrennt.
- Starter bleibt bei 300 Firmenkontakten pro Monat.
- ResearchDialog zeigt Laufdaten und Monatsnutzung getrennt.
- Leadseite hat Load-More, damit ältere bezahlte/generierte Kontakte erreichbar bleiben.

Wichtige Begriffe:

```txt
Per-Run-Limit = maximale Kontakte pro einzelner Recherche
Monatslimit = Firmenkontakte pro Monat laut Plan
Geladene Kontakte = aktuell auf der Leadseite aus der DB geladen
Angezeigte Kontakte = nach Filter/Visible-Slice sichtbar
```

Nicht verwechseln:

```txt
100 geladene Kontakte ≠ 100 Monatslimit
245/300 genutzt ≠ 245 aktuell geladen
```

---

## 3. Leadseite / Kontakte laden

Aktueller MVP-Ansatz:

- Initial werden 100 Kontakte geladen.
- Über `Weitere 100 Kontakte laden` können ältere Kontakte nachgeladen werden.
- Damit fühlt sich der Kunde nicht so, als wären bezahlte Kontakte verschwunden.

Produktregel:

```txt
Wenn Firmenkontakte zum Monatskontingent zählen, müssen sie für den Kunden auch erreichbar/ladbar sein.
```

Mittelfristig besser:

- echte Pagination
- Total Count
- Backend-Funktion `getLeadPageSummary`

Mögliche Summary:

```js
{
  total_companies,
  loaded_companies,
  callbacks_open,
  engine_status_counts,
  monthly_usage
}
```

---

## 4. Vertriebo Engine vs. Gesprächsleitfaden

Die Vertriebo Engine ist nicht der Gesprächsleitfaden.

EngineBox soll kompakt bleiben:

- Score
- Temperatur
- Sicherheit
- Kurzfazit
- Warum diese Bewertung?
- Nächster bester Schritt
- kompakte Signale/Risiken/fehlende Daten

Nicht dauerhaft in der EngineBox ausrollen:

- Gesprächsansatz
- Eröffnungssatz
- Qualifizierungsfragen
- Einwände
- Gesprächsstruktur

Diese Inhalte gehören in den Gesprächsleitfaden. Backend darf die Daten weiter erzeugen/speichern, damit der Leitfaden sie später nutzen kann.

---

## 5. Engine Status auf der Leadseite

EngineStatsBox arbeitet nur mit aktuell geladenen Leads. Deshalb muss die UI klar sagen:

```txt
Status der aktuell geladenen Kontakte
```

Nicht suggerieren, dass die Zahlen immer den kompletten Monatsbestand darstellen.

Begriff `Offen` vermeiden, wenn eigentlich `Unanalysiert` gemeint ist.

---

## 6. analyzeLeadEngine – P0 erledigt, aber merken

P0-Fixes wurden umgesetzt:

- Access/Usage abgesichert.
- Sales Rep darf nur zugewiesene Leads analysieren.
- Latest Mode berücksichtigt verbleibende AI-Scorings.
- `open` wird für Legacy-Feld auf `unknown` gemappt.
- Engine JSON darf `open` behalten.

Für später merken:

- Access-/Billing-Logik zentralisieren.
- `checkAccess` und Inline-Access-Logiken dürfen nicht auseinanderlaufen.
- Single und Latest sollten dauerhaft denselben Analyse-/Persistenzpfad nutzen.

Zielstruktur:

```js
buildLeadContext()
analyzeContext()
persistAnalysis()
```

---

## 7. OpenRegister + Google Pipeline – aktueller Stand

Die technische Pipeline ist grundsätzlich vorhanden:

```txt
OpenRegister → ExternalCompanySource → Google Matching → needs_review / ready_for_review → Promotion → Company
```

### Phase B: syncOpenRegister

Bestanden:

- echte OpenRegister-Daten werden abgerufen
- Speicherung in `ExternalCompanySource`
- keine Company-Erstellung
- dry_run funktioniert
- Dedupe gegen ExternalCompanySource und Company
- API-Key nur aus ENV
- Limit maximal 50
- Statusfelder korrekt

Hinweis: Koblenz lieferte 0 Treffer. Das ist aktuell eher Datenverfügbarkeit/Filterverhalten der OpenRegister-API, nicht zwingend ein Code-Bug.

Spätere Fallbacks:

- PLZ-/Stadtvarianten
- nahe Städte
- weniger harte Filter
- Bundesland/Region statt nur Stadt
- OpenRegister nicht als einzige Quelle betrachten

### Phase C: matchExternalSourceWithGooglePlaces

Bestanden:

- liest pending ExternalCompanySource-Einträge
- sucht Google Places
- speichert Google Place ID
- speichert Latitude/Longitude
- speichert Distance/Radius-Status
- speichert Confidence
- phone/website in `raw_data._google_match`
- keine Company-Erstellung

Statuslogik:

```txt
Google-Treffer + gute Confidence + im Radius → enriched / ready_for_review
Google-Treffer + gute Confidence + außerhalb Radius → enriched / outside_radius
Google-Treffer + niedrige Confidence → needs_review / needs_review
Kein Google-Treffer → failed / imported
```

Niedrige Confidence darf nicht als endgültig failed verloren gehen.

### Phase D: promoteExternalSourceToCompany

Bestanden:

- Access Check
- Sales Rep blockiert
- Status-Gate
- needs_review nur mit force_promote
- outside_radius nicht promoten
- failed/duplicate/promoted/rejected nicht promoten
- Dedupe gegen Company
- Blacklist Check
- Monatslimit Check
- UsageLog leads_created +1
- Company Erstellung
- ExternalCompanySource wird auf `promoted_to_company` gesetzt
- keine automatische Engine-Analyse

Merken:

- `promoted_to_company` ist der genutzte Status.
- `quelle` steht aktuell noch auf `API`; später besser `OpenRegister + Google` oder `openregister_google`.
- Website/Telefon kommen aus `raw_data._google_match`.
- Company sollte langfristig echte Felder für `google_place_id` und `external_source_id` haben.

---

## 8. Nächster sinnvoller Produkt-Schritt

Nicht noch mehr Backend-Functions bauen.

Als nächstes braucht Vertriebo eine kleine interne Review-/Import-Kandidaten-Oberfläche.

Arbeitsname:

```txt
External Sources / Import-Kandidaten
```

Zweck:

- OpenRegister-Treffer sehen
- Google-Match-Status sehen
- Confidence sehen
- Radius sehen
- Telefon/Website sehen
- Kandidat ablehnen
- Kandidat als Lead übernehmen
- needs_review mit klarer Warnung force-promoten

MVP-UI:

```txt
Pending anzeigen
Needs Review anzeigen
Ready for Review anzeigen
Promoted anzeigen
Rejected anzeigen
```

Buttons:

```txt
Mit Google abgleichen
Als Lead übernehmen
Trotz niedriger Sicherheit übernehmen
Ablehnen
```

Kunde sollte nicht blind automatisch alle OpenRegister-Treffer als Leads bekommen. Review ist wichtig für Qualität und Vertrauen.

---

## 9. Pricing / Trial Regel

```txt
14 Tage kostenlos testen nur beim Starter.
```

Professional und Gold sollen nicht als Trial beworben werden.

CTA-Logik:

```txt
Starter → 14 Tage kostenlos testen / Starter kostenlos testen
Professional → Professional buchen / Professional starten
Gold → Gold buchen / Gold starten
Agency → Demo anfragen / Kontakt aufnehmen
```

Serverseitig muss `createCheckoutSession` sicherstellen:

```txt
trial_period_days nur bei Starter
kein Trial für Professional
kein Trial für Gold
Agency Checkout blockiert
```

Die hochgeladene HTML-Datei war nur ein Design-Test und kein verbindlicher Produktstand.

---

## 10. Sichtbares KI-Wording

Sichtbares `KI` nicht überall dominant verwenden.

Besser je nach Kontext:

```txt
Vertriebo Engine
Vertriebo Lead-Recherche
Vertriebo Empfehlung
Vertriebo Morgenreport
Automatische Bewertung
Intelligente Priorisierung
```

---

## 11. Design-Test / Landingpage

`preview2.html` ist nur Design-Inspiration.

Nicht daraus ableiten:

- Pricing-Regeln
- echte Produktlimits
- OpenRegister-Live-Versprechen
- Mockup-Zahlen
- echte Kundenstatistiken

Nutzen für:

- Look & Feel
- Hero-Aufbau
- Pricing-Karten-Layout
- Feature-Struktur
- FAQ-Struktur
- Animationen

---

## 12. Datenquellen-Produktlogik

Vertriebo-Differenzierung:

```txt
OpenRegister = frische/offizielle Firmensignale
Google = lokale Existenz, Kontakt-/Standortdaten, Website, Telefon
Vertriebo = Bewertung, Priorisierung, Aufgaben, Leitfaden, Follow-up
```

Nicht als reine Datenbank verkaufen.

Besser:

```txt
Neue Firmen früh erkennen, lokal prüfen, als vertriebsfähige Kontakte nutzbar machen.
```

---

## 13. Skalierung

Base44 aktuell nutzen, aber Architektur so vorbereiten, dass später auslagerbar sind:

- Engine
- Reports
- Automationen
- Lead-Engine
- Queues
- Datenbank/Backend
- OpenRegister/Google Matching

Bei 100–1.000 Kunden dürfen synchrone Functions nicht alles blockieren.

Langfristig wichtig:

- Batch-Verarbeitung
- Queues
- ResearchRun-Status
- Polling
- Hintergrundverarbeitung
- API-Kostenkontrolle
- Caching/Dedupe

---

## 14. Deutschlandweit denken

Keine hartcodierten Sonderlösungen für Koblenz/Bendorf/Neuwied.

Vertriebo muss deutschlandweit funktionieren:

- verschiedene Städte
- verschiedene Branchen
- verschiedene Zielkunden
- verschiedene Radien
- verschiedene Datenquellen-Verfügbarkeit

Lokale Tests sind okay, aber Logik muss generisch bleiben.

---

## 15. Offene Verbesserungen später

- echte Pagination auf Leadseite
- `getLeadPageSummary`
- echte ExternalSources Review UI
- Company-Felder für `source`, `google_place_id`, `external_source_id`
- Blacklist mit Website/Domain-Feld
- bessere OpenRegister-Fallbacks bei 0 Treffern
- zentrale Access-/Billing-Logik
- Tests/CI für kritische Flows
- Usage/Costs Reporting für OpenRegister und Google
- async ResearchRun statt langer synchroner Requests

---

## 16. Aktueller nächster empfohlener Schritt

Empfehlung:

```txt
Review-/Import-Kandidaten-Oberfläche bauen
```

MVP-Ziel:

```txt
Admin/Owner sieht ExternalCompanySource-Kandidaten,
kann Google Matching starten,
kann ready_for_review promoten,
kann needs_review bewusst force-promoten,
kann ablehnen.
```

Erst danach OpenRegister/Google für normale Kunden freigeben.
