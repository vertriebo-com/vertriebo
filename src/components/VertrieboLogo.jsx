export default function VertrieboLogo({ size = "default", className = "" }) {
  const sizes = {
    sm: "h-6 w-auto",
    md: "h-10 w-auto",
    default: "h-8 w-auto",
    lg: "h-24 w-auto",
    xl: "h-32 w-auto"
  };

  // Placeholder bis echtes Logo-Bild vorhanden
  return (
    <div className={`${sizes[size] || sizes.default} ${className}`} style={{ display: "flex", alignItems: "center" }}>
      <img 
        src="/logo.png" 
        alt="Vertriebo Logo" 
        className="w-full h-full object-contain"
        style={{ display: "block" }}
      />
    </div>
  );
}