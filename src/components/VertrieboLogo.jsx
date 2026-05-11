export default function VertrieboLogo({ size = "default", className = "" }) {
  const sizes = {
    sm: "h-6 w-auto",
    default: "h-8 w-auto",
    lg: "h-24 w-auto",
    xl: "h-32 w-auto"
  };

  return (
    <svg
      viewBox="0 0 1000 1000"
      className={`h-25 w-10${sizes[size]} ${className}`}
      preserveAspectRatio="xMidYMid meet">
      
      {/* Gold V */}
      <path
        d="M 250 200 L 400 600 L 350 600 L 200 200 Z M 350 200 L 500 600 L 450 600 L 300 200 Z"
        fill="#D4A574"
        shapeRendering="crispEdges" />
      

      {/* Silver O */}
      <circle cx="600" cy="400" r="150" fill="none" stroke="#D0D0D0" strokeWidth="80" />

      {/* Text VERTRIEBO */}
      <text
        x="500"
        y="800"
        fontSize="200"
        fontWeight="bold"
        fontFamily="Inter, sans-serif"
        textAnchor="middle"
        fill="#1A1A1A"
        letterSpacing="8">
        
        VERTRIEBO
      </text>

      {/* Gold O at end */}
      <circle cx="850" cy="780" r="35" fill="none" stroke="#D4A574" strokeWidth="20" />
    </svg>);

}