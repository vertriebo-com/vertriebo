import { Building2, Shield, Home, Package, Hammer, Laptop, Leaf, Truck } from "lucide-react";

const INDUSTRIES = [
  { icon: Building2, name: "Gebäudereinigung" },
  { icon: Shield, name: "Sicherheitsdienst" },
  { icon: Home, name: "Hausmeisterdienste" },
  { icon: Package, name: "Entrümpelung" },
  { icon: Hammer, name: "Handwerk" },
  { icon: Laptop, name: "IT-Service" },
  { icon: Leaf, name: "Gartenbau" },
  { icon: Truck, name: "Logistik" },
];

export default function TargetIndustriesCompact() {
  return (
    <div className="bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Für lokale Dienstleister</h2>
          <p className="text-sm text-slate-600">
            Vertriebo wurde von Vertriebsprofis entwickelt – für Betriebe, die aktiv neue Firmenkunden gewinnen wollen.
          </p>
        </div>
        
        {/* Kompakte Tag-Liste */}
        <div className="flex flex-wrap justify-center gap-3">
          {INDUSTRIES.map(ind => {
            const Icon = ind.icon;
            return (
              <div key={ind.name} className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200">
                <Icon className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-slate-700">{ind.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}