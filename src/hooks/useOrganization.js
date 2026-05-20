/**
 * useOrganization – Multi-Tenant-fähiger Org-Context-Hook.
 *
 * PRIORITÄT der aktiven Organisation:
 * 1. URL Query-Param: ?org_id=<organization_id>  (temporär, für E2E-Tests / Admin-Switches)
 * 2. localStorage: active_organization_id         (persistent über Seiten hinweg)
 * 3. Default-Org: erste Org als Owner
 * 4. Fallback: erste Membership-Org
 *
 * Sicherheit: org_id aus URL/localStorage wird gegen die tatsächlichen
 * Memberships/Ownership des Users geprüft. Ungültige IDs werden ignoriert.
 *
 * PlatformAdmins dürfen jede Org laden (kein Membership-Check).
 */
import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const STORAGE_KEY = "active_organization_id";
const PLATFORM_ADMIN_ROLES = ["admin", "platform_owner", "platform_admin", "support_agent", "readonly_support"];

// Liest die aktive Org-ID aus URL oder localStorage
function getRequestedOrgId() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("org_id");
  if (fromUrl) return { id: fromUrl, source: "url" };
  const fromStorage = localStorage.getItem(STORAGE_KEY);
  if (fromStorage) return { id: fromStorage, source: "storage" };
  return null;
}

// Speichert die aktive Org-ID in localStorage (und räumt URL-Param auf)
function persistActiveOrgId(orgId) {
  if (orgId) {
    localStorage.setItem(STORAGE_KEY, orgId);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function useOrganization() {
  const [org, setOrg] = useState(null);
  const [user, setUser] = useState(null);
  const [allOrgs, setAllOrgs] = useState([]); // alle zugänglichen Orgs (für Switcher)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeOrgId, setActiveOrgIdState] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        if (!u) { setError("not_authenticated"); setLoading(false); return; }
        setUser(u);

        const isPlatformAdmin = PLATFORM_ADMIN_ROLES.includes(u.role);

        // ── Alle zugänglichen Orgs laden ─────────────────────────────────────
        let ownedOrgs = [];
        let memberOrgs = [];

        ownedOrgs = await base44.entities.Organization.filter({ owner_email: u.email });

        const memberships = await base44.entities.OrganizationMember.filter({
          user_email: u.email,
          status: "active",
        });
        if (memberships.length > 0) {
          const memberOrgIds = [...new Set(memberships.map(m => m.organization_id))];
          // Lade Member-Orgs die nicht schon in ownedOrgs sind
          const ownedIds = new Set(ownedOrgs.map(o => o.id));
          for (const orgId of memberOrgIds) {
            if (ownedIds.has(orgId)) continue;
            const orgs = await base44.entities.Organization.filter({ id: orgId });
            if (orgs[0]) memberOrgs.push(orgs[0]);
          }
        }

        const accessible = [...ownedOrgs, ...memberOrgs];
        setAllOrgs(accessible);

        // ── Aktive Org bestimmen ──────────────────────────────────────────────
        const requested = getRequestedOrgId();
        let chosenOrg = null;

        if (requested) {
          // Validierung: Darf der User diese Org sehen?
          if (isPlatformAdmin) {
            // PlatformAdmin darf jede Org laden
            const adminOrgs = await base44.entities.Organization.filter({ id: requested.id });
            chosenOrg = adminOrgs[0] || null;
          } else {
            // Normaler User: nur zugängliche Orgs
            chosenOrg = accessible.find(o => o.id === requested.id) || null;
          }

          if (chosenOrg) {
            // Gültige angefragte Org → in localStorage persistieren
            persistActiveOrgId(chosenOrg.id);
            setActiveOrgIdState(chosenOrg.id);

            // URL-Param entfernen (damit Bookmarks/Shares sauber bleiben)
            if (requested.source === "url") {
              const url = new URL(window.location.href);
              url.searchParams.delete("org_id");
              window.history.replaceState({}, "", url.toString());
            }
          } else {
            // Ungültige ID → ignorieren, auf Default zurückfallen
            console.warn(`[useOrganization] Requested org_id="${requested.id}" not accessible — falling back to default`);
            persistActiveOrgId(null);
          }
        }

        // Fallback: Default-Org (erste owned Org, dann erste Member-Org)
        if (!chosenOrg) {
          chosenOrg = ownedOrgs[0] || memberOrgs[0] || null;
          if (chosenOrg) {
            persistActiveOrgId(chosenOrg.id);
            setActiveOrgIdState(chosenOrg.id);
          }
        }

        setOrg(chosenOrg);
      } catch (e) {
        console.error("[useOrganization] error:", e);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Expliziter Org-Switcher: wechselt die aktive Org (für Admin-UIs / E2E-Tests)
  const setActiveOrgId = useCallback((newOrgId) => {
    persistActiveOrgId(newOrgId);
    // Seite neu laden damit alle Hooks den neuen Kontext aufnehmen
    window.location.href = newOrgId
      ? `${window.location.pathname}?org_id=${newOrgId}`
      : window.location.pathname;
  }, []);

  return { org, user, loading, error, allOrgs, activeOrgId, setActiveOrgId };
}

// Muss aufgerufen werden beim Logout oder wenn Org-Context zurückgesetzt werden soll
export function clearOrgCache() {
  persistActiveOrgId(null);
}