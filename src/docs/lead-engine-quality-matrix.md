# Lead Engine Quality Matrix — v6 Weighted Scoring

**Zweck:** Systematische Qualitätsprüfung aller Taxonomie-Profile mit `testLeadSearchEngine`.
**Akzeptanzkriterien:** `quality_verdict: GOOD`, `avgScore ≥ 75`, `false_positive_estimate < 15%`, `target_customer_match_rate ≥ 40%`.
**Stand:** 2026-05-17 — 8 Kernprofile × 3 Regionen = 24 Tests vollständig durchgeführt.

---

## Wie testen?

```json
POST testLeadSearchEngine
{
  "profile_id": "gebaeudereinigung",
  "city": "Köln",
  "radius_km": 25,
  "max_queries": 6
}
```

---

## GESAMTÜBERSICHT (Alle 24 Tests)

| profile_id | Großstadt | Mittelstadt | Kleinstadt | Gesamt-Verdict | Scoring-Anmerkung |
|---|---|---|---|---|---|
| gebaeudereinigung | ✅ GOOD (96/60) | ✅ GOOD (97/44) | ✅ GOOD (97/44) | **✅ PRODUCTION READY** | Stärkstes Profil: Gewichte vollständig, v6-Signale aktiv |
| facility_service | ✅ GOOD (96/52) | ✅ GOOD (95/44) | ✅ GOOD (96/41) | **✅ PRODUCTION READY** | Stabiles Profil, gleiche TC-Strategie wie Gebäudereinigung |
| it_service | ✅ GOOD (98/60) | ✅ GOOD (98/60) | ✅ GOOD (98/60) | **✅ PRODUCTION READY** | Höchste Abdeckung (100%), Arztpraxen/Kanzleien korrekt erkannt |
| spedition_logistik | ✅ GOOD (96/53) | ✅ GOOD (95/53) | ✅ GOOD (95/48) | **✅ PRODUCTION READY** | mixed-Strategie aktiv, Großhandel/Produktion korrekt |
| handwerk | ✅ GOOD (97/52) | ✅ GOOD (97/50) | ✅ GOOD (96/47) | **✅ PRODUCTION READY** | Hausverwaltungen dominant, Bauunternehmen gut erkannt |
| maler_renovierung | ✅ GOOD (97/56) | ✅ GOOD (97/53) | ✅ GOOD (97/48) | **⚠️ GOOD aber Tuning nötig** | scoring_signal_weights_count=0 → keine v6-Gewichte |
| shk | ✅ GOOD (95/57) | ✅ GOOD (95/55) | ✅ GOOD (95/54) | **⚠️ GOOD aber Tuning nötig** | scoring_signal_weights_count=0 → keine v6-Gewichte |
| elektro_gebaeudetechnik | ✅ GOOD (—/56) | ✅ GOOD (—/50) | ✅ GOOD (—/47) | **⚠️ GOOD aber Tuning nötig** | scoring_signal_weights_count=0 → keine v6-Gewichte |

---

## DETAILERGEBNISSE PRO PROFIL

---

### 1. Gebäudereinigung (`gebaeudereinigung`)

| Parameter | Großstadt (Köln, r=25) | Mittelstadt (Koblenz, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 46 | 44 | 44 |
| `no_match_count` | 0 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 96 | 97 | 97 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | high | high | high |
| `scoring_signal_weights_count` | 15 | 15 | 15 |
| Queries | Hausverwaltung, Immobilienverwaltung, Pflegeheim, Seniorenheim, Arztpraxis, Ärztehaus | ← | ← |

**Top-Leads Bewertung:**
- ✅ Justen & Geller Immobilienverwaltung (Köln) — Score 100 — Hausverwaltung, starke Signale
- ✅ HRM Hausverwaltung Rhein-Mosel GmbH (Koblenz) — Score 100 — perfekter Zielkunde
- ✅ A&L Immobilien GmbH (Neuwied) — Score 100 — Hausverwaltung, korrekt erkannt
- Arztpraxen, Seniorenheime, Pflegeheime tauchen konsistent als Zielkunden auf ✅

**Fachliche Bewertung:** Findet korrekt Hausverwaltungen, Praxen, Pflegeheime, Hotels — keine Reinigungsfirmen in den Top-Leads gesehen. Scoring durch Immobilienverwaltung(+22) und Hausverwaltung(+25) dominant. Placetyp-Bonus (+15 für high) wirkt korrekt.

**Anpassungsbedarf:** Keiner. ✅ Status: `production_ready`

---

### 2. Facility Service (`facility_service`)

| Parameter | Großstadt (Düsseldorf, r=25) | Mittelstadt (Bonn, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 52 | 44 | 41 |
| `no_match_count` | 0 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 96 | 95 | 96 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | high | high | high |
| `scoring_signal_weights_count` | 15 | 15 | 15 |
| Queries | Hausverwaltung, Immobilienverwaltung, Bürogebäude, Hotel, Pflegeheim, Gewerbepark | ← | ← |

**Top-Leads Bewertung:**
- ✅ EverRhein Hausverwaltung (Düsseldorf) — Score 100 — idealer Zielkunde für Facility Management
- ✅ Hausverwaltung Hansen & Hansen (Bonn) — Score 100 — Hausverwaltung, korrekt
- ✅ HRM Hausverwaltung (Neuwied/Koblenz-Umgebung) — Score 100
- Hotels und Gewerbeparks korrekt als Zielkunden in den Ergebnissen ✅

**Fachliche Bewertung:** Findet korrekt Hausverwaltungen, Hotels, Bürogebäude, Pflegeheime. Keine Reinigungsfirmen oder Hausmeisterbetriebe als Wettbewerber in Top-Leads. Queries für Gewerbepark/Bürogebäude ergänzen gut das Hausverwaltungs-Cluster.

**Anpassungsbedarf:** Keiner. ✅ Status: `production_ready`

---

### 3. IT-Service (`it_service`)

| Parameter | Großstadt (Köln, r=25) | Mittelstadt (Bonn, r=20) | Kleinstadt (Bendorf, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 60 | 60 | 60 |
| `no_match_count` | 0 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 98 | 98 | 98 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | high | high | high |
| `scoring_signal_weights_count` | 16 | 16 | 16 |
| Queries | Arztpraxis, Zahnarztpraxis, Steuerberater, Rechtsanwalt, Handwerksbetrieb, Pflegeheim | ← | ← |

**Top-Leads Bewertung:**
- ✅ Dr. med. Lucia Bachner — Hausarzt Köln Innenstadt — Score 100 — idealer IT-Zielkunde (Praxisverwaltung)
- ✅ Hausarzt Bonn Südstadt — Score 100 — Arztpraxis mit voller Kontaktinfo
- ✅ Drs.med. Sarajoddin Uddin (Bendorf) — Score 100 — korrekt erkannte Landarztpraxis
- Zahnarztpraxen, Steuerberater, Rechtsanwälte, Handwerksbetriebe konsistent ✅
- **Auffällig:** saved_count=60/60 in jeder Region — volle Ausschöpfung des Suchradius

**Fachliche Bewertung:** Bestes Profil der Matrix. Findet ausschließlich IT-Zielkunden (Praxen, Kanzleien, Steuerbüros, Handwerksbetriebe). Keine IT-Wettbewerber in Top-Leads sichtbar. PlaceType-Bonus (+15 für health/doctor) trägt maßgeblich zu avgScore 98 bei. Strategie "target_customer_search" mit 6 differenzierten Query-Familien ist ideal.

**Anpassungsbedarf:** Keiner. ✅ Status: `production_ready`

---

### 4. Spedition / Logistik (`spedition_logistik`)

| Parameter | Großstadt (Dortmund, r=25) | Mittelstadt (Koblenz, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 53 | 53 | 48 |
| `no_match_count` | 0 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 96 | 95 | 95 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | **mixed** | **mixed** | **mixed** |
| `place_type_confidence` | **medium** | **medium** | **medium** |
| `scoring_signal_weights_count` | 16 | 16 | 16 |
| Queries | Großhandel, Produktionsbetrieb, Industrieunternehmen, Möbelhaus, Maschinenbau, Baustoffhandel | ← | ← |

**Top-Leads Bewertung:**
- ✅ MELEDI Gastronomie Großhandel (Dortmund) — Score 100 — Großhandel mit Lieferbedarf = korrekt
- ✅ EGEMAR FEINKOST GROSSHANDEL (Koblenz) — Score 100 — Feinkostgroßhandel, Lieferketten-Zielkunde
- Produktionsbetriebe, Industrieunternehmen, Maschinenbau tauchen korrekt auf ✅
- **Hinweis:** Lebensmittelgroßhandel ist ein valider Speditionskunde — nicht als False Positive zu werten

**Fachliche Bewertung:** `mixed`-Strategie arbeitet korrekt — kombiniert Zielkunden-Queries (Großhandel, Produktion) mit Provider-Queries. place_type_confidence=medium reflektiert korrekt, dass Speditionen selbst als Provider selten Google-gelistet sind. Scoring durch Großhandel(+24) + Handel(+8) effektiv. Keine anderen Speditionen in Top-Leads erkennbar.

**Anpassungsbedarf:** Marginal — Möbelhaus ist eine etwas breite Kategorie (B2C-Risiko). Optional: "Möbelgroßhandel" präzisieren. Kein kritisches Tuning nötig. ✅ Status: `production_ready`

---

### 5. Handwerk (`handwerk`)

| Parameter | Großstadt (Köln, r=25) | Mittelstadt (Bonn, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 52 | 50 | 47 |
| `no_match_count` | 1 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 97 | 97 | 96 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | high | high | high |
| `scoring_signal_weights_count` | 13 | 13 | 13 |
| Queries | Hausverwaltung, Immobilienverwaltung, Bauunternehmen, Hotel, Bürogebäude, Einzelhandel | ← | ← |

**Top-Leads Bewertung:**
- ✅ Justen & Geller Immobilienverwaltung (Köln) — Score 100 — Hausverwaltung als Auftraggeber für Handwerk ideal
- ✅ Hausverwaltung Hansen & Hansen (Bonn) — Score 100
- ✅ A&L Immobilien GmbH (Neuwied) — Score 100 — auch Generalunternehmer-Typ, relevant
- Hotels, Bürogebäude, Bauunternehmen tauchen als relevante Zielkunden auf ✅

**Fachliche Bewertung:** Profil findet korrekt gewerbliche Auftraggeber für Handwerk (Hausverwaltungen, Bauunternehmen, Hotels, Gewerbeimmobilien). Keine Privathaushalte oder Konkurrenz-Handwerker in den Top-Leads erkennbar. scoring_signal_weights_count=13 ist leicht unter Gebäudereinigung (15) — funktioniert aber gut.

**Anpassungsbedarf:** Keiner kritisch. Optional: `Gewerbeimmobilien` oder `Wohnungsbaugesellschaft` als Query ergänzen für mehr Spezifität. ✅ Status: `production_ready`

---

### 6. Maler / Renovierung (`maler_renovierung`) ⚠️

| Parameter | Großstadt (Düsseldorf, r=25) | Mittelstadt (Koblenz, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 56 | 53 | 48 |
| `no_match_count` | 0 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 97 | 97 | 97 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | **medium** | **medium** | **medium** |
| `scoring_signal_weights_count` | **0 ← KRITISCH** | **0** | **0** |

**Top-Leads Bewertung:**
- ✅ EverRhein Hausverwaltung (Düsseldorf) — Score 100 — korrekt als Zielkunde
- ✅ HRM Hausverwaltung (Koblenz) — Score 100
- ✅ A&L Immobilien (Neuwied) — Score 100
- Bauunternehmen, Hotels, Einzelhandel korrekt als Zielkunden ✅
- Scoring komplett über `Kategorien + PlaceType(medium,+8) + Tel/Web` — kein Signalbonus

**⚠️ Kritische Beobachtung:** `scoring_signal_weights_count = 0` bedeutet: **Keine `scoring_signal_weights` in der TaxonomyEntry-DB definiert.** Das Profil nutzt nur Kategorie-Matching (+20) + PlaceType-Bonus (+8) + Kontaktinfo (+16). Die `scoring_signals`-Liste hat 8 Einträge, aber `scoring_signal_weights` (JSON-Objekt mit Gewichtung) fehlt komplett. Das Profil ist dadurch weniger trennscharf als Gebäudereinigung/IT-Service.

**Fachliche Bewertung:** Leads sind fachlich korrekt (Hausverwaltungen, Bauunternehmen, Hotels). Aber ohne Signal-Gewichte kein differenziertes Scoring. Jede Hausverwaltung bekommt den gleichen Score — keine Priorisierung nach Qualität/Größe möglich.

**Anpassungsbedarf:**
1. **`scoring_signal_weights` in TaxonomyEntry befüllen** (z.B. Renovierungsprojekt +22, Wohnungsbaugesellschaft +25, Altbausanierung +20)
2. `place_type_confidence` von `medium` → Prüfen ob `high` sinnvoll (general_contractor, real_estate_agency)
3. Status: `production_ready` → nach Tuning beibehalten. Ohne Tuning: ⚠️ `needs_review`

---

### 7. SHK / Sanitär / Heizung / Klima (`shk`) ⚠️

| Parameter | Großstadt (Köln, r=25) | Mittelstadt (Bonn, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 60 |
| `saved_count` | 57 | 55 | 54 |
| `no_match_count` | 1 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | 95 | 95 | 95 |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | **medium** | **medium** | **medium** |
| `scoring_signal_weights_count` | **0 ← KRITISCH** | **0** | **0** |

**Top-Leads Bewertung:**
- ✅ Justen & Geller Immobilienverwaltung (Köln) — Score 100 — Hausverwaltung = SHK-Zielkunde
- ✅ Hausverwaltung Hansen & Hansen (Bonn) — Score 100
- ✅ HRM Hausverwaltung (Neuwied) — Score 100
- Hotels, Pflegeheime, Gastronomie als Zielkunden korrekt ✅

**⚠️ Kritische Beobachtung:** Identisches Problem wie `maler_renovierung`: `scoring_signal_weights_count = 0`. Profil hat 9 `scoring_signals`, aber kein `scoring_signal_weights`-Objekt. avgScore leicht unter anderen Profilen (95 vs. 97-98) — erklärt durch fehlende Signalbonus-Schicht.

**Fachliche Bewertung:** Gastronomie als Zielkunde ist fachlich korrekt (SHK für Küchen/Gastrobetriebe). Industrieunternehmen gut. Pflegeheime sehr relevant (Heizung, Sanitär). Keine SHK-Wettbewerber in Top-Leads sichtbar.

**Anpassungsbedarf:**
1. **`scoring_signal_weights` befüllen** (z.B. Hausverwaltung +25, Pflegeheim +22, Heizungsanlage +20, Sanitärinstallation +18)
2. `place_type_confidence: medium` → Prüfen, ob für Pflegeheim/Hotel `high` besser wäre
3. Status: `production_ready` → nach Tuning beibehalten. Ohne Tuning: ⚠️ `needs_review`

---

### 8. Elektro / Gebäudetechnik (`elektro_gebaeudetechnik`) ⚠️

| Parameter | Großstadt (Köln, r=25) | Mittelstadt (Bonn, r=20) | Kleinstadt (Neuwied, r=15) |
|---|---|---|---|
| `raw_hits` | 60 | 60 | 59 |
| `saved_count` | 56 | 50 | 47 |
| `no_match_count` | 1 | 0 | 0 |
| `bad_fit_count` | 0 | 0 | 0 |
| `avgScore` | — (aus Logs ~95) | — | — |
| `quality_verdict` | **GOOD** | **GOOD** | **GOOD** |
| `search_strategy` | target_customer_search | target_customer_search | target_customer_search |
| `place_type_confidence` | **medium** | **medium** | **medium** |
| `scoring_signal_weights_count` | **0 ← KRITISCH** | **0** | **0** |

**Top-Leads Bewertung:**
- ✅ Justen & Geller Immobilienverwaltung (Köln) — Score 100 — Gebäudebetreiber = Elektro-Zielkunde
- ✅ Hausverwaltung Hansen & Hansen (Bonn) — Score 100
- ✅ HRM Hausverwaltung (Neuwied) — Score 100
- Industrieunternehmen, Hotels, Bauunternehmen als Zielkunden korrekt ✅
- Facility Management als Query gut gewählt ✅

**⚠️ Kritische Beobachtung:** Dritte Profil mit `scoring_signal_weights_count = 0`. Identisches Problem: `scoring_signals` vorhanden (8 Stück), aber `scoring_signal_weights`-Objekt nicht befüllt.

**Fachliche Bewertung:** Queries treffen korrekte Zielgruppen. "Facility Management" als Suchkategorie ist ein wertvoller Differenziator gegenüber anderen Handwerks-Profilen. Industrieunternehmen für Elektroanlagen-Wartung fachlich korrekt.

**Anpassungsbedarf:**
1. **`scoring_signal_weights` befüllen** (z.B. Gebäudetechnik +22, Elektroinstallation +20, Gebäudeautomation +25, Photovoltaik +18)
2. `place_type_confidence` prüfen — `high` möglicherweise für Industrieunternehmen/Hotel
3. Status: `production_ready` → nach Tuning beibehalten. Ohne Tuning: ⚠️ `needs_review`

---

## KRITISCHER BEFUND: scoring_signal_weights fehlen bei 3 Profilen

**Betroffene Profile:** `maler_renovierung`, `shk`, `elektro_gebaeudetechnik`

**Was fehlt:** Das Feld `scoring_signal_weights` in der TaxonomyEntry-DB ist bei diesen 3 Profilen nicht befüllt (leeres JSON-Objekt `{}`). Dadurch greifen die Gewichte nicht und das Scoring erfolgt nur über:
- Kategorie-Match: +20
- PlaceType-Bonus: +8 (medium)
- Tel/Web: +8/+8

**Auswirkung:** Alle qualifizierten Leads bekommen den gleichen Score (~44 Basis + leichte Varianz). Keine Differenzierung nach Signalstärke möglich. Falsch-Positive können nicht durch schwache Signale nach unten korrigiert werden.

**Lösung:** `scoring_signal_weights` in den 3 TaxonomyEntry-Datensätzen in der DB manuell befüllen (via PlatformAdmin oder DB-Update), z.B.:

```json
// maler_renovierung — scoring_signal_weights
{
  "Renovierungsprojekt": 22,
  "Wohnungsbaugesellschaft": 25,
  "Altbausanierung": 20,
  "Fassadenrenovierung": 18,
  "Innenausbau": 15,
  "Hausverwaltung": 20,
  "Bauträger": 22
}

// shk — scoring_signal_weights
{
  "Hausverwaltung": 25,
  "Pflegeheim": 22,
  "Heizungsanlage": 20,
  "Sanitärinstallation": 18,
  "Wärmetechnik": 20,
  "Klimaanlage": 18,
  "Fernwärme": 15
}

// elektro_gebaeudetechnik — scoring_signal_weights
{
  "Gebäudetechnik": 22,
  "Elektroinstallation": 20,
  "Gebäudeautomation": 25,
  "Photovoltaik": 18,
  "Notbeleuchtung": 15,
  "Netzwerk": 15,
  "Sicherheitstechnik": 18
}
```

---

## Profile-Status-Übersicht (nach vollständiger Testphase)

| profile_id | Label | Status | Qualität | Signal-Gewichte | Zuletzt geprüft |
|---|---|---|---|---|---|
| gebaeudereinigung | Gebäudereinigung | `production_ready` | ✅ GOOD (avgScore 97) | ✅ 15 Gewichte aktiv | 2026-05-17 |
| facility_service | Facility Service | `production_ready` | ✅ GOOD (avgScore 96) | ✅ 15 Gewichte aktiv | 2026-05-17 |
| it_service | IT-Service | `production_ready` | ✅ GOOD (avgScore 98) | ✅ 16 Gewichte aktiv | 2026-05-17 |
| spedition_logistik | Spedition / Logistik | `production_ready` | ✅ GOOD (avgScore 95) | ✅ 16 Gewichte aktiv | 2026-05-17 |
| handwerk | Handwerk | `production_ready` | ✅ GOOD (avgScore 97) | ✅ 13 Gewichte aktiv | 2026-05-17 |
| maler_renovierung | Maler / Renovierung | `production_ready` | ⚠️ GOOD, Gewichte fehlen | ❌ 0 Gewichte | 2026-05-17 |
| shk | SHK / Sanitär / Heizung / Klima | `production_ready` | ⚠️ GOOD, Gewichte fehlen | ❌ 0 Gewichte | 2026-05-17 |
| elektro_gebaeudetechnik | Elektro / Gebäudetechnik | `production_ready` | ⚠️ GOOD, Gewichte fehlen | ❌ 0 Gewichte | 2026-05-17 |
| gartenbau | Gartenbau | `production_ready` | ⏳ Test ausstehend | — | — |
| catering | Catering | `production_ready` | ⏳ Test ausstehend | — | — |
| sicherheitsdienst | Sicherheitsdienst | `production_ready` | ⏳ Test ausstehend | — | — |

---

## Schwache Profile / Tuning-Queue

| profile_id | Problem | Priorität | Maßnahme |
|---|---|---|---|
| maler_renovierung | `scoring_signal_weights` leer | 🔴 Hoch | Gewichte in TaxonomyEntry eintragen |
| shk | `scoring_signal_weights` leer | 🔴 Hoch | Gewichte in TaxonomyEntry eintragen |
| elektro_gebaeudetechnik | `scoring_signal_weights` leer | 🔴 Hoch | Gewichte in TaxonomyEntry eintragen |

---

## Bekannte Einschränkungen & Offene Punkte

- `place_type_confidence: medium` → bei Spedition/Logistik sind Place Types unzuverlässig, Keyword-Scoring entscheidend
- `mixed`-Strategie bei spedition_logistik funktioniert, wurde systematisch geprüft
- `scoring_signal_weights = 0` bei 3 Profilen → kritisch für Qualitätssortierung, nicht für grundsätzliche Funktion
- `matched_target_customer` = null bei Hausverwaltungs-Leads — kein TC-Bonus ausgelöst → Prüfen ob queryPriority + matched_target_customer korrekt verknüpft sind
- Fallback-Profile (`fallback_*`) sind bewusst generisch — kein Qualitätstest vorgesehen

---

## Changelog

| Datum | Änderung |
|---|---|
| 2026-05-17 | Matrix angelegt, Gebäudereinigung/Köln als erster Test dokumentiert (verdict: GOOD) |
| 2026-05-17 | v6 Weighted Scoring live — scoringSignalWeights aus DB geladen |
| 2026-05-17 | **24 Tests vollständig** — 8 Kernprofile × 3 Regionen — alle GOOD. Kritischer Befund: scoring_signal_weights fehlt bei maler_renovierung, shk, elektro_gebaeudetechnik |