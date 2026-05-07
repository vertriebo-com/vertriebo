/**
 * useOrganization – lädt die Organization des aktuell eingeloggten Benutzers.
 * Gibt { org, user, loading, error } zurück.
 * Alle anderen Seiten/Hooks MÜSSEN org.id für Datenbankabfragen nutzen.
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

let _cache = null; // in-memory cache für die Session

export function useOrganization() {
  const [org, setOrg] = useState(_cache?.org || null);
  const [user, setUser] = useState(_cache?.user || null);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cache) return; // already loaded
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!u) { setError("not_authenticated"); setLoading(false); return; }
        const orgs = await base44.entities.Organization.filter({ owner_email: u.email });
        // Fallback: auch als Member suchen
        let organization = orgs?.[0] || null;
        if (!organization) {
          const memberships = await base44.entities.OrganizationMember.filter({ user_email: u.email, status: "active" });
          if (memberships?.[0]?.organization_id) {
            const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
            organization = memberOrgs?.[0] || null;
          }
        }
        _cache = { org: organization, user: u };
        setOrg(organization);
        setUser(u);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { org, user, loading, error };
}

// Muss aufgerufen werden wenn der User sich ausloggt oder die Org ändert
export function clearOrgCache() {
  _cache = null;
}