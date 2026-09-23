import { useEffect, useRef, useState } from "react";
import type { AreaSearchResult } from "../map/googleMapsAdapter";

export function CitySearch({ search, onSelect, onLocate, locating }: { search: (query: string) => Promise<AreaSearchResult[]>; onSelect: (area: AreaSearchResult) => Promise<void> | undefined; onLocate: () => void; locating: boolean }) {
  const [selecting, setSelecting] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AreaSearchResult[]>([]);
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [retry, setRetry] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    if (open && active >= 0) document.getElementById(`finder-city-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  useEffect(() => {
    setResults([]);
    setActive(-1);
    if (!open || query.trim().length < 2) { setStatus(""); return; }
    let cancelled = false;
    setStatus("Searching...");
    const timer = window.setTimeout(() => {
      searchRef.current(query.trim()).then(matches => {
        if (cancelled) return;
        setResults(matches);
        setStatus(matches.length ? `${matches.length} ${matches.length === 1 ? "location" : "locations"} found` : "No locations found. Try adding a country or region.");
      }).catch(() => { if (!cancelled) setStatus("Search unavailable. Please try again."); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [query, open, retry]);

  const select = async (area: AreaSearchResult) => {
    if (selecting) return;
    setSelecting(true);
    setStatus("Opening location...");
    try {
      await onSelect(area);
      setQuery(area.label);
      setOpen(false);
      setStatus("");
    } catch {
      setStatus("Could not open this location. Select it to try again.");
    } finally {
      setSelecting(false);
      input.current?.focus();
    }
  };

  return <div className="finder-city-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor="finder-city">Search a location</label>
    <div className="finder-city-input">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      <input ref={input} id="finder-city" type="text" role="combobox" autoComplete="off" placeholder="Country, city, locality or postcode" value={query} readOnly={selecting} aria-busy={selecting}
        aria-autocomplete="list" aria-expanded={open && results.length > 0} aria-controls="finder-city-results" aria-describedby="finder-city-status"
        aria-activedescendant={open && active >= 0 ? `finder-city-option-${active}` : undefined}
        onChange={event => { setQuery(event.target.value); setOpen(true); setResults([]); setActive(-1); }}
        onClick={() => { if (!selecting) setOpen(true); }}
        onKeyDown={event => {
          if (selecting) return;
          if (event.key === "Escape") { setOpen(false); return; }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); setOpen(true);
            if (results.length) setActive(value => event.key === "ArrowDown" ? (value + 1) % results.length : (value <= 0 ? results.length - 1 : value - 1));
          }
          if (event.key === "Enter") { event.preventDefault(); if (open && results.length) select(results[active >= 0 ? active : 0]); else { setOpen(true); setRetry(value => value + 1); } }
        }} />
      {query && <button className="finder-city-clear" type="button" disabled={selecting} aria-label="Clear location search" onClick={() => { setQuery(""); setOpen(true); input.current?.focus(); }}>&times;</button>}
    </div>
    <ul id="finder-city-results" role="listbox" aria-label="Locations" hidden={!open || !results.length}>
      {results.map((area, index) => <li key={area.id} id={`finder-city-option-${index}`} role="option" aria-selected={active === index} onMouseDown={event => event.preventDefault()} onMouseMove={() => setActive(index)} onClick={() => select(area)}>{area.label}</li>)}
    </ul>
    <p id="finder-city-status" role="status" hidden={!open || !status}>{open ? status : ""}</p>
    {open && status.startsWith("Search unavailable") && <button className="finder-city-retry" type="button" onClick={() => setRetry(value => value + 1)}>Retry search</button>}
    <div className="finder-city-location">
      <button className="cta-action cta-action--blue finder-locate" type="button" onClick={() => { setOpen(false); onLocate(); }} disabled={locating} aria-busy={locating}>
        <span>{locating ? "Locating..." : "Find my location"}</span>
      </button>
    </div>
  </div>;
}
