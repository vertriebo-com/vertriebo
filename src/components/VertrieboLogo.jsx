export default function VertrieboLogo({ size = "default", className = "" }) {
  const sizes = {
    sm: "h-8 w-auto",
    md: "h-12 w-auto",
    default: "h-10 w-auto",
    lg: "h-28 w-auto",
    xl: "h-36 w-auto"
  };

  return (
    <svg
      viewBox="0 0 1000 1000"
      className={`${sizes[size] || sizes.default} ${className}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: "block" }}>
      
      {/* Gradient Definitions */}
      <defs>
        <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#C9A46A" />
        </linearGradient>
        <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E8E8E8" />
          <stop offset="100%" stopColor="#C0C0C0" />
        </linearGradient>
      </defs>
      
      {/* Gold V - Larger and clearer */}
      <path
        d="M 280 250 L 420 650 L 360 650 L 310 500 L 260 650 L 200 650 L 340 250 Z"
        fill="url(#goldGradient)"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
      
      {/* Silver O - Better visibility */}
      <circle 
        cx="580" 
        cy="450" 
        r="140" 
        fill="none" 
        stroke="url(#silverGradient)" 
        strokeWidth="70"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />

      {/* Text VERTRIEBO - Bold and clear */}
      <text
        x="500"
        y="820"
        fontSize="180"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
        fill="#FFFFFF"
        letterSpacing="12"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}>
        VERTRIEBO
      </text>

      {/* Gold O at end - Accent */}
      <circle 
        cx="850" 
        cy="800" 
        r="30" 
        fill="none" 
        stroke="url(#goldGradient)" 
        strokeWidth="18"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
    </svg>
  );
}