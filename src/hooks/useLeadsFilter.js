import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useLeadsFilter() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me().then(setUser).finally(() => setLoading(false));
  }, []);

  // All users see all leads
  const filterCompanies = (companies) => companies;

  return { user, filterCompanies, loading };
}