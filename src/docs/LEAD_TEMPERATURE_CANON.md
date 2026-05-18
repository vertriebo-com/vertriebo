# Kanonische Lead-Temperatur Logik

## Überblick

Dieses Dokument definiert die verbindliche Logik zur Bestimmung der Lead-Temperatur (`hot`, `warm`, `cold`, `unknown`) im Vertriebo-System.

## Quelle der Wahrheit

**Primäres Feld:** `Company.lead_temperature` (enum: `'hot'` | `'warm'` | `'cold'` | `'unknown'`)

Dieses Feld ist die **einzige Quelle der Wahrheit** für alle Temperatur-abhängigen Features im System.

## Kanonische Auswertungslogik

Die Temperatur wird wie folgt bestimmt (in Prioritätsreihenfolge):

1. **Primär:** `company.lead_temperature` wenn gesetzt und nicht `'unknown'`
2. **Fallback 1:** `priority_score >= 60` → `'hot'`, `>= 30` → `'warm'`
3. **Fallback 2 (Legacy):** `is_hot === true` → `'hot'`
4. **Default:** `'unknown'`

## Zentrale Utility

Alle Komponenten MÜSSEN die Utility-Funktionen aus `utils/leadTemperature.js` verwenden:

```javascript
import { 
  getLeadTemperature,   // Returns: 'hot' | 'warm' | 'cold' | 'unknown'
  isHotLead,           // Returns: boolean
  isWarmLead,          // Returns: boolean
  isColdLead,          // Returns: boolean
  getTemperatureScore  // Returns: number (0-100)
} from "@/utils/leadTemperature";
```

### Implementierung

```javascript
export function getLeadTemperature(company) {
  if (!company) return 'unknown';
  
  // 1. Primär: lead_temperature Feld
  const temp = company.lead_temperature;
  if (temp && ['hot', 'warm', 'cold'].includes(temp)) {
    return temp;
  }
  
  // 2. Fallback: priority_score
  const score = company.priority_score || company.lead_temperature_score || 0;
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  
  // 3. Letztes Fallback: is_hot (Legacy)
  if (company.is_hot === true) return 'hot';
  
  return 'unknown';
}
```

## Verwendung in Komponenten

### Dashboard (`pages/Dashboard.jsx`)
- `hotLeads` Zählung verwendet `isHotLead(company)`
- Backend `getDashboardData` verwendet dieselbe Logik

### Leads Page (`pages/Leads.jsx`)
- Filter `focusFilter === "hot_leads"` verwendet `isHotLead(c)`
- Sortierung nach Priorität verwendet `isHotLead(a)` vs `isHotLead(b)`

### LeadDetail (`pages/LeadDetail.jsx`)
- Temperatur-Badge verwendet `isHotLead(company)` und `isWarmLead(company)`
- Hero-Header Farbcodierung verwendet `isHotLead(company)`

### LeadRow (`components/leads/LeadRow.jsx`)
- Icon-Färbung (Flame vs Building) verwendet `isHotLead(company)`
- Temperatur-Badge verwendet `isHotLead()` und `isWarmLead()`

### PrimaryActionCard (`components/leads/PrimaryActionCard.jsx`)
- Card-Highlighting verwendet `isHotLead(company)`
- Score-Anzeige verwendet `getTemperatureScore(company)`

### DailyActionList (`components/dashboard/DailyActionList.jsx`)
- Empfängt `actionableLeads` vom Backend (bereits gefiltert mit kanonischer Logik)

### CompactStats (`components/leads/CompactStats.jsx`)
- "Vielversprechend" KPI verwendet `isHotLead(company)`

### EngineBox (`components/lead-detail/EngineBox.jsx`)
- Temperatur-Anzeige verwendet `getLeadTemperature(company)`

## Backend (`functions/getDashboardData.js`)

Das Backend verwendet dieselbe Logik für konsistente Daten:

```javascript
// Hot Leads Filter
const hotLeads = companies.filter(c => {
  const temp = c.lead_temperature;
  if (temp && ['hot', 'warm', 'cold'].includes(temp)) return temp === 'hot';
  const score = c.priority_score || c.lead_temperature_score || 0;
  if (score >= 60) return true;
  return c.is_hot === true; // Legacy-Fallback
});
```

## Legacy-Felder

### `is_hot` (boolean)
- **Status:** Legacy, nur noch als Fallback
- **Verwendung:** Nicht mehr als primäre Quelle verwenden
- **Zukunft:** Kann entfernt werden wenn alle Daten `lead_temperature` gesetzt haben

### `priority_score` (number)
- **Status:** Sekundär, nur als Fallback wenn `lead_temperature` unknown
- **Verwendung:** Weiterhin anzeigen in UI, aber nicht als einzige Quelle

### `lead_temperature_score` (number)
- **Status:** Primärer Score-Wert
- **Verwendung:** Bevorzugt über `priority_score` wenn vorhanden

## Datenpersistenz

Beim Aktualisieren eines Leads (z.B. in `LeadDetail.jsx`):

1. **Immer** `Company.update()` verwenden, nicht nur UI-State
2. **Immer** `lead_temperature` Feld setzen (nicht nur `is_hot`)
3. **Optional** `priority_score` konsistent halten (nicht widersprüchlich)
4. **Nach Update:** `queryClient.invalidateQueries()` für betroffene Pages

Beispiel:
```javascript
await base44.entities.Company.update(companyId, {
  lead_temperature: 'hot',
  lead_temperature_score: 85,
  // is_hot kann gesetzt werden als Legacy, ist aber nicht primär
});
```

## Test-Akzeptanzkriterien

- [ ] `canonicalLeadTemperatureHelperCreated` - Utility existiert und ist dokumentiert
- [ ] `dashboardUsesSameHotLeadLogicAsLeadsPage` - Beide verwenden `isHotLead()`
- [ ] `leadDetailHotUpdatePersistsToCompany` - Update schreibt `lead_temperature` Feld
- [ ] `dashboardReflectsLeadTemperatureAfterRefresh` - Refresh zeigt korrekte Hot-Leads
- [ ] `dailyActionListAndPrimaryActionUseSameHelper` - Alle Komponenten nutzen Utility
- [ ] `noDuplicateTemperatureLogic` - Keine inline Logik außerhalb der Utility
- [ ] `isHotLegacyDocumented` - Legacy-Status von `is_hot` dokumentiert
- [ ] `noBackendRegression` - Backend verwendet dieselbe Logik
- [ ] `noDummyData` - Alle Daten sind real und persistiert

## Live-Test-Prozedur

1. Lead in `LeadDetail` auf "hot" setzen (via Engine oder manuell)
2. Zur Leads Page navigieren → Lead muss als "heiß" markiert sein
3. Dashboard öffnen/refreshen → "Heiße Leads" Zähler muss Lead enthalten
4. Lead zurück auf "warm"/"cold" setzen
5. Dashboard erneut refreshen → Zähler muss aktualisiert sein
6. Console auf Fehler prüfen

## Änderungsmanagement

Änderungen an dieser Logik erfordern:
- Update dieses Dokuments
- Update aller betroffenen Komponenten
- Test der Live-Prozedur
- Review durch mindestens 1 Team-Mitglied

---

**Letzte Aktualisierung:** 2026-05-18  
**Version:** 1.0  
**Status:** Active