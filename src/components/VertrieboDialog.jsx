import {
  Dialog,
  DialogContent as UIDialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { colors, radius, shadows, components, typography } from "@/utils/designSystem";

/**
 * VertrieboDialog - Einheitliche Dialog-Komponente mit Premium-Light Design
 * 
 * Usage:
 * <VertrieboDialog open={open} onClose={onClose} title="Titel" description="Optionale Beschreibung">
 *   ... your form ...
 *   <DialogActions>
 *     <Button variant="outline">Abbrechen</Button>
 *     <Button>Aktion</Button>
 *   </DialogActions>
 * </VertrieboDialog>
 */

export function VertrieboDialog({ open, onClose, title, description, children, showActions = true }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <UIDialogContent 
        className="max-w-md"
        style={{
          background: colors.background.card,
          border: `1px solid ${colors.border.light}`,
          borderRadius: radius.xl,
          boxShadow: shadows.elevated,
          padding: 0,
          maxWidth: '560px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        {/* Header mit Gradient-Akzent */}
        <div style={{
          padding: '24px 24px 0 24px',
          borderBottom: `1px solid ${colors.border.light}`,
          paddingBottom: '16px',
          marginBottom: '20px',
        }}>
          <DialogTitle style={{
            fontSize: '16px',
            fontWeight: '800',
            color: colors.text.primary,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            {title}
          </DialogTitle>
          {description && (
            <p style={{
              fontSize: '13px',
              color: colors.text.secondary,
              marginTop: '4px',
              fontWeight: '500',
            }}>
              {description}
            </p>
          )}
        </div>
        
        {/* Content */}
        <div style={{ padding: '0 24px 24px 24px' }}>
          {children}
        </div>
      </UIDialogContent>
    </Dialog>
  );
}

export function DialogActions({ children, className = "" }) {
  return (
    <div className={`flex justify-end gap-2 pt-4 ${className}`} style={{ borderTop: `1px solid ${colors.border.light}`, paddingTop: '16px', marginTop: '16px' }}>
      {children}
    </div>
  );
}

/**
 * VertrieboInput - Einheitliches Input-Design
 */
export function VertrieboInput({ label, error, required, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '700',
          color: colors.text.primary,
          marginBottom: '6px',
        }}>
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      <input
        {...props}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '13px',
          background: '#FFFFFF',
          border: `1px solid ${error ? '#DC2626' : colors.border.medium}`,
          borderRadius: radius.md,
          color: colors.text.primary,
          transition: 'all 0.2s',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = colors.primary.blue;
          e.target.style.boxShadow = `0 0 0 3px rgba(37,99,235,0.1)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#DC2626' : colors.border.medium;
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && (
        <p style={{
          fontSize: '11px',
          color: '#DC2626',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

/**
 * VertrieboTextarea - Einheitliches Textarea-Design
 */
export function VertrieboTextarea({ label, error, required, rows = 3, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '700',
          color: colors.text.primary,
          marginBottom: '6px',
        }}>
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      <textarea
        {...props}
        rows={rows}
        style={{
          width: '100%',
          padding: '10px 14px',
          fontSize: '13px',
          background: '#FFFFFF',
          border: `1px solid ${error ? '#DC2626' : colors.border.medium}`,
          borderRadius: radius.md,
          color: colors.text.primary,
          transition: 'all 0.2s',
          outline: 'none',
          resize: 'vertical',
          minHeight: rows * 28,
        }}
        onFocus={(e) => {
          e.target.style.borderColor = colors.primary.blue;
          e.target.style.boxShadow = `0 0 0 3px rgba(37,99,235,0.1)`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#DC2626' : colors.border.medium;
          e.target.style.boxShadow = 'none';
        }}
      />
      {error && (
        <p style={{
          fontSize: '11px',
          color: '#DC2626',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}

/**
 * VertrieboSelect - Einheitliches Select-Design (Wrapper um MobileSelect)
 */
export function VertrieboSelect({ label, error, required, options, value, onChange, placeholder }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '700',
          color: colors.text.primary,
          marginBottom: '6px',
        }}>
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </label>
      )}
      {options && value && onChange && placeholder && (
        <div style={{
          padding: '10px 14px',
          fontSize: '13px',
          background: '#FFFFFF',
          border: `1px solid ${error ? '#DC2626' : colors.border.medium}`,
          borderRadius: radius.md,
          color: value ? colors.text.primary : colors.text.muted,
          cursor: 'pointer',
        }}>
          {value || placeholder}
        </div>
      )}
      {error && (
        <p style={{
          fontSize: '11px',
          color: '#DC2626',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}