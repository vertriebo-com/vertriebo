export default function VertrieboLogo({ size = "default", variant = "dark", className = "" }) {
  const sizes = {
    sm: "h-6 w-auto",
    md: "h-10 w-auto",
    default: "h-8 w-auto",
    lg: "h-24 w-auto",
    xl: "h-32 w-auto"
  };

  const logos = {
    dark: "https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/76f46b4fa_ChatGPTImage18Mai202615_39_07.png",
    light: "https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/8e6400f40_ChatGPTImage18Mai202615_39_07.png",
    outline: "https://media.base44.com/images/public/69d8fb5b8dde510755b29a7e/866461c50_ChatGPTImage18Mai202615_39_07.png"
  };

  return (
    <div className={`${sizes[size] || sizes.default} ${className}`} style={{ display: "flex", alignItems: "center" }}>
      <img 
        src={logos[variant] || logos.dark}
        alt="Vertriebo Logo" 
        className="w-full h-full object-contain"
        style={{ display: "block" }}
      />
    </div>
  );
}