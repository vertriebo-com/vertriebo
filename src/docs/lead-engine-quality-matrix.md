# Lead Engine Quality Matrix — v6 Weighted Scoring

**Zweck:** Systematische Qualitätsprüfung aller Taxonomie-Profile mit `testLeadSearchEngine`.
**Akzeptanzkriterien:** `quality_verdict: GOOD`, `avgScore ≥ 75`, `false_positive_estimate < 15%`, `target_customer_match_rate ≥ 40%`.

---

## Wie testen?

Backend-Funktion aufrufen:
```json
POST testLeadSearchEngine
{
  "profile_id": "gebaeudereinigung",
  "city": "Köln",
  "radius_km": 20,
  "max_queries": 4
}
```

---

## Getestete Profile

### Gebäudereinigung

| Parameter | Großstadt (Köln) | Mittelstadt (Koblenz) | Kleinstadt (Neuwied) |
|---|---|---|---|
| `radius_km` | 20 | 15 | 10 |
| `raw_hits` | 40 | — | — |
| `saved_count` | 28 | — | — |
| `no_match_count` | 0 | — | — |
| `avgScore` | 97 | — | — |
| `target_customer_match_rate` | hoch | — | — |
| `false_positive_estimate` | niedrig | — | — |
| `quality_verdict` | **GOOD** | — | — |
| `search_strategy` | target_customer_search | — | — |
| `place_type_confidence` | high | — | — |
| Wichtigste Beobachtung | Hausverwaltungen/Pflegeheime als Top-Leads, Scoring durch WEG-Signale (+28) dominant | — | — |
| Anpassungsbedarf | Keiner | — | — |

---

### Facility Service

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

### IT-Service

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

### Spedition / Logistik

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

### Handwerk (allgemein)

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

### Maler / Renovierung

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

### SHK / Sanitär / Heizung / Klima

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

### Elektro / Gebäudetechnik

| Parameter | Großstadt | Mittelstadt | Kleinstadt |
|---|---|---|---|
| `quality_verdict` | — | — | — |
| Anpassungsbedarf | _Test ausstehend_ | | |

---

## Profile-Status-Übersicht

| profile_id | Label | Status | Qualität | Zuletzt geprüft |
|---|---|---|---|---|
| gebaeudereinigung | Gebäudereinigung | production_ready | ✅ GOOD (avgScore 97) | 2026-05-17 |
| facility_service | Facility Service | production_ready | ⏳ ausstehend | — |
| it_service | IT-Service | production_ready | ⏳ ausstehend | — |
| spedition_logistik | Spedition / Logistik | production_ready | ⏳ ausstehend | — |
| handwerk | Handwerk | production_ready | ⏳ ausstehend | — |
| maler_renovierung | Maler / Renovierung | production_ready | ⏳ ausstehend | — |
| shk | SHK | production_ready | ⏳ ausstehend | — |
| elektro_gebaeudetechnik | Elektro / Gebäudetechnik | production_ready | ⏳ ausstehend | — |
| gartenbau | Gartenbau | production_ready | ⏳ ausstehend | — |
| catering | Catering | production_ready | ⏳ ausstehend | — |
| sicherheitsdienst | Sicherheitsdienst | production_ready | ⏳ ausstehend | — |

---

## Schwache Profile (needs_review / draft)

_Hier werden Profile eingetragen, die bei Tests `quality_verdict: NEEDS_TUNING` erhalten oder eine `false_positive_estimate > 20%` aufweisen._

---

## Bekannte Einschränkungen & Offene Punkte

- `place_type_confidence: medium` → bei Spedition/Logistik sind Place Types unzuverlässig, Keyword-Scoring entscheidend
- `mixed`-Strategie noch nicht systematisch getestet
- Kleinstadt-Tests ausstehend (Radius < 10 km, keine Geo-Dichte-Kompensation)
- Fallback-Profile (`fallback_*`) sind bewusst generisch — kein Qualitätstest vorgesehen

---

## Changelog

| Datum | Änderung |
|---|---|
| 2026-05-17 | Matrix angelegt, Gebäudereinigung/Köln als erster Test dokumentiert (verdict: GOOD) |
| 2026-05-17 | v6 Weighted Scoring live — scoringSignalWeights aus DB geladen |