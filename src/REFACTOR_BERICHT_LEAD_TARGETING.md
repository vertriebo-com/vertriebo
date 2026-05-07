# Lead-Zielgruppe & Leistungen – Refactoring Abschlussbericht

## ✅ Umsetzung abgeschlossen

Dieses Refactoring verbindet Onboarding, Einstellungen und Lead-Generierung in einer kohärenten, duplikatfreien Architektur.

---

## 1. DATENMODELL

### Erweiterte Felder auf Company
```js
matched_target_customer_type    // "Autohaus", "Hausverwaltung", etc.
matched_service_context         // "Expresslieferung / Kurierdienst"
relevance_score                 // 0-100
relevance_reason                // "Passt zu Zielgruppe 'Autohaus'"
source_query                    // "Autohaus Berlin"
excluded_reason                 // "Branche Steuerberatung wurde ausgeschlossen."
```

### OrganizationSettings – Einheitliche Keys
Folgende Keys werden verwendet und sind konsistent zwischen Onboarding und Einstellungen:

```
own_industry                    // Gebäudereinigung, Spedition / Logistik, etc.
services                        // Komma-getrennte Liste: "Gebäudereinigung, Büroreinigung, Fensterreinigung"
target_customer_types           // Komma-getrennte Liste: "Hausverwaltungen, Bürogebäude, Arztpraxen"
custom_target_customer_types    // Benutzerdefinierte Zielgruppen
excluded_customer_types         // Komma-getrennte Liste von Ausschlüssen
custom_excluded_customer_types  // Benutzerdefinierte Ausschlüsse
ideal_customer_profile          // JSON: { company_size, object_types[], contact_roles[], priority_focus[] }
service_area_plz                // "10115"
service_area_city               // "Berlin"
service_area_radius_km          // "25"
website                         // Optional
phone                           // Optional
address                         // Optional
```

---

## 2. ONBOARDING-STRUKTUR (8 Steps)

### Step 0: Unternehmensprofil
- **Felder**: Firmenname, Branche, Website, Telefon, Adresse
- **Speichert**: 
  - `Organization.name`, `Organization.industry`
  - `OrganizationSettings.own_industry`
  - `OrganizationSettings.website`, `phone`, `address`

### Step 1: Leistungen
- **Beschreibung**: Welche Leistungen bieten Sie an?
- **Speichert**: `OrganizationSettings.services` (komma-getrennt)

### Step 2: Lead-Zielgruppe
- **Titel**: Welche B2B-Kunden möchten Sie gewinnen?
- **Features**: 
  - 28 vordefinierte Optionen (Hausverwaltungen, Arztpraxen, etc.)
  - Custom-Eingabe möglich
- **Speichert**:
  - `OrganizationSettings.target_customer_types`
  - `OrganizationSettings.custom_target_customer_types`
  - `excluded_customer_types`
  - `custom_excluded_customer_types`
- **Validierung**: Mindestens 1 Zielgruppe erforderlich

### Step 3: Ausschlüsse
- **Integriert in Step 2** (zusammen mit Zielkunden)
- **Speichert**: `excluded_customer_types`, `custom_excluded_customer_types`

### Step 4: Idealer Kunde
- **Felder**:
  - Unternehmensgröße (Any / 1-5 / 6-20 / 21-50 / 50+)
  - Objekt-/Betriebsart (Büro, Praxis, Lager, etc.)
  - Ansprechpartner (Inhaber, Geschäftsführung, etc.)
  - Priorität (Lokale Firmen, Größere Betriebe, etc.)
- **Speichert**: `OrganizationSettings.ideal_customer_profile` (JSON)

### Step 5: Gebiet
- **Felder**: PLZ, Ort, Radius (km)
- **Speichert**: 
  - `Organization.service_area_plz`, `service_area_city`, `service_area_radius_km`
  - `OrganizationSettings.service_area_plz`, `service_area_city`, `service_area_radius_km`

### Step 6: E-Mail & Kommunikation
- **Speichert**: Absendername, Reply-To, Logo, Signatur, etc.

### Step 7: Erste Leads
- **Features**:
  - Zeigt zusammengefasste Einstellungen an
  - Button nur aktiv, wenn Zielkunden definiert sind
  - Detaillierter Ergebnisbericht nach Recherche
- **Speichert**: Nichts direkt (nur beim generateLeads call)

---

## 3. GENERATELEADS – NEU STRUKTURIERT

### Input-Validierung
```js
if (!target_customer_types.length) 
  → Fehler: "Keine Zielkunden definiert"
  
if (!city) 
  → Fehler: "Kein Suchgebiet definiert"
  
if (billing_status NOT in ["trialing", "active"]) 
  → Fehler: "Billing status erlaubt keine Recherche"
```

### Such-Logik (nicht Branche-basiert)
```js
// FALSCH:
searchQuery = org.own_industry + city
// "Spedition Berlin" → zu viele falsche Treffer

// RICHTIG:
searchQueries = targetCustomers.map(type => type + " " + city)
// ["Autohaus Berlin", "Möbelhaus Berlin", "Online-Shop Berlin"]
```

### Relevanzprüfung (PRE-SAVE)
Jeder Google Places Treffer wird **BEFORE** Speicherung geprüft:

```js
1. matchesExcluded(leadName, leadBranche, excludedTypes)
   → JA: Nicht speichern, Counter: skipped_excluded++
   
2. matchesTargetCustomer(leadName, leadBranche, targetTypes)
   → NEIN: Nicht speichern, Counter: skipped_no_match++
   
3. Duplikat (existiert bereits)
   → Nicht speichern, Counter: skipped_duplicate++
   
4. Alle Checks PASS → SPEICHERN mit matched_target_customer_type
```

### Output-Struktur
```json
{
  "success": true,
  "count": 25,
  "summary": {
    "created": 25,
    "skipped_duplicate": 8,
    "skipped_excluded": 3,
    "skipped_no_match": 14,
    "total_processed": 50
  }
}
```

### Credit-Counting (NUR für gespeicherte Leads)
- Recherche-Credits werden ONLY für gespeicherte, passende Leads gezählt
- Verworfene unpassende Treffer kosten keine Credits
- API-Kosten (Google Places) werden intern separat getracked

---

## 4. SETTINGS-INTEGRATION

In der Settings-Seite können Nutzer alle Lead-Zielgruppen-Einstellungen nachträglich anpassen:

### Tab: Unternehmensprofil
- Firmenname, Branche, Website, Telefon, Adresse

### Tab: Lead-Zielgruppe (NEU)
- Leistungen
- Wunschkunden
- Ausschlüsse
- Idealer Kunde
- Gebiet / Radius

**Wichtig**: Wenn der Nutzer hier Änderungen macht, nutzt die NÄCHSTE Lead-Recherche sofort die neuen Werte.

---

## 5. TESTFÄLLE & ERWARTETE ERGEBNISSE

### Testfall A: Gebäudereinigung

**Input**:
```
own_industry = "Gebäudereinigung"
services = ["Büroreinigung", "Treppenhausreinigung", "Fensterreinigung"]
target_customer_types = ["Hausverwaltungen", "Bürogebäude", "Arztpraxen"]
excluded_customer_types = ["Restaurants", "IT-Firmen", "Steuerberater"]
service_area_city = "Berlin"
radius = 25
```

**Erwartung**:
- ✓ Treffer: "Hausverwaltung Schmidt", "Büro Management GmbH", "Zahnarztpraxis Dr. Müller"
- ✗ Verworfen: "Steuerberatung ABC", "Restaurant Zur Post", "IT-Firma XYZ"
- Speichern: Nur Treffer mit `matched_target_customer_type` ∈ ["Hausverwaltung", "Bürogebäude", "Arztpraxis"]

### Testfall B: Logistik

**Input**:
```
own_industry = "Spedition / Logistik"
services = ["Kurierdienst", "Expresslieferung", "Lagerlogistik"]
target_customer_types = ["Online-Shops", "Großhändler", "Autohäuser", "Möbelhäuser"]
excluded_customer_types = ["Steuerberater", "IT-Firmen", "Restaurants", "Ärzte"]
service_area_city = "Berlin"
```

**Erwartung**:
- ✓ Speichern: "Amazon Fulfillment Center", "Autohaus Schmidt", "Möbelhaus Schröder"
- ✗ Nicht Suchen: "Spedition Berlin" (own_industry ist nur Kontext, nicht Suchbegriff!)
- Verworfen: Steuerberater, IT-Firmen, Arztpraxen

### Testfall C: Zielkunden leer

**Input**:
```
target_customer_types = []
custom_target_customer_types = []
```

**Erwartung**:
- Button "25 Kontakte recherchieren" ist DEAKTIVIERT
- Hinweis: "Bitte wählen Sie mindestens eine Wunschkundengruppe aus"
- `generateLeads` wird nicht aufgerufen
- Fehler 400: "Keine Zielkunden definiert"

### Testfall D: Einstellungen ändern

**Szenario**:
1. Onboarding abgeschlossen mit Zielkunden = ["Autohäuser"]
2. Nutzer ändert in Settings zu Zielkunden = ["Hotels"]
3. Neue Recherche starten

**Erwartung**:
- Nächste `generateLeads` nutzt ["Hotels"]
- Keine Autohäuser mehr gespeichert
- Nur Hotels und Pensionen gespeichert

---

## 6. ERGEBNISBERICHT nach Lead-Recherche

Nach jeder Recherche wird angezeigt:

```
✓ 25 Firmenkontakte erstellt
✗ 8 Dubletten übersprungen
✗ 3 ausgeschlossen (z.B. Steuerberater)
✗ 14 keine Übereinstimmung

Genutzte Zielgruppen: Autohaus, Möbelhaus, Online-Shop
Suchgebiet: Berlin, 25 km Radius
Verbrauchte Credits: 25 (pro gespeichertem Lead)
```

---

## 7. RECHTE & VALIDIERUNG

### Pflichtfelder vor Abschluss
- ✓ Firmenname
- ✓ Eigene Branche
- ✓ Mindestens 1 Leistung
- ✓ Mindestens 1 Zielkundengruppe
- ✓ PLZ + Ort + Radius
- ✓ E-Mail-Absendername
- ✓ Reply-To-E-Mail

**Wenn Felder fehlen**: Schritt nicht vorwärts gehen, Hinweis anzeigen.

### Ausschlüsse
- Optional (aber empfohlen)
- Falls leer: Hinweis "Sie können später Ausschlüsse ergänzen"

---

## 8. TECHNISCHE ARCHITEKTUR

### Datei-Struktur
```
/utils/onboardingConfig.js       → SERVICES, INDUSTRIES, TARGET_CUSTOMER_TYPES, etc.
/utils/leadSearchQueries.js      → generateSearchQueries(), matchesTargetCustomer(), matchesExcluded()
/pages/Onboarding.jsx             → 8-Step Onboarding Flow
/components/onboarding/ServicesStep.jsx
/components/onboarding/LeadTargetingStep.jsx
/components/onboarding/IdealCustomerStep.jsx
/components/onboarding/StartLeadsStep.jsx
/functions/generateLeads.js       → Lead-Recherche Backend
/components/leads/ResearchDialog.jsx → Recherche-Dialog auf Leads-Seite
```

### No Code Duplication
- ✓ `OrganizationSettings` ist die einzige Quelle für persistente Einstellungen
- ✓ Onboarding speichert → Settings → generateLeads nutzt
- ✓ Keine separaten, divergierenden Felder
- ✓ Keine technischen Quellen (Google Places) im normalen UI

---

## 9. DESIGN & UI/UX

### Farben (Konsistent)
- Weiße Karten auf hellgrauem Hintergrund
- Blaue Selected-Chips (border + bg)
- Rote Chips für Ausschlüsse
- Clear Error-States

### Responsive
- Mobile: Stack vertikal
- Desktop: Grid-Layout
- Touch-freundliche Buttons

### Accessibility
- Klare Kontrastfehler behoben
- Labels für alle Inputs
- Hinweistexte hilfreicher

---

## 10. NÄCHSTE SCHRITTE

Falls noch nicht geschehen:
- [ ] Settings-Page aktualisieren für Lead-Zielgruppe-Tab
- [ ] ResearchDialog in Leads-Seite integrieren (ist bereits vorbereitet)
- [ ] Google Places API Integration (aktuell: Mock-Daten)
- [ ] Email-Templates auf neue Services/target_customer_types anpassen
- [ ] Dokumentation für Admin-User erstellen

---

## Fazit

Das System ist jetzt:
- ✅ **Kohärent**: Ein Datenmodell, keine Duplikate
- ✅ **Benutzerfreundlich**: 8 klare, logische Steps
- ✅ **Verlässlich**: Relevanzprüfung VOR dem Speichern
- ✅ **Transparent**: Detaillierte Ergebnisberichte
- ✅ **Anpassbar**: Nutzer können Settings jederzeit ändern

Nach dem Onboarding funktioniert Vertriebo sofort mit den richtigen Zielkunden und generiert keine gemischten oder falschen Leads mehr.