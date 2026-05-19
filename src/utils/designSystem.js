/**
 * Vertriebo Design System Bridge
 * Verbindet Landing-Premium-Dark mit App-Premium-Light
 * 
 * Prinzipien:
 * - Landing: Dark Premium SaaS (Marketing, hohe visuelle Wirkung)
 * - App: Premium Light (tägliche Nutzung, viele Daten, Lesbarkeit)
 * - Einheitlich: Farben, Typografie, Komponenten, Shadows, Gradients
 */

// === FARBPALETTE ===
export const colors = {
  // Primary Gradient (Landing → App)
  primary: {
    blue: '#2563EB',    // #2563EB
    violet: '#7C3AED',  // #7C3AED
    gradient: 'linear-gradient(135deg, #2563EB, #7C3AED)',
  },
  
  // Backgrounds (App Light)
  background: {
    main: '#F6F8FB',      // Sehr helles Slate mit Blue-Tint
    card: '#FFFFFF',      // White Cards
    hover: '#F1F5F9',     // Light hover state
  },
  
  // Text (App) – Kontraststark für alle Hintergründe
  text: {
    primary: '#0F172A',   // Slate-900 – Labels, Überschriften, Eingabewerte
    secondary: '#334155', // Slate-700 – Sekundäre Texte, Beschreibungen
    muted: '#475569',     // Slate-600 – Hilfstexte, optional-Hinweise, Placeholder
  },
  
  // Status (Landing → App)
  status: {
    hot: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', text: '#DC2626' },
    warm: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#EA580C' },
    cold: { bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', text: '#2563EB' },
    success: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', text: '#16A34A' },
  },
  
  // Borders
  border: {
    light: '#E2E8F0',     // Slate-200
    medium: '#CBD5E1',    // Slate-300
    primary: 'rgba(37,99,235,0.2)',
  },
};

// === SHADOWS ===
export const shadows = {
  // Soft, premium shadows (nicht zu hart)
  card: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
  cardHover: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
  elevated: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
  glow: '0 0 20px rgba(37,99,235,0.15)',
  glowStrong: '0 0 30px rgba(37,99,235,0.25)',
};

// === BORDER RADIUS ===
export const radius = {
  sm: '6px',
  md: '10px',
  lg: '12px',
  xl: '16px',
  full: '9999px',
};

// === TYPOGRAPHY ===
export const typography = {
  fontFamily: "'Inter', sans-serif",
  
  // App-spezifisch (kompakter als Landing)
  page: {
    title: { size: '24px', weight: '800', lineHeight: '1.3' },
    subtitle: { size: '14px', weight: '600', color: colors.text.secondary },
  },
  card: {
    title: { size: '13px', weight: '700' },
    body: { size: '12px', weight: '500' },
    muted: { size: '11px', color: colors.text.muted },
  },
  button: {
    primary: { size: '13px', weight: '700' },
    secondary: { size: '13px', weight: '600' },
  },
};

// === COMPONENT STYLES ===
export const components = {
  // Buttons
  button: {
    primary: {
      background: colors.primary.gradient,
      color: '#FFFFFF',
      border: 'none',
      borderRadius: radius.lg,
      padding: '10px 20px',
      fontWeight: '700',
      fontSize: '13px',
      boxShadow: shadows.glow,
      transition: 'all 0.3s',
    },
    secondary: {
      background: 'rgba(255,255,255,0.6)',
      color: colors.text.primary,
      border: `1px solid ${colors.border.light}`,
      borderRadius: radius.lg,
      padding: '10px 20px',
      fontWeight: '600',
      fontSize: '13px',
      backdropFilter: 'blur(8px)',
    },
    ghost: {
      background: 'transparent',
      color: colors.text.secondary,
      fontWeight: '600',
    },
  },
  
  // Cards
  card: {
    background: colors.background.card,
    border: `1px solid ${colors.border.light}`,
    borderRadius: radius.xl,
    padding: '16px',
    boxShadow: shadows.card,
    transition: 'all 0.3s',
    hover: {
      boxShadow: shadows.cardHover,
      transform: 'translateY(-2px)',
    },
  },
  
  // Badges
  badge: {
    hot: {
      background: colors.status.hot.bg,
      border: `1px solid ${colors.status.hot.border}`,
      color: colors.status.hot.text,
      fontSize: '10px',
      fontWeight: '700',
      padding: '3px 10px',
      borderRadius: radius.full,
    },
    warm: {
      background: colors.status.warm.bg,
      border: `1px solid ${colors.status.warm.border}`,
      color: colors.status.warm.text,
      fontSize: '10px',
      fontWeight: '700',
      padding: '3px 10px',
      borderRadius: radius.full,
    },
    cold: {
      background: colors.status.cold.bg,
      border: `1px solid ${colors.status.cold.border}`,
      color: colors.status.cold.text,
      fontSize: '10px',
      fontWeight: '700',
      padding: '3px 10px',
      borderRadius: radius.full,
    },
  },
  
  // Dialogs/Modals
  dialog: {
    overlay: {
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
    },
    content: {
      background: colors.background.card,
      border: `1px solid ${colors.border.light}`,
      borderRadius: radius.xl,
      boxShadow: shadows.elevated,
      padding: '24px',
    },
    header: {
      borderBottom: `1px solid ${colors.border.light}`,
      paddingBottom: '16px',
      marginBottom: '20px',
    },
    title: {
      fontSize: '16px',
      fontWeight: '800',
      color: colors.text.primary,
    },
  },
  
  // Inputs
  input: {
    background: '#FFFFFF',
    border: `1px solid ${colors.border.medium}`,
    borderRadius: radius.md,
    padding: '10px 14px',
    fontSize: '13px',
    focus: {
      borderColor: colors.primary.blue,
      boxShadow: `0 0 0 3px rgba(37,99,235,0.1)`,
    },
  },
};

// === GRADIENT UTILS ===
export const gradients = {
  primary: colors.primary.gradient,
  cardAccent: 'linear-gradient(135deg, rgba(37,99,235,0.05), rgba(124,58,237,0.05))',
  badge: {
    hot: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.05))',
    warm: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
    success: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(34,197,94,0.05))',
  },
};

// === ANIMATION UTILS ===
export const animations = {
  transition: 'all 0.3s ease',
  hover: {
    transform: 'translateY(-2px)',
    boxShadow: shadows.cardHover,
  },
  glow: {
    animation: 'pulse-glow 3s ease-in-out infinite',
  },
};

/**
 * Usage Example:
 * 
 * import { components, colors, shadows } from '@/utils/designSystem';
 * 
 * <div style={{
 *   ...components.card,
 *   background: gradients.cardAccent,
 * }}>
 *   <button style={components.button.primary}>
 *     Action
 *   </button>
 * </div>
 */