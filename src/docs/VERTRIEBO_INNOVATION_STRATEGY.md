# Vertriebo – Innovations- & Förderstrategie

> Strategischer Entwicklungshinweis für alle Entwickler.
> Letzte Aktualisierung: 2026-05-17

---

## 1. Produktpositionierung

Vertriebo ist **kein klassisches CRM**, sondern ein:

> **KI-gestütztes Vertriebsautomatisierungssystem für Dienstleister und Mittelstand**
> mit automatischer Lead-Recherche, KI-Scoring, Branchenlogik, adaptiven Handlungsempfehlungen
> und intelligenten Automations-Workflows.

Das ist der Rahmen, in dem alle technischen Entscheidungen dokumentiert werden sollten.

---

## 2. Warum das wichtig ist (Förderung / Investoren)

Folgende Förderprogramme / Finanzierungswege könnten später relevant sein:

| Kanal | Relevanz |
|---|---|
| **Forschungszulagengesetz (FZulG)** | Eigene Algorithmen, Scoring-Logik, KI-Workflows |
| **ZIM-Förderung** | Innovationsprojekte KMU |
| **EXIST / Gründerförderung** | Technologiebasiertes Startup |
| **Investoren / Business Angels** | Skalierbare SaaS-Architektur |
| **Bankgespräche / Due Diligence** | Nachweisbare technische Innovation |

**Voraussetzung für Förderung:** Entwicklungsentscheidungen müssen nachvollziehbar dokumentiert sein.

---

## 3. Förderfähige Kernmodule

### ✅ Hoch-interessant (eigene Entwicklung / KI / Automation)

| Modul | Technische Innovation |
|---|---|
| **Lead-Recherche Engine** | Asynchrone Batch-Architektur, Google Places API Integration, Branchen-Taxonomie mit 22+ Industrien, Grid-basierte Geo-Suche |
| **Lead-Scoring System** | Eigener Scoring-Algorithmus (0–100), multi-dimensionale Signalgewichtung, Branchenprofile |
| **Branchen-Taxonomie** | 22+ Branchenprofile mit searchableCategories, scoringSignals, negativeKeywords, queryPriority – eigenentwickelt |
| **ResearchRun Engine** | Async Background Processing, idempotente Batch-Verarbeitung, Polling-Architektur |
| **OrgLearnedSignals** | Adaptive ML-Signale aus historischen Abschlüssen (priority_categories, winning_signals) |
| **KI-Empfehlungen** | LLM-gestützte nächste Schritte, Gesprächsstrategie, Lead-Temperatur-Analyse |
| **Lead-Temperatur-Engine** | hot/warm/cold Klassifikation mit Scoring-Begründungen |
| **Agenten-Workflows** | Vertriebsagent, Follow-Up-Agent, Priority-Agent, Cleanup-Agent |
| **Chain-Detection** | Algorithmus zur Erkennung von Filialketten / nicht-relevanten Targets |
| **Duplikat-Deduplizierung** | Place-ID + normierter Name + org-scope Idempotenz |
| **Geo-Grid-Suche** | Multi-Ring-Grid-Algorithmus für flächendeckende regionale Suche |

### ⚪ Standard (nicht förderfähig)
- Login / Auth
- Dashboard-Layout
- Einfache CRUD-Tabellen
- Landingpage / Design
- E-Mail-Versand via Brevo

---

## 4. Dokumentationspflicht für Entwickler

Bei jeder bedeutenden Funktion bitte folgendes festhalten (kann inline als Kommentar oder in `/docs` sein):

```
// WHY: Warum wurde diese Funktion gebaut?
// PROBLEM: Welches Problem löst sie?
// CHALLENGE: Welche technische Herausforderung gab es?
// AI/LOGIC: Welche KI-/Automationslogik steckt dahinter?
// ALTERNATIVES: Welche Alternativen wurden geprüft?
// INNOVATION: Was ist daran neuartig / eigenentwickelt?
```

**Beispiel (Lead-Scoring):**
```
// WHY: Kunden können nicht manuell hunderte Leads bewerten
// PROBLEM: Google Places liefert rohe Firmendaten ohne Relevanzurteil
// CHALLENGE: Relevanz ist branchenspezifisch, nicht generisch bewertbar
// AI/LOGIC: Eigenentwickelter Score (0–100) mit Kategorien-Matching,
//           Signalgewichtung, BadFit-Penalisierung, Geo-Distanz-Bonus
// ALTERNATIVES: Externe ML-API (zu teuer/langsam), manuelles Tagging (nicht skalierbar)
// INNOVATION: Branchenprofile mit 22 Industrien, eigenentwickelte Taxonomie,
//             adaptive Signale aus historischen Abschlüssen (OrgLearnedSignals)
```

---

## 5. Architekturprinzipien für Skalierbarkeit

Aktuell auf Base44, aber so gebaut dass später auslagerbar:

| Dienst | Aktuell | Späteres Ziel |
|---|---|---|
| KI-Service (LLM) | Base44 InvokeLLM | Eigener AI-Service / OpenAI direkt |
| Lead-Recherche | Deno Functions | Dedizierter Worker-Service / Queue |
| Scoring-Engine | Inline in Functions | Separater Microservice |
| Automationen | Base44 Automations | Celery / BullMQ / eigene Queue |
| Billing/Credits | Stripe + Base44 | Eigene Credit-Engine |
| Datenbank | Base44 Entities | PostgreSQL / Supabase |
| Auth | Base44 Auth | Auth0 / eigene JWT |

**Regel:** Keine harten Abhängigkeiten zu Base44-Spezifika in der Geschäftslogik.
Scoring-Algorithmen, Taxonomie und Engine-Logik sind bereits in `utils/` ausgelagert.

---

## 6. Zielbild Vertriebo

```
❌ Nicht:   "Ein CRM mit KI-Texten für kleine Betriebe"

✅ Sondern: "Ein digitaler Vertriebsmitarbeiter, der Dienstleistern automatisch
             passende Leads findet, bewertet, priorisiert und konkrete nächste
             Schritte empfiehlt – vollständig automatisiert."
```

### Kernthesen für Präsentationen / Förderanträge:

1. **Automatische Lead-Generierung** statt manueller Recherche
2. **Branchen-intelligentes Scoring** statt generischer Listen
3. **Adaptive Lernlogik** aus historischen Abschlüssen
4. **Multi-Agenten-Architektur** für autonome Vertriebsunterstützung
5. **Regionale Präzision** durch Grid-Algorithmus + Geo-Scoring
6. **Idempotente Background-Processing-Engine** für zuverlässige Skalierung

---

## 7. Nächste förderfähige Entwicklungsschritte

Priorisiert nach Innovation und Nachweisbarkeit:

1. **Verbesserte OrgLearnedSignals** – echtes Feedback-Loop-Learning aus Abschlüssen
2. **Predictive Lead Scoring** – Wahrscheinlichkeit eines Abschlusses pro Lead
3. **Automatische Gesprächsstrategie** – KI-generierte individuelle Ansprache je Branche
4. **Lead-Clustering** – automatische Gruppierung ähnlicher Firmenprofile
5. **Anomalie-Erkennung** – ungewöhnliche Kaufsignale früh erkennen
6. **Multi-Quellen-Enrichment** – OpenRegister + Google + weitere Quellen fusionieren

---

*Dieses Dokument wird mit dem Produkt gepflegt.*
*Entwickler: Bitte bei größeren Features kurze Innovation-Notiz ergänzen.*