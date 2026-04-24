import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useLeadsFilter() {
  const [user, setUser] = useState(null);
  const [blacklist, setBlacklist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.Blacklist.list("-created_date", 500),
    ]).then(([u, bl]) => {
      setUser(u);
      setBlacklist(bl);
    }).finally(() => setLoading(false));
  }, []);

  // Normalize name for comparison: lowercase, trim, remove GmbH/KG/etc.
  const normalize = (name = "") =>
    name.toLowerCase().trim()
      .replace(/\s*(gmbh|co\.|kg|ag|&|und|gbr|e\.k\.|e\.v\.|ohg|inc\.?)\s*/gi, " ")
      .replace(/\s+/g, " ").trim();

  const blacklistNames = blacklist.map(b => normalize(b.firmenname));

  const filterCompanies = (companies) =>
    companies.filter(c => {
      // Hide if explicitly blacklisted via flag
      if (c.is_blacklisted) return false;
      // Hide if name matches a blacklist entry
      const cn = normalize(c.name);
      if (blacklistNames.some(bn => cn.includes(bn) || bn.includes(cn))) return false;
      return true;
    });

  return { user, filterCompanies, blacklist, loading };
}