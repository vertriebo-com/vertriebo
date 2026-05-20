/**
 * useLeadsFilter – nutzt useOrganization für den Org-Kontext.
 * Kein duplikater Org-Load-Code mehr.
 */
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useOrganization } from "./useOrganization";

export function useLeadsFilter() {
  const { org, user: orgUser, loading: orgLoading, error: orgError, allOrgs, setActiveOrgId } = useOrganization();
  const [user, setUser] = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [blacklistLoading, setBlacklistLoading] = useState(true);

  // User mit org_role anreichern sobald Org geladen
  useEffect(() => {
    if (!orgUser || !org) {
      setUser(orgUser);
      return;
    }
    let enriched = { ...orgUser };
    if (org.owner_email === orgUser.email) {
      enriched.org_role = "organization_admin";
    }
    setUser(enriched);

    // Membership-Rolle laden (für Sales-Reps)
    if (!["admin", "platform_owner", "platform_admin"].includes(orgUser.role)) {
      base44.entities.OrganizationMember.filter({ user_email: orgUser.email, organization_id: org.id })
        .then(memberships => {
          const member = memberships?.[0];
          if (member) {
            setUser(prev => prev ? { ...prev, org_role: member.role } : prev);
          }
        })
        .catch(() => {});
    }
  }, [orgUser?.email, org?.id]);

  // Blacklist für aktive Org laden
  useEffect(() => {
    if (!org?.id) {
      setBlacklistLoading(false);
      return;
    }
    setBlacklistLoading(true);
    base44.entities.Blacklist.filter({ organization_id: org.id }, "-created_date", 500)
      .then(bl => setBlacklist(bl))
      .catch(() => setBlacklist([]))
      .finally(() => setBlacklistLoading(false));
  }, [org?.id]);

  const normalize = (name = "") =>
    name.toLowerCase().trim()
      .replace(/\s*(gmbh|co\.|kg|ag|&|und|gbr|e\.k\.|e\.v\.|ohg|inc\.?)\s*/gi, " ")
      .replace(/\s+/g, " ").trim();

  const blacklistNames = blacklist.map(b => normalize(b.firmenname));

  const filterCompanies = (companies) =>
    companies.filter(c => {
      if (c.is_blacklisted) return false;
      const cn = normalize(c.name);
      if (blacklistNames.some(bn => cn.includes(bn) || bn.includes(cn))) return false;
      return true;
    });

  return {
    user,
    org,
    filterCompanies,
    blacklist,
    loading: orgLoading || blacklistLoading,
    error: orgError,
    allOrgs,
    setActiveOrgId,
  };
}