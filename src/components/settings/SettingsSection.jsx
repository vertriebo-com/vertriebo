export default function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-blue-600" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {description && <p className="text-xs font-medium text-slate-600 mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-5 py-5">
        {children}
      </div>
    </div>
  );
}