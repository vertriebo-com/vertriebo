import { Building2, Shield, Home, Package, Hammer, Laptop, Leaf, Truck } from "lucide-react";

const INDUSTRIES = [
  { icon: Building2, name: "Gebäudereinigung", color: "text-blue-600" },
  { icon: Shield, name: "Sicherheitsdienst", color: "text-slate-600" },
  { icon: Home, name: "Hausmeisterdienste", color: "text-blue-600" },
  { icon: Package, name: "Entrümpelung", color: "text-slate-600" },
  { icon: Hammer, name: "Handwerksbetriebe", color: "text-blue-600" },
  { icon: Laptop, name: "IT-Service", color: "text-slate-600" },
  { icon: Leaf, name: "Gartenbau", color: "text-blue-600" },
  { icon: Truck, name: "Spedition / Logistik", color: "text-slate-600" },
];

export default function TargetIndustries() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-20">
      <h2 className="text-3xl font-bold text-center mb-4 text-slate-900">Für lokale Dienstleister</h2>
      <p className="text-center text-slate-600 mb-12 max-w-2xl mx-auto">
        Vertriebo wurde von Vertriebsprofis für Dienstleister entwickelt.
      </p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {INDUSTRIES.map(ind => {
          const Icon = ind.icon;
          return (
            <div key={ind.name} className="flex flex-col items-center gap-3 p-6 rounded-xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center border border-slate-200">
                <Icon className={`w-6 h-6 ${ind.color}`} />
              </div>
              <span className="text-sm font-semibold text-slate-900 text-center">{ind.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}