# Vertriebo Merkliste – Architektur & Entscheidungen

_Zuletzt aktualisiert: 2026-05-16_

---

## OpenRegister Pipeline – Phase A–D (abgeschlossen)

### Phase A – syncOpenRegister
- **Function:** `syncOpenRegister`
- **Ziel:** OpenRegister API → ExternalCompanySource (kein Company-Eintrag)
- **Status:** ✅ Produktiv

### Phase B – ExternalCompanySource Entity
- Enthält: company_name, legal_form, city, address, postal_code, register_number, source_id, raw_data
- Pflichtfelder: organization_id, source, company_name
- **Status:** ✅ Produktiv

### Phase C – matchExternalSourceWithGooglePlaces
- **Function:** `matchExternalSourceWithGooglePlaces`
- **Ziel:** Google Places Text Search → Confidence-Score, Geo, Radius, Phone, Website
- Confidence >= 50 + inside_radius → `enriched` / `ready_for_review`
- Confidence >= 50 + outside_radius → `enriched` / `outside_radius`
- Low Confidence → `needs_review` / `needs_review`
- No result / API error → `failed`
- Google Match (phone, website, address, place_id) wird in `raw_data._google_match` gespeichert
- **Status:** ✅ Produktiv

### Phase D – promoteExternalSourceToCompany
- **Function:** `promoteExternalSourceToCompany`
- **Request:** `{ organization_id, external_source_id, force_promote, assign_to, initial_status }`
- **Status-Gate:**
  - `ready_for_review` → Standard-Promotion erlaubt
  - `needs_review` → nur mit `force_promote: true` (Admin/Owner)
  - `outside_radius` → NICHT promotebar (MVP: manuelles Override nicht unterstützt)
  - `failed`, `duplicate`, `promoted_to_company`, `rejected` → NIEMALS promotebar
- **Sales Rep:** darf NICHT promoten
- **Dedupe:** Name+Ort, Website, Telefon gegen Company
- **Blacklist-Check:** Name, Telefon, Website-Domain
- **Monatslimit:** zählt als Firmenkontakt → UsageLog.leads_created += 1
- **Kein Engine-Auto:** keine automatische analyzeLeadEngine nach Promotion
- **ExternalCompanySource nach Erfolg:** match_status=promoted_to_company, promoted_company_id, promoted_at, promoted_by
- **Status:** ✅ Produktiv

### Phase E – Import-Kandidaten UI (neu)
- **Route:** `/import-kandidaten`
- **Seite:** `pages/ExternalSourcesPage.jsx`
- **Komponente:** `components/external-sources/ExternalSourceCard.jsx`
- **Zugang:** Nur Admin/Owner (Sales Rep wird auf /leads umgeleitet)
- **Einstieg:** Leadseite → "Import-Kandidaten"-Button (oben rechts, neben "Firmen recherchieren")
- **Tabs:** Alle / Bereit / Prüfung / Ausstehend / Übernommen / Außer Radius / Abgelehnt / Fehlgeschlagen
- **Aktionen:**
  - "Nächste 10 mit Google abgleichen" → `matchExternalSourceWithGooglePlaces`
  - "Als Lead übernehmen" (ready_for_review) → `promoteExternalSourceToCompany`
  - "Trotz niedriger Sicherheit übernehmen" (needs_review, mit Warnung) → `force_promote: true`
  - "Ablehnen" → `ExternalCompanySource.update({ match_status: 'rejected' })`
- **Nach Promotion:** Link zur neuen Company/LeadDetail sichtbar
- **Status:** ✅ Produktiv

---

## Wichtige Architektur-Entscheidungen

### Kandidaten vs. Leads
- `ExternalCompanySource` = Kandidat, KEIN Lead
- Erst nach Promotion über `promoteExternalSourceToCompany` wird ein Company/Lead erstellt
- Dashboard-Zahlen zählen nur Companies, KEINE ExternalCompanySources
- UsageLog.leads_created wird nur bei erfolgreicher Promotion erhöht

### Keine Automatiken
- Kein automatischer Google-Abgleich im Hintergrund
- Keine automatische Massenpromotion
- Kein Auto-Engine nach Promotion
- Alle Schritte sind manuell/kontrolliert

### Google Match Daten
- `raw_data._google_match` enthält: phone, website, address, place_id
- Diese Felder werden bei Promotion auf Company gemappt
- Datenverlust-Risiko: Falls raw_data leer → leere Felder in Company (kein Fehler, nur fehlende Daten)

### Rollenmodell
- Platform Admin → darf alles
- Organization Owner → darf promoten, force_promote, ablehnen
- Organization Admin → darf promoten, force_promote, ablehnen
- Sales Rep → darf NICHT promoten (403 forbidden)

---

## Bekannte Risiken & Offene Punkte

### ⚠️ outside_radius-Promotion nicht unterstützt
- Einträge mit `match_status=outside_radius` können nicht promoted werden
- Begründung: MVP, kein manuelles Override gebaut
- Zukünftig: Sonderoption mit expliziter Bestätigung

### ⚠️ Bulk-Abgleich immer 10 Einträge
- `matchExternalSourceWithGooglePlaces` matched immer batch=10 pending Einträge
- Keine Einzelkandidaten-Abgleich möglich (MVP)
- Zukünftig: "Diesen Kandidaten neu abgleichen"-Button

### ⚠️ Rejection ohne Grund
- Ablehnen speichert kein rejection_reason (MVP)
- Entity hat rejected_at/rejected_by noch nicht (muss noch ergänzt werden)
- Zukünftig: Ablehnungsgrund-Dialog

### ℹ️ google_place_id nicht in Company-Entity
- Company hat kein google_place_id-Feld
- Wird derzeit nicht gespeichert (kein Datenverlust für CRM-Funktionalität)
- Zukünftig: Company-Entity um google_place_id ergänzen für bessere Dedupe

---

## Noch nicht gebaut (Backlog)

- [ ] Bulk-Promote für mehrere ready_for_review gleichzeitig
- [ ] Einzelnen Kandidaten neu mit Google abgleichen
- [ ] Ablehnungsgrund-Dialog
- [ ] outside_radius manuell override
- [ ] OpenRegister-Suche direkt aus der UI starten (syncOpenRegister-Trigger)
- [ ] Company-Entity: google_place_id-Feld ergänzen
- [ ] ExternalCompanySource: rejected_at, rejected_by, rejection_reason-Felder ergänzen