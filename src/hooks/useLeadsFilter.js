import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

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
    }).finally(() => setLoading(false));
  }, []);

  const filterCompanies = (companies) => {
    // While loading or no user data, return all (show something rather than nothing)
    if (!user) return companies;
    // Admin always sees everything
    if (user.role === "admin") return companies;
    // Setting "all": every salesperson sees all leads
    if (leadsVisibility === "all") return companies;
    // Setting "assigned": only show leads assigned to this user
    return companies.filter(c => c.assigned_to === user.email);
  };

  return { user, leadsVisibility, filterCompanies, loading };
}