/**
 * Zentrale Utility-Klassen für konsistenten Text-Kontrast in der gesamten App
 * 
 * Verwendung: Importiere die benötigten Klassen und wende sie auf deine Elemente an
 * 
 * Beispiel:
 * <h1 className={TEXT_STYLES.pageTitle}>Titel</h1>
 * <p className={TEXT_STYLES.sectionDescription}>Beschreibung</p>
 */

export const TEXT_STYLES = {
  // Überschriften
  pageTitle: "text-3xl font-bold text-slate-900",
  pageSubtitle: "text-sm font-medium text-slate-700",
  
  // Sections
  sectionTitle: "text-sm font-semibold text-slate-900",
  sectionDescription: "text-xs text-slate-600 font-medium",
  
  // Cards
  cardTitle: "text-sm font-semibold text-slate-900",
  cardDescription: "text-xs text-slate-600 font-medium",
  
  // Forms
  formLabel: "text-xs font-semibold text-slate-900",
  formLabelSm: "text-[11px] font-semibold text-slate-900",
  
  // Text-Hierarchie
  textPrimary: "text-slate-900",
  textSecondary: "text-slate-700",
  textTertiary: "text-slate-600",
  textMuted: "text-slate-600",
  
  // Werte/Inhalte
  valuePrimary: "text-slate-900 font-semibold",
  valueSecondary: "text-slate-700 font-medium",
  
  // Small Text
  textXs: "text-[11px] text-slate-600 font-medium",
  textXsMuted: "text-[11px] text-slate-500",
  
  // Badge/Label Text
  badgeText: "text-[11px] font-semibold",
  
  // Link
  linkText: "text-sm font-medium text-primary hover:text-primary/80",
  
  // Error/Warning
  errorText: "text-sm font-medium text-destructive",
  warningText: "text-sm font-medium text-amber-700",
  
  // Success
  successText: "text-sm font-medium text-success",
};

/**
 * Helper-Funktion um mehrere Text-Klassen zu kombinieren
 * @param {...string} classes - Text-Klassen aus TEXT_STYLES
 * @returns {string} - Kombinierte Klassen
 */
export function combineTextStyles(...classes) {
  return classes.join(" ");
}