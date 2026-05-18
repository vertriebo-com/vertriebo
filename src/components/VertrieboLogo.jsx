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
      viewBox="0 0 1200 900"
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
      
      {/* Gold V - Left side */}
      <path
        d="M 180 200 L 320 600 L 260 600 L 210 450 L 160 600 L 100 600 L 240 200 Z"
        fill="url(#goldGradient)"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
      
      {/* Silver O - Middle left */}
      <circle 
        cx="480" 
        cy="400" 
        r="130" 
        fill="none" 
        stroke="url(#silverGradient)" 
        strokeWidth="65"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />

      {/* Text VERTRIEBO - Centered and bold */}
      <text
        x="600"
        y="780"
        fontSize="160"
        fontWeight="900"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
        fill="#FFFFFF"
        letterSpacing="10"
        style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}>
        VERTRIEBO
      </text>

      {/* Gold O at end - Right accent */}
      <circle 
        cx="1050" 
        cy="760" 
        r="28" 
        fill="none" 
        stroke="url(#goldGradient)" 
        strokeWidth="16"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
    </svg>
  );
}