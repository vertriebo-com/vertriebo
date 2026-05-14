/**
 * analyzeLeadTemperature – WOW Level Engine Copy
 * 
 * Keine generischen Texte mehr. Jede Begründung wird aus echten Lead-Daten zusammengesetzt.
 * Die Engine muss konkret, verkaufsnah und handlungsorientiert sein.
 * 
 * Grundsatz: Würde ein echter Vertriebler dadurch sofort besser handeln?
 */

// ─────────────────────────────────────────────────────────────
// Helper: Kaufsignale
// ─────────────────────────────────────────────────────────────
function detectBuyingSignals(company, contactLogs, tasks) {
  const signals = [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const openTasks = (tasks || []).filter(t => !t.erledigt);
  const todayTasks = openTasks.filter(t => t.faellig_am && t.faellig_am.startsWith(today));
  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = recentLogs[0] || null;

  // Status-Signale
  if (company.status === "Angebot") signals.push("Angebot angefragt");
  if (company.status === "Termin") signals.push("Termin vereinbart");
  if (company.status === "Gewonnen") signals.push("Gewonnen");

  // Kontakt-Signale
  if (lastLog?.ergebnis === "Erreicht") signals.push("Erfolgreich kontaktiert");
  if (lastLog?.ergebnis === "Termin vereinbart") signals.push("Termin vereinbart");
  if (lastLog?.ergebnis === "Angebot gesendet") signals.push("Angebot gesendet");
  if (lastLog?.ergebnis === "Rückruf vereinbart") signals.push("Rückruf geplant");

  // Aufgaben-Signale
  if (todayTasks.length > 0) signals.push(`${todayTasks.length} Aufgabe(n) heute`);
  const appointmentTasks = openTasks.filter(t => t.typ === "Termin");
  if (appointmentTasks.length > 0) signals.push("Termin gebucht");

  // Kontaktdaten-Signale
  if (company.telefon) signals.push("Telefon vorhanden");
  if (company.email) signals.push("E-Mail vorhanden");
  if (company.website) signals.push("Website vorhanden");
  if (company.ansprechpartner) signals.push("Ansprechpartner bekannt");

  // Zielgruppe
  if (company.matched_target_customer_type) signals.push("Passende Branche");
  if (company.branche) signals.push(`Branche: ${company.branche}`);

  return signals;
}

// ─────────────────────────────────────────────────────────────
// Helper: Risiken
// ─────────────────────────────────────────────────────────────
function detectRiskSignals(company, contactLogs, tasks) {
  const risks = [];
  const now = new Date();
  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = recentLogs[0] || null;
  const openTasks = (tasks || []).filter(t => !t.erledigt);
  const overdueTasks = openTasks.filter(t => t.faellig_am && new Date(t.faellig_am) < now && !t.faellig_am.startsWith(now.toISOString().split('T')[0]));

  // Kontakt-Risiken
  if (!recentLogs.length) risks.push("Kein Kontakt dokumentiert");
  else if (lastLog?.ergebnis === "Nicht erreicht") risks.push("Letzter Kontakt: nicht erreicht");

  // Daten-Lücken
  if (!company.telefon) risks.push("Keine Telefonnummer");
  if (!company.email) risks.push("Keine E-Mail");
  if (!company.ansprechpartner) risks.push("Ansprechpartner unbekannt");
  if (!company.website) risks.push("Keine Website");

  // Geschäftliche Risiken
  if (!company.matched_target_customer_type) risks.push("Zielgruppen-Match unklar");
  if (company.status === "Verloren") risks.push("Status: Verloren");
  if (company.priority_score && company.priority_score < 30) risks.push("Niedriger Prioritäts-Score");

  // Prozess-Risiken
  if (overdueTasks.length > 0) risks.push(`${overdueTasks.length} überfällige Aufgabe(n)`);

  return risks;
}

// ─────────────────────────────────────────────────────────────
// Helper: Fehlende Daten
// ─────────────────────────────────────────────────────────────
function detectMissingData(company, contactLogs) {
  const missing = [];
  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  if (!company.ansprechpartner) missing.push("Ansprechpartner");
  if (!company.email) missing.push("E-Mail");
  if (!company.website) missing.push("Website");
  if (!company.telefon) missing.push("Telefon");
  if (!company.matched_target_customer_type) missing.push("Bedarf / Zielgruppen-Match");

  const lastLog = recentLogs[0];
  if (!lastLog || !lastLog.notiz) missing.push("Qualifizierter Kontakt-Status");

  return missing;
}

// ─────────────────────────────────────────────────────────────
// Helper: Erstkontakt-Zusammenfassung
// ─────────────────────────────────────────────────────────────
function buildFirstContactSummary(contactLogs) {
  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = recentLogs[0] || null;

  if (!lastLog) {
    return "Noch kein Kontakt dokumentiert";
  }

  // Kurze Zusammenfassung aus letztem ContactLog
  let summary = `Bisheriger Kontakt: ${lastLog.typ} – ${lastLog.ergebnis}`;
  
  if (lastLog.notiz) {
    summary += `. ${lastLog.notiz.split('\n')[0].substring(0, 80)}${lastLog.notiz.length > 80 ? '…' : ''}`;
  }

  return summary;
}

// ─────────────────────────────────────────────────────────────
// Helper: Temperatur-Begründung (konkret, nicht generisch)
// ─────────────────────────────────────────────────────────────
function buildTemperatureReason(temperature, company, contactLogs, tasks, score) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = recentLogs[0] || null;
  const openTasks = (tasks || []).filter(t => !t.erledigt);
  const todayTasks = openTasks.filter(t => t.faellig_am && t.faellig_am.startsWith(today));
  const callbackTasks = openTasks.filter(t => t.typ === "Rückruf");
  const appointmentTasks = openTasks.filter(t => t.typ === "Termin");

  if (temperature === "Hot") {
    // Konkreter Hot-Fall
    if (company.status === "Angebot" || company.status === "Termin") {
      return `${company.status === "Termin" ? "Termin vereinbart" : "Angebot angefragt"} – Lead ist in finaler Phase. Nachfassen und Timing für Unterschrift klären.`;
    }
    if (appointmentTasks.length > 0) {
      return `Termin gebucht. Vorbereitung durchführen und alle offenen Fragen vorab klären.`;
    }
    if (todayTasks.length > 0 && lastLog?.ergebnis === "Erreicht") {
      return `${todayTasks.length} Aufgabe(n) heute + erfolgreicher Kontakt. Momentum nutzen und Termin sichern.`;
    }
    if (company.matched_target_customer_type && lastLog?.ergebnis === "Erreicht") {
      const dataString = [company.telefon && "Telefon", company.email && "E-Mail", company.website && "Website"]
        .filter(Boolean).join(", ");
      return `Passende Branche, erfolgreich erreicht, ${dataString} vorhanden. Bedarf konkretisieren.`;
    }
    return `Lead zeigt starke Kaufsignale (${score} Punkte). Jetzt aktiv qualifizieren.`;
  }

  if (temperature === "Warm") {
    // Konkreter Warm-Fall
    if (todayTasks.length > 0) {
      return `Heute ${todayTasks.length} Aufgabe(n) fällig. Priorisieren und durchführen.`;
    }
    if (callbackTasks.length > 0) {
      const dueDate = callbackTasks[0].faellig_am;
      return `Rückruf geplant (${dueDate ? new Date(dueDate).toLocaleDateString('de-DE') : 'soon'}). Vorher Bedarf und Entscheider recherchieren.`;
    }
    if (lastLog?.ergebnis === "Erreicht" && company.matched_target_customer_type) {
      const missing = detectMissingData(company, contactLogs);
      return `Erfolgreich erreicht, passende Branche, aber ${missing.length > 0 ? `noch ${missing.slice(0, 2).join(" und ")} fehlen` : "Bedarf noch unklar"}. Nächster Schritt: Klärungsgespräch.`;
    }
    if (company.matched_target_customer_type && !lastLog) {
      const dataString = [company.telefon && "Telefon", company.email && "E-Mail"].filter(Boolean).join(" und ");
      return `Passende Branche mit ${dataString}. Erstkontakt herstellen.`;
    }
    if (lastLog?.ergebnis === "Nicht erreicht" && (company.telefon || company.email)) {
      return `Nicht erreicht, aber Kontaktdaten vorhanden. Erneut versuchen oder E-Mail schreiben.`;
    }
    return `Moderate Chancen (${score} Punkte). Regelmäßig verfolgen und Bedarfsänderungen checken.`;
  }

  // Cold-Fall
  if (company.status === "Verloren") {
    return `Lead wurde als Verloren markiert. Nur erneut kontaktieren bei Bedarf- oder Ansprechpartner-Wechsel.`;
  }
  if (!recentLogs.length) {
    return `Noch kein Kontakt. Erstkontakt über ${company.telefon ? "Telefon" : company.email ? "E-Mail" : "Recherche"} herstellen.`;
  }
  const missing = detectMissingData(company, contactLogs);
  if (missing.length >= 2) {
    return `${missing.slice(0, 2).join(" und ")} fehlen. Daten anreichern, dann erneut qualifizieren.`;
  }
  return `Geringe Engagement-Signale (${score} Punkte). Neu bewerten oder deprioritisieren.`;
}

// ─────────────────────────────────────────────────────────────
// Helper: Nächster bester Schritt (konkret, nicht generisch)
// ─────────────────────────────────────────────────────────────
function buildNextBestAction(company, contactLogs, tasks) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = recentLogs[0] || null;
  const openTasks = (tasks || []).filter(t => !t.erledigt);
  const todayTasks = openTasks.filter(t => t.faellig_am && t.faellig_am.startsWith(today));
  const callbackTasks = openTasks.filter(t => t.typ === "Rückruf");
  const appointmentTasks = openTasks.filter(t => t.typ === "Termin");
  const overdueTasks = openTasks.filter(t => t.faellig_am && new Date(t.faellig_am) < now && !t.faellig_am.startsWith(today));

  // Überfällig geht vor
  if (overdueTasks.length > 0) {
    return `Überfällige Aufgabe(n) abarbeiten – ${overdueTasks[0].titel || "sofort"}`;
  }

  // Heute geht vor
  if (todayTasks.length > 0) {
    return `Heute abarbeiten – ${todayTasks[0].titel || "Aufgabe"}`;
  }

  // Termin
  if (appointmentTasks.length > 0) {
    const date = appointmentTasks[0].faellig_am;
    return `Termin vorbereiten (${date ? new Date(date).toLocaleDateString('de-DE') : 'upcoming'})`;
  }

  // Rückruf
  if (callbackTasks.length > 0) {
    return `Rückruf durchführen – Bedarf und Entscheider klären`;
  }

  // Status-basiert
  if (company.status === "Angebot") {
    return `Angebot nachfassen – Feedback einholen`;
  }

  if (company.status === "Termin") {
    return `Termin vorbereiten – Unterlagen zusammenstellen`;
  }

  // Kontakt-Status
  if (lastLog?.ergebnis === "Angebot gesendet") {
    return `Angebot nachfassen – Rückfragen beantworten`;
  }

  if (lastLog?.ergebnis === "Termin vereinbart") {
    return `Termin vorbereiten`;
  }

  if (lastLog?.ergebnis === "Nicht erreicht") {
    if (company.email && !company.telefon) {
      return `E-Mail schreiben – Erstkontakt herstellen`;
    }
    if (company.telefon) {
      return `Erneut anrufen – Bedarf klären`;
    }
  }

  if (!recentLogs.length) {
    if (company.telefon) {
      return `Anrufen – Erstkontakt herstellen`;
    }
    if (company.email) {
      return `E-Mail schreiben – Erstkontakt`;
    }
    return `Kontaktdaten anreichern`;
  }

  // Fallback: ehrlich
  const missing = detectMissingData(company, contactLogs);
  if (missing.length > 0) {
    return `${missing[0]} recherchieren – dann erneut kontaktieren`;
  }

  return `Lead neu bewerten – Bedarf unklar`;
}

// ─────────────────────────────────────────────────────────────
// Hauptfunktion
// ─────────────────────────────────────────────────────────────
export function analyzeLeadTemperature(company, contactLogs, tasks) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const buyingSignals = detectBuyingSignals(company, contactLogs, tasks);
  const riskSignals = detectRiskSignals(company, contactLogs, tasks);
  const missingData = detectMissingData(company, contactLogs);

  // Score-Berechnung
  let score = 50;
  score += buyingSignals.length * 8; // Pro Kaufsignal +8
  score -= riskSignals.length * 6; // Pro Risiko -6
  score -= missingData.length * 4; // Pro fehlendes Feld -4

  const recentLogs = [...(contactLogs || [])].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const lastLog = recentLogs[0] || null;

  // Status-Boni
  if (company.status === "Angebot") score += 25;
  if (company.status === "Termin") score += 20;
  if (company.status === "Gewonnen") score += 50;
  if (company.status === "Verloren") score -= 50;

  // Kontakt-Boni
  if (lastLog?.ergebnis === "Erreicht") score += 15;
  if (lastLog?.ergebnis === "Termin vereinbart") score += 25;
  if (lastLog?.ergebnis === "Angebot gesendet") score += 20;
  if (lastLog?.ergebnis === "Nicht erreicht") score -= 8;

  score = Math.max(0, Math.min(100, score));

  // Temperatur
  let temperature = "Cold";
  if (score >= 70) temperature = "Hot";
  else if (score >= 50) temperature = "Warm";

  // Begründung
  const reason = buildTemperatureReason(temperature, company, contactLogs, tasks, score);

  // Nächster Schritt
  const nextBestAction = buildNextBestAction(company, contactLogs, tasks);

  // Erstkontakt
  const firstContactSummary = buildFirstContactSummary(contactLogs);

  return {
    temperature,
    score: Math.round(score),
    reason,
    nextBestAction,
    firstContactSummary,
    signals: {
      buying: buyingSignals,
      risks: riskSignals,
      missing: missingData,
    },
  };
}