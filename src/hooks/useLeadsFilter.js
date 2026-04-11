import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

export function useLeadsFilter() {
  const [user, setUser] = useState(null);
  const [leadsVisibility, setLeadsVisibility] = useState("all");
  const [myBatchIds, setMyBatchIds] = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.auth.me(),
      base44.entities.AppSettings.filter({ key: "leads_visibility" }),
    ]).then(async ([me, settings]) => {
      setUser(me);
      const visibility = settings[0]?.value || "all";
      setLeadsVisibility(visibility);

      // For non-admins with "assigned" visibility, load their batch IDs
      if (me && me.role !== "admin" && visibility === "assigned") {
        const batches = await base44.entities.WeeklyBatch.filter({ assigned_to: me.email });
        setMyBatchIds(batches.map(b => b.id));
      } else {
        setMyBatchIds([]);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filterCompanies = (companies) => {
    if (!user) return companies;
    if (user.role === "admin") return companies;
    if (leadsVisibility === "all") return companies;

    // "assigned" mode: match by assigned_to OR by weekly_batch_id of user's batches
    return companies.filter(c => {
      if (c.assigned_to === user.email) return true;
      if (myBatchIds && myBatchIds.length > 0 && myBatchIds.includes(c.weekly_batch_id)) return true;
      return false;
    });
  };

  return { user, leadsVisibility, filterCompanies, loading: loading || myBatchIds === null };
}