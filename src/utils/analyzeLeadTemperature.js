/**
 * analyzeLeadTemperature
 * 
 * Berechnet die Lead-Temperatur (Hot/Warm/Cold) basierend auf:
 * - Firmendaten (Kontaktdaten vorhanden)
 * - Kontaktverlauf (Erstkontakt, Ergebnis)
 * - Offene Aufgaben (Rückruf heute, Termin, etc.)
 * - Engagement-Signale (positiv/negativ)
 */

export function analyzeLeadTemperature(company, contactLogs, tasks) {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  const signals = {
    buying: [],
    risks: [],
    missing: [],
    positive: 0,
    negative: 0,
  };

  // Kontaktdaten
  if (company.telefon) signals.positive += 15;
  else signals.missing.push("Telefon");
  
  if (company.email) signals.positive += 10;
  else signals.missing.push("E-Mail");
  
  if (company.website) signals.positive += 8;
  if (company.ansprechpartner) signals.positive += 12;
  else signals.missing.push("Ansprechpartner");

  // Kontaktverlauf
  const recentLogs = [...(contactLogs || [])]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  const firstContact = recentLogs[recentLogs.length - 1] || null;
  let hasSuccessfulContact = false;

  if (recentLogs.length > 0) {
    const lastLog = recentLogs[0];
    
    if (lastLog.ergebnis === "Erreicht") {
      signals.positive += 20;
      hasSuccessfulContact = true;
      signals.buying.push("Erfolgreich kontaktiert");
    } else if (lastLog.ergebnis === "Nicht erreicht") {
      signals.negative += 5;
      signals.risks.push("Letzter Kontakt nicht erreicht");
    } else if (lastLog.ergebnis === "Rückruf vereinbart") {
      signals.positive += 25;
      signals.buying.push("Rückruf vereinbart");
    } else if (lastLog.ergebnis === "Termin vereinbart") {
      signals.positive += 35;
      signals.buying.push("Termin vereinbart");
    } else if (lastLog.ergebnis === "Angebot gesendet") {
      signals.positive += 30;
      signals.buying.push("Angebot gesendet");
    }

    if (!firstContact && recentLogs.length === 1) {
      signals.risks.push("Noch kein qualifizierter Erstkontakt");
    }
  } else {
    signals.risks.push("Noch kein Kontakt dokumentiert");
  }

  // Aufgaben
  const openTasks = (tasks || []).filter(t => !t.erledigt);
  const todayTasks = openTasks.filter(t => t.faellig_am && t.faellig_am.startsWith(today));
  const callbackTasks = openTasks.filter(t => t.typ === "Rückruf");
  const appointmentTasks = openTasks.filter(t => t.typ === "Termin");
  const overdueTasks = openTasks.filter(t => t.faellig_am && new Date(t.faellig_am) < now && !t.faellig_am.startsWith(today));

  if (todayTasks.length > 0) {
    signals.positive += 20;
    signals.buying.push(`${todayTasks.length} Aufgabe(n) heute fällig`);
  }

  if (callbackTasks.length > 0) {
    signals.positive += 15;
    const dueSoon = callbackTasks.filter(t => t.faellig_am && new Date(t.faellig_am) <= new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
    if (dueSoon.length > 0) {
      signals.buying.push(`Rückruf in den nächsten 7 Tagen geplant`);
    }
  }

  if (appointmentTasks.length > 0) {
    signals.positive += 25;
    signals.buying.push("Termin vereinbart");
  }

  if (overdueTasks.length > 0) {
    signals.negative += 15;
    signals.risks.push(`${overdueTasks.length} überfällige Aufgabe(n)`);
  }

  // Relevanz
  if (company.matched_target_customer_type) {
    signals.positive += 18;
    signals.buying.push("Passt zu Zielgruppe");
  } else {
    signals.risks.push("Zielgruppen-Match unklar");
  }

  if (company.priority_score && company.priority_score >= 60) {
    signals.positive += 15;
  } else if (company.priority_score && company.priority_score < 30) {
    signals.risks.push("Niedriger Prioritäts-Score");
  }

  // Status
  if (company.status === "Angebot") signals.positive += 20;
  if (company.status === "Termin") signals.positive += 15;
  if (company.status === "Gewonnen") signals.positive += 50;
  if (company.status === "Verloren") {
    signals.negative += 50;
    signals.risks.push("Status: Verloren");
  }

  // Score & Temperatur
  let score = 50;
  score += signals.positive - signals.negative;
  score = Math.max(0, Math.min(100, score));

  let temperature = "Cold";
  if (score >= 70) temperature = "Hot";
  else if (score >= 50) temperature = "Warm";

  // Begründung
  let reason = "";
  if (temperature === "Hot") {
    if (signals.buying.includes("Termin vereinbart") || signals.buying.includes("Angebot gesendet")) {
      reason = "Fortgeschrittener Sales-Prozess mit hoher Abschlusschance.";
    } else if (todayTasks.length > 0 && hasSuccessfulContact) {
      reason = "Aktive Aufgaben heute und erfolgreicher Kontakt.";
    } else {
      reason = "Mehrere positive Signale und hoher Engagement-Score.";
    }
  } else if (temperature === "Warm") {
    if (callbackTasks.length > 0) {
      reason = "Rückruf geplant mit relevanten Kontaktdaten – aktiv verfolgen.";
    } else if (hasSuccessfulContact && company.telefon) {
      reason = "Erstkontakt gelungen, vollständige Kontaktdaten vorhanden.";
    } else if (company.matched_target_customer_type && !hasSuccessfulContact) {
      reason = "Passt zur Zielgruppe, aber noch kein erfolgreicher Kontakt.";
    } else {
      reason = "Moderate Signale – regelmäßig verfolgen.";
    }
  } else {
    if (signals.risks.includes("Noch kein Kontakt dokumentiert")) {
      reason = "Noch kein Kontakt. Telefon oder E-Mail nutzen für Erstkontakt.";
    } else if (signals.missing.length > 2) {
      reason = `${signals.missing.length} kritische Daten fehlen – zuerst anreichern.`;
    } else if (signals.risks.includes("Status: Verloren")) {
      reason = "Lead wurde als verloren markiert.";
    } else {
      reason = "Bisher geringe Engagement-Signale – aktivieren oder priorisieren.";
    }
  }

  // Nächster Schritt
  let nextBestAction = "anrufen";
  if (todayTasks.length > 0) nextBestAction = "heute_aufgaben_erledigen";
  else if (overdueTasks.length > 0) nextBestAction = "ueberfaellige_aufgaben";
  else if (!company.telefon && company.email) nextBestAction = "email_senden";
  else if (!company.telefon && !company.email) nextBestAction = "daten_anreichern";

  return {
    temperature,
    score: Math.round(score),
    reason,
    nextBestAction,
    signals: {
      buying: signals.buying,
      risks: signals.risks,
      missing: signals.missing,
    },
    firstContact: firstContact ? {
      typ: firstContact.typ,
      ergebnis: firstContact.ergebnis,
      notiz: firstContact.notiz,
      date: firstContact.created_date,
    } : null,
  };
}