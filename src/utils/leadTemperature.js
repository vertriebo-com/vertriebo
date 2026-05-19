/**
 * Zentrale Utility für Lead-Temperatur-Bewertung
 * 
 * KANONISCHE LOGIK (identisch zu getDashboardData/getLeadTemperatureCanonical):
 * 1. Primär: Company.lead_temperature ('hot' | 'warm' | 'cold')
 * 2. Fallback Score: lead_temperature_score (Engine-Score) – hat Vorrang vor priority_score
 * 3. Fallback Score: priority_score
 * 4. Legacy: is_hot === true
 * Schwelle: >= 60 → hot, >= 30 → warm
 */

/**
 * Gibt die kanonische Temperatur eines Leads zurück
 * @param {Object} company - Company entity object
 * @returns {'hot' | 'warm' | 'cold' | 'unknown'}
 */
export function getLeadTemperature(company) {
  if (!company) return 'unknown';
  
  // 1. Primär: lead_temperature Feld
  const temp = company.lead_temperature;
  if (temp && ['hot', 'warm', 'cold'].includes(temp)) {
    return temp;
  }
  
  // 2. Fallback Score: lead_temperature_score zuerst, dann priority_score
  const score = (company.lead_temperature_score != null ? company.lead_temperature_score : 0) || (company.priority_score || 0);
  if (score >= 60) return 'hot';
  if (score >= 30) return 'warm';
  
  // 3. Letztes Fallback: is_hot (Legacy)
  if (company.is_hot === true) return 'hot';
  
  return 'unknown';
}

/**
 * Prüft ob Lead als 'hot' gilt
 * @param {Object} company - Company entity object
 * @returns {boolean}
 */
export function isHotLead(company) {
  return getLeadTemperature(company) === 'hot';
}

/**
 * Prüft ob Lead als 'warm' gilt
 * @param {Object} company - Company entity object
 * @returns {boolean}
 */
export function isWarmLead(company) {
  return getLeadTemperature(company) === 'warm';
}

/**
 * Prüft ob Lead als 'cold' gilt
 * @param {Object} company - Company entity object
 * @returns {boolean}
 */
export function isColdLead(company) {
  return getLeadTemperature(company) === 'cold';
}

/**
 * Berechnet den kanonischen Temperatur-Score
 * @param {Object} company - Company entity object
 * @returns {number} 0-100
 */
export function getTemperatureScore(company) {
  if (!company) return 0;
  
  // Primär: lead_temperature_score wenn vorhanden
  if (company.lead_temperature_score !== undefined && company.lead_temperature_score !== null) {
    return company.lead_temperature_score;
  }
  
  // Fallback: priority_score
  if (company.priority_score !== undefined && company.priority_score !== null) {
    return company.priority_score;
  }
  
  // Letztes Fallback: is_hot
  if (company.is_hot === true) return 80;
  
  return 0;
}