import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useLeadsFilter() {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const u = await base44.auth.me();
        setUser(u);

        // Eigene Organisation laden
        let organization = null;
        const orgs = await base44.entities.Organization.filter({ owner_email: u.email });
        organization = orgs?.[0] || null;
        if (!organization) {
          const memberships = await base44.entities.OrganizationMember.filter({ user_email: u.email, status: "active" });
          if (memberships?.[0]?.organization_id) {
            const memberOrgs = await base44.entities.Organization.filter({ id: memberships[0].organization_id });
            organization = memberOrgs?.[0] || null;
          }
        }
        setOrg(organization);

        // Blacklist nur für diese Organisation laden
        if (organization) {
          const bl = await base44.entities.Blacklist.filter({ organization_id: organization.id }, "-created_date", 500);
          setBlacklist(bl);
        }
      } catch (e) {
        console.error("useLeadsFilter error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  return { user, org, filterCompanies, blacklist, loading };
}