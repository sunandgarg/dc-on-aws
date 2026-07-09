import logo from "@/assets/dekhocampus-logo.png";

export function DekhoLogoInline({ className = "h-3.5" }: { className?: string }) {
  return <img src={logo} alt="DekhoCampus" className={`inline-block align-middle ${className}`} />;
}
