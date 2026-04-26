import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// AI-basiertes Lead Scoring
// Stufe 1: Regelbasierter Basis-Score (schnell, alle Leads)
// Stufe 2: KI-Tiefenanalyse (GPT) für Top-Leads mit Kontakthistorie

const BRANCHE_SCORES = {
  "Immobilienverwaltung": 8, "Lager / Logistik": 7, "Spedition / Logistik": 7,
  "Baufirma": 7, "Bürogebäude": 6, "Steuerberatung / Büro": 6,
  "Bank / Finanzdienstleister": 6, "Versicherung / Büro": 6,
  "Arztpraxis": 5, "Zahnarztpraxis": 5, "Kanzlei / Architekt": 5,
  "Autohaus / Kfz-Betrieb": 5, "Handwerksbetrieb": 4, "Logistik / Paketdienst": 4,
  "Gewerbe": 2,
};

function calcBaseScore(company, logs, tasks) {
  const now = new Date();
  let score = 0;

  // Status
  const statusScore = { "Neu": 1, "Kontakt": 2, "Rückruf": 8, "Termin": 10, "Angebot": 9 };
  score += statusScore[company.status] || 0;

  // Branche
  score += BRANCHE_SCORES[company.branche] || 2;

  // Firmengröße-Indikatoren
  if (company.website) score += 2;
  if (company.telefon) score += 1;
  if (company.ansprechpartner) score += 2;

  // Standort
  if (company.entfernung_km) {
    if (company.entfernung_km < 5) score += 5;
    else if (company.entfernung_km < 10) score += 3;
    else if (company.entfernung_km < 20) score += 1;
  }

  // Letzter Kontakt
  const lastLog = logs[0];
  if (lastLog) {
    const days = (now - new Date(lastLog.created_date)) / (1000 * 60 * 60 * 24);
    if (days < 1) score += 5;
    else if (days < 3) score += 3;
    else if (days > 14) score -= 3;
  }

  // Positive Ergebnisse
  const positiveOutcomes = logs.filter(l =>
    ["Rückruf vereinbart", "Termin vereinbart", "Angebot gesendet"].includes(l.ergebnis)
  ).length;
  score += positiveOutcomes * 3;

  // Überfällige Aufgabe
  const overdueTask = tasks.find(t => !t.erledigt && t.faellig_am && new Date(t.faellig_am) < now);
  if (overdueTask) score += 4;

  // Engagement
  score += Math.min(logs.length, 5);

  return Math.max(0, score);
}

async function aiScoreCompany(base44, company, logs) {
  const logSummary = logs.slice(0, 6).map(l =>
    `- ${l.typ} (${l.ergebnis}): ${(l.notiz || "").slice(0, 80)}${l.naechster_schritt ? " → " + l.naechster_schritt : ""}`
  ).join("\n");

  const prompt = `Vertriebsanalyst für Gebäudedienstleistung. Bewerte diesen Lead 0-100:
Firma: ${company.name}, Branche: ${company.branche || "?"}, Status: ${company.status}
Kontakte:\n${logSummary || "kein Kontakt"}
Notizen: ${(company.notizen || "").replace(/\[\[AI:.*?\]\]\n?/s, "").slice(0, 100)}
Kriterien: Interesse-Signale, Abschlusswahrscheinlichkeit, Dringlichkeit, Branchenfit.
JSON: {"score": <0-100>, "grund": "<max 12 Wörter>"}`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: "object",
      properties: {
        score: { type: "number" },
        grund: { type: "string" }
      }
    }
  });

  return {
    ai_score: Math.min(100, Math.max(0, Math.round(result.score || 0))),
    ai_grund: result.grund || ""
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const [companies, contactLogs, tasks] = await Promise.all([
      base44.asServiceRole.entities.Company.list('-created_date', 1000),
      base44.asServiceRole.entities.ContactLog.list('-created_date', 2000),
      base44.asServiceRole.entities.Task.list('-created_date', 500),
    ]);

    // Group by company
    const logsByCompany = {};
    for (const log of contactLogs) {
      if (!logsByCompany[log.company_id]) logsByCompany[log.company_id] = [];
      logsByCompany[log.company_id].push(log);
    }
    const tasksByCompany = {};
    for (const task of tasks) {
      if (!tasksByCompany[task.company_id]) tasksByCompany[task.company_id] = [];
      tasksByCompany[task.company_id].push(task);
    }

    let updated = 0;
    let aiAnalyzed = 0;

    for (const company of companies) {
      if (["Gewonnen", "Verloren"].includes(company.status)) continue;

      const logs = (logsByCompany[company.id] || []).sort(
        (a, b) => new Date(b.created_date) - new Date(a.created_date)
      );
      const compTasks = tasksByCompany[company.id] || [];

      // Stufe 1: Regelbasierter Score (0-50 Punkte)
      const baseScore = calcBaseScore(company, logs, compTasks);

      // Stufe 2: KI-Score für Leads mit Kontakthistorie (>=2 Logs)
      let aiScore = null;
      let aiGrund = "";

      if (logs.length >= 2 && aiAnalyzed < 20) {
        try {
          // Delay between AI calls to avoid rate limiting
          if (aiAnalyzed > 0) {
            await new Promise(r => setTimeout(r, 2000));
          }
          const aiResult = await aiScoreCompany(base44, company, logs);
          aiScore = aiResult.ai_score;
          aiGrund = aiResult.ai_grund;
          aiAnalyzed++;
        } catch (e) {
          console.error(`AI scoring failed for ${company.name}:`, e.message);
          // Fallback: use base score only
        }
      }

      // Kombinierter Score: 40% Regeln + 60% KI (falls vorhanden)
      let finalScore;
      if (aiScore !== null) {
        // Normalisiere Basis-Score auf 0-100 Skala (max base ≈ 50)
        const normalizedBase = Math.min(100, Math.round(baseScore * 2));
        finalScore = Math.round(normalizedBase * 0.4 + aiScore * 0.6);
      } else {
        finalScore = Math.min(100, Math.round(baseScore * 2));
      }

      const isHot = finalScore >= 60;

      // Speichere Score + KI-Begründung in notizen (nur wenn ai)
      const updatePayload = {
        priority_score: finalScore,
        is_hot: isHot,
      };

      if (aiScore !== null && aiGrund) {
        // Speichere KI-Begründung als separates Feld (via ai_score_reason in notizen-Prefix)
        // Wir nutzen ein JSON-Präfix-Tag, das Frontend parst es
        const existingNotizen = company.notizen || "";
        // Entferne altes AI-Tag wenn vorhanden
        const cleanNotizen = existingNotizen.replace(/\[\[AI:.*?\]\]\n?/s, "");
        updatePayload.notizen = `[[AI:${aiGrund}]]\n${cleanNotizen}`.trim();
      }

      if (company.priority_score !== finalScore || company.is_hot !== isHot) {
        await base44.asServiceRole.entities.Company.update(company.id, updatePayload);
        updated++;
      }
    }

    return Response.json({
      success: true,
      ran_at: new Date().toISOString(),
      companies_evaluated: companies.length,
      companies_updated: updated,
      ai_analyzed: aiAnalyzed,
    });
  } catch (error) {
    console.error("priorityAgent error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});