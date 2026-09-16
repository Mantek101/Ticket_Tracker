import { useEffect, useRef, useState } from "react";
import { IconPlus, IconUpload } from "./icons";

const LOGO_KEY = "citetrack.logo.v1";

export default function Header({ onNew }: { onNew: () => void }) {
  const [logo, setLogo] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LOGO_KEY);
    } catch {
      return null;
    }
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      if (logo) localStorage.setItem(LOGO_KEY, logo);
      else localStorage.removeItem(LOGO_KEY);
    } catch {
      /* noop */
    }
  }, [logo]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert("Logo must be under 500 KB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Logo area */}
        <div className="flex items-center gap-3">
          {logo ? (
            <div className="relative group">
              <img
                src={logo}
                alt="Company logo"
                className="h-10 w-auto max-w-[140px] object-contain"
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute inset-0 flex items-center justify-center rounded bg-navy/70 opacity-0 transition-opacity group-hover:opacity-100"
                title="Change logo"
              >
                <IconUpload width={14} height={14} className="text-white" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-10 items-center gap-2 rounded-md border-2 border-dashed border-border2 px-3 text-xs font-medium text-muted transition-colors hover:border-blue hover:text-blue"
              title="Upload your logo"
            >
              <IconUpload width={14} height={14} />
              <span className="hidden sm:inline">Upload logo</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
        </div>

        {/* Title */}
        <div className="hidden md:block">
          <h1 className="font-display text-lg font-bold text-navy">
            Ticket Tracker
          </h1>
          <p className="font-body text-xs text-muted">Ascent Logistics</p>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={onNew}
            className="flex items-center gap-2 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue2 active:translate-y-px"
          >
            <IconPlus width={16} height={16} strokeWidth={2.2} />
            <span className="hidden sm:inline">New Ticket</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>
    </header>
  );
}
