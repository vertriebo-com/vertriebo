/**
 * useTaxonomy
 * ===========
 * React Hook für den Zugriff auf die DB-basierte Taxonomie.
 *
 * Lädt Taxonomie-Profile einmalig von der API und cached sie.
 * Alle Komponenten, die Branchen-Presets benötigen, nutzen diesen Hook.
 */

import { useState, useEffect } from "react";
import { loadTaxonomyProfiles, getCachedProfiles } from "@/utils/industryTargetPresets";

export function useTaxonomy() {
  const [profiles, setProfiles] = useState(() => getCachedProfiles());
  const [loading, setLoading] = useState(profiles.length === 0);
  const [error, setError] = useState(null);
  const [taxonomyHash, setTaxonomyHash] = useState(null);

  useEffect(() => {
    if (profiles.length > 0) return; // Bereits aus Cache
    setLoading(true);
    loadTaxonomyProfiles()
      .then(({ profiles: loaded, taxonomy_hash }) => {
        setProfiles(loaded);
        setTaxonomyHash(taxonomy_hash);
      })
      .catch(err => {
        console.error("[useTaxonomy] Fehler:", err?.message);
        setError(err?.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const getPreset = (industryIdOrLabel) => {
    if (!industryIdOrLabel) return null;
    return profiles.find(p =>
      p.id === industryIdOrLabel ||
      p.label === industryIdOrLabel
    ) || null;
  };

  const labels = profiles.map(p => p.label);

  return { profiles, labels, loading, error, getPreset, taxonomyHash };
}