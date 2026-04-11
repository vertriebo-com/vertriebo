import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import StatusBadge from "../components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Fix leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLORS = {
  "Neu": "#3b82f6", "Kontakt": "#06b6d4", "Rückruf": "#f59e0b",
  "Termin": "#8b5cf6", "Angebot": "#f97316", "Gewonnen": "#10b981", "Verloren": "#ef4444",
};

function createColoredIcon(color, isHot) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:${isHot ? 18 : 14}px;height:${isHot ? 18 : 14}px;
      background:${color};border:2px solid white;border-radius:50%;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
      ${isHot ? "outline:2px solid #f97316;outline-offset:2px;" : ""}
    "></div>`,
    iconSize: [isHot ? 18 : 14, isHot ? 18 : 14],
    iconAnchor: [isHot ? 9 : 7, isHot ? 9 : 7],
  });
}

const NEUWIED = [50.4265, 7.4620];
const STATUSES = ["Alle", "Neu", "Kontakt", "Rückruf", "Termin", "Angebot", "Gewonnen", "Verloren"];

export default function MapView() {
  const [companies, setCompanies] = useState([]);
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([base44.auth.me(), base44.entities.Company.list("-created_date", 500)])
      .then(([me, comps]) => {
        setUser(me);
        setCompanies(comps);
        setLoading(false);
      });
  }, []);

  const isAdmin = user?.role === "admin";
  const filtered = companies.filter(c => {
    if (!isAdmin && c.assigned_to && c.assigned_to !== user?.email) return false;
    if (!c.latitude || !c.longitude) return false;
    if (statusFilter !== "Alle" && c.status !== statusFilter) return false;
    return true;
  });

  const withCoords = filtered.length;
  const total = companies.filter(c => !isAdmin ? (!c.assigned_to || c.assigned_to === user?.email) : true).length;

  return (
    <div className="space-y-4 flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Karte</h1>
          <p className="text-sm text-muted-foreground">{withCoords} von {total} Leads mit Koordinaten</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-white shadow" style={{ background: color }} />
            <span className="text-muted-foreground">{status}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-orange-500" style={{ background: "#f97316" }} />
          <span className="text-muted-foreground">🔥 Heiß</span>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: "600px" }}>
        {!loading && (
          <MapContainer center={NEUWIED} zoom={11} style={{ height: "600px", width: "100%" }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {/* Neuwied center marker */}
            <Marker position={NEUWIED} icon={L.divIcon({
              className: "",
              html: `<div style="width:20px;height:20px;background:#1e40af;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:10px;">⭐</div>`,
              iconSize: [20, 20], iconAnchor: [10, 10],
            })}>
              <Popup><strong>Neuwied</strong><br />Zentrum (40 km Radius)</Popup>
            </Marker>

            {filtered.map(company => (
              <Marker
                key={company.id}
                position={[company.latitude, company.longitude]}
                icon={createColoredIcon(STATUS_COLORS[company.status] || "#94a3b8", company.is_hot)}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <p className="font-semibold text-sm">{company.name}</p>
                    <p className="text-xs text-gray-500">{company.branche}</p>
                    <p className="text-xs text-gray-500">{company.ort} · {company.entfernung_km} km</p>
                    {company.telefon && <p className="text-xs mt-1">📞 {company.telefon}</p>}
                    <div className="mt-2">
                      <a href={`/leads/${company.id}`} className="text-xs text-blue-600 underline">Detail öffnen →</a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>
    </div>
  );
}