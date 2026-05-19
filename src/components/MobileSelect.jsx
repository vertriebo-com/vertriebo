/**
 * MobileSelect – On mobile shows a bottom-sheet Drawer, on desktop falls back
 * to the standard shadcn Select. Props match Select: value, onValueChange, options [{value, label}], placeholder, className.
 */
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Check } from "lucide-react";

function useIsMobile() {
  return typeof window !== "undefined" && window.innerWidth < 1024;
}

export default function MobileSelect({ value, onValueChange, options = [], placeholder, className, triggerClassName }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const selectedLabel = options.find(o => o.value === value)?.label ?? value ?? placeholder ?? "Auswählen";

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName ?? className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(o => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm text-left ${triggerClassName ?? className ?? ""}`}
      >
        <span className={value ? "text-slate-900" : "text-slate-500"}>{selectedLabel}</span>
        <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{placeholder ?? "Auswählen"}</DrawerTitle>
          </DrawerHeader>
          <div className="pb-6 px-4 space-y-1">
            {options.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onValueChange(o.value); setOpen(false); }}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium text-slate-900 hover:bg-slate-100 active:bg-slate-200 transition-colors"
              >
                {o.label}
                {value === o.value && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}