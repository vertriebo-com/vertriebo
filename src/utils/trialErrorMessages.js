/**
 * Maps backend error codes to user-friendly messages
 */
export function mapTrialErrorToMessage(errorCode, errorMessage) {
  const messages = {
    trial_preview_limit_reached: {
      title: "Vorschau-Limit erreicht",
      message: "Sie haben Ihre kostenlosen Vorschau-Kontakte genutzt. Aktivieren Sie den verifizierten Testzugang für weitere Recherchen.",
      severity: "warning"
    },
    trial_restricted: {
      title: "Testzugang eingeschränkt",
      message: "Für diese Funktion ist ein verifizierter Testzugang erforderlich.",
      severity: "warning"
    },
    abuse_blocked: {
      title: "Zugang eingeschränkt",
      message: "Ihr Zugang wurde zur Sicherheitsprüfung vorübergehend eingeschränkt. Bitte kontaktieren Sie den Support.",
      severity: "error"
    },
    organization_suspended: {
      title: "Organisation gesperrt",
      message: "Diese Organisation ist vorübergehend gesperrt. Bitte kontaktieren Sie den Support.",
      severity: "error"
    }
  };

  return messages[errorCode] || {
    title: "Recherche fehlgeschlagen",
    message: errorMessage || "Bitte versuchen Sie es später erneut.",
    severity: "error"
  };
}