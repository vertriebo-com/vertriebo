import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

// Shared hook: loads user + leadsVisibility setting, returns filtered companies
export function useLeadsFilter() {
  const [user, setUser] = useState(null);
  const [leadsVisibility, setLeadsVisibility] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.AppSettings.filter({ key: "leads_visibility" }),
    ]).then(([me, settings]) => {
      setUser(me);
      setLeadsVisibility(settings[0]?.value || "all");
      setLoading(false);
    });
  }, []);

  const filterCompanies = (companies) => {
    if (!user) return [];
    if (user.role === "admin") return companies;
    if (leadsVisibility === "all") return companies;
    // "assigned": only show companies assigned to this user
    return companies.filter(c => c.assigned_to === user.email);
  };

  return { user, leadsVisibility, filterCompanies, loading };
}