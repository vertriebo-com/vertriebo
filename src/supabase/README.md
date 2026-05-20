# Supabase — Vertriebo Hybrid-Architektur

> Dieses Verzeichnis enthält ausschließlich Supabase-spezifische Ressourcen.
> Es ist **KEIN Base44-App-Code** und darf nicht mit dem Base44-Repo-Kontext verwechselt werden.

## Struktur

```
supabase/
├── config.toml                  # Supabase CLI Konfiguration (lokale Entwicklung)
├── migrations/                  # Datenbankmigrationen (chronologisch nummeriert)
│   ├── 20260520000001_create_lead_usage_events.sql
│   └── 20260520000002_create_shadow_mode_log.sql
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

## Shadow Mode Status

**Stand: 2026-05-20 — Phase 1 aktiv**

- Supabase schreibt parallel zu Base44 (non-blocking)
- Base44 max()-Formel bleibt primäre Wahrheit
- Supabase wird erst zur SSOT nach: GitHub-Review + 14-Tage-Validierung + Test-Run

Details: `docs/SUPABASE_SHADOW_MODE_STATUS.md` (im Base44-App-Kontext)

## Migrationen anwenden (Supabase CLI)

```bash
# Lokal
supabase db push

# Gegen Remote-Projekt
supabase db push --db-url "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"
```

## Wichtige Regeln

- ❌ Keine Secrets in diesem Verzeichnis speichern
- ❌ Kein Base44-App-Code hier ablegen
- ❌ Nicht `supabase/` mit Base44-GitHub-Sync verwechseln
- ✅ Migrationen immer chronologisch nummerieren: `YYYYMMDDHHMMSS_beschreibung.sql`
- ✅ Jede Migration ist idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`)