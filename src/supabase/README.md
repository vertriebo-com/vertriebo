# Supabase — Vertriebo Hybrid-Architektur

> Dieses Verzeichnis enthält ausschließlich Supabase-spezifische Ressourcen.
> Es ist **KEIN Base44-App-Code** und darf nicht mit dem Base44-Repo-Kontext verwechselt werden.

## Struktur

```
src/supabase/
├── config.toml                  # Supabase CLI Konfiguration (lokale Entwicklung)
├── migrations/                  # Datenbankmigrationen (chronologisch nummeriert)
│   ├── 20260520000001_create_lead_usage_events.sql
│   ├── 20260520000002_create_shadow_mode_log.sql
│   ├── 20260520000003_create_quota_reservations.sql
│   ├── 20260520000004_create_rpc_functions.sql
│   ├── 20260520000005_create_research_run_locks.sql
│   ├── 20260520000006_create_research_run_audit.sql
│   └── 20260520000007_create_lock_rpc_functions.sql
└── README.md                    # Diese Datei
```

## Tabellen

### `lead_usage_events`
Atomares Tracking jedes Research-Leads.

| Feld | Typ | Beschreibung |
|---|---|---|
| `organization_id` | TEXT | Base44 Organization.id |
| `period_month` | TEXT | YYYY-MM (Europe/Berlin Kalendermonat) |
| `company_id` | TEXT | Base44 Company.id |
| `research_run_id` | TEXT | Base44 ResearchRun.id (nullable) |
| `event_type` | TEXT | `research_lead_created` |
| `source` | TEXT | `research` oder `openregister` |

**UNIQUE-Constraint:** `(organization_id, period_month, company_id, event_type)` — verhindert Duplikate.

### `shadow_mode_log`
Täglicher Audit-Trail für Supabase vs. Base44 Vergleiche.

| Feld | Typ | Beschreibung |
|---|---|---|
| `organization_id` | TEXT | Geprüfte Organisation |
| `period_month` | TEXT | YYYY-MM |
| `supabase_count` | INT | COUNT aus `lead_usage_events` |
| `base44_count` | INT | `UsageLog.leads_created` aus Base44 |
| `diff` | INT | `supabase_count - base44_count` |
| `checked_at` | TIMESTAMPTZ | Zeitpunkt der Prüfung |

### `quota_reservations`
Atomare Quota-Verwaltung mit Unique Index (Phase 3).

### `research_run_locks`
Worker-Locks pro Organisation (verhindert parallele Verarbeitung).

### `research_run_audit`
Unveränderlicher Audit-Trail für ResearchRun-Ereignisse.

## Shadow Mode Status

**Stand: 2026-05-20 — Phase 0 ABGESCHLOSSEN**

- ✅ 7 Migrationen definiert und in `src/supabase/migrations/` gespeichert
- ✅ Abhängigkeitsreihenfolge validiert (Lock-RPCs in 07 nach Tabelle 05)
- ⏳ Migrationen noch nicht in Supabase-Projekt deployed
- ⏳ Supabase schreibt noch parallel zu Base44 (Phase 1)
- Base44 max()-Formel bleibt primäre Wahrheit bis Validierung

Details: `docs/SUPABASE_SHADOW_MODE_STATUS.md` (im Base44-App-Kontext)

## Migrationen anwenden (Supabase CLI)

**Wichtig:** Das `migrations_dir` muss auf `src/supabase/migrations` zeigen.

```bash
# Lokal (mit korrektem Migrations-Pfad)
supabase db push --schema-path src/supabase/migrations

# Gegen Remote-Projekt
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" --schema-path src/supabase/migrations
```

### GitHub Integration

Konfigurieren Sie die Supabase GitHub Integration mit:
- **Migrations Path:** `src/supabase/migrations`
- **Branch:** `main` (oder relevant branch)

Damit werden Migrationen automatisch deployed, wenn sie ins Repo gepusht werden.

## Wichtige Regeln

- ❌ Keine Secrets in diesem Verzeichnis speichern
- ❌ Kein Base44-App-Code hier ablegen
- ❌ Nicht `src/supabase/` mit Base44-App-Code vermischen
- ✅ Migrationen immer chronologisch nummerieren: `YYYYMMDDHHMMSS_beschreibung.sql`
- ✅ Jede Migration ist idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)
- ✅ SQL vor Deploy im Supabase SQL Editor oder lokal testen
- ✅ Abhängigkeiten prüfen: Migration 07 (Lock-RPCs) muss NACH Migration 05 (Tabelle) laufen