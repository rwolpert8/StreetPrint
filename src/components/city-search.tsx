"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cities, type City } from "@/data/cities";
import { cityLabel, searchCities } from "@/lib/city-search";

function Flag({ city }: { city: City }) {
  return <span className={`fi fi-${city.countryCode} city-flag`} aria-hidden="true" />;
}

export function CitySearch({ selected, onSelect, autoFocus = false }: {
  selected: City | null;
  onSelect: (city: City | null) => void;
  autoFocus?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const results = searchCities(query);
  const showResults = open && query.trim().length > 0;
  const activeCity = showResults ? results[active] : undefined;

  useEffect(() => {
    list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(city: City) {
    onSelect(city);
    setQuery(cityLabel(city));
    setOpen(false);
    input.current?.focus();
  }

  return (
      <div className="search-field" onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}>
        <label htmlFor={id}>Search for a city</label>
        <div className={`input-wrap ${showResults ? "is-open" : ""}`}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
          <input ref={input} id={id} type="text" role="combobox" autoComplete="off" spellCheck={false} autoFocus={autoFocus}
            aria-autocomplete="list" aria-expanded={showResults} aria-controls={showResults ? `${id}-results` : undefined}
            aria-activedescendant={activeCity ? `${id}-${activeCity.id}` : undefined}
            aria-describedby={`${id}-hint`} placeholder="City name…" value={query}
            onFocus={() => { if (!selected) setOpen(true); }}
            onChange={(event) => { setQuery(event.target.value); onSelect(null); setOpen(true); setActive(0); }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                if (results.length) setActive((previous) => !showResults ? (event.key === "ArrowDown" ? 0 : results.length - 1)
                  : (previous + (event.key === "ArrowDown" ? 1 : -1) + results.length) % results.length);
              } else if (event.key === "Enter" && activeCity) {
                event.preventDefault(); choose(activeCity);
              } else if (event.key === "Enter" && !selected) {
                event.preventDefault();
              } else if (event.key === "Escape") {
                event.preventDefault(); setOpen(false);
              }
            }} />
          {query && <button className="clear-search" type="button" aria-label="Clear city search" onClick={() => {
            setQuery(""); onSelect(null); setActive(0); setOpen(true); input.current?.focus();
          }}>×</button>}
        </div>
        <p id={`${id}-hint`} className="field-hint">Type a name, then choose a city from the list.</p>
        <div className="sr-only" role="status" aria-live="polite">
          {showResults ? `${results.length} matching cities shown.` : selected ? `${cityLabel(selected)} selected.` : ""}
        </div>
        {showResults && <div className="suggestions">
          <ul id={`${id}-results`} ref={list} role="listbox" aria-label="Matching cities">
            {results.map((city, index) => <li key={city.id} id={`${id}-${city.id}`} role="option"
              aria-selected={index === active} className={index === active ? "active" : ""}
              onMouseDown={(event) => event.preventDefault()} onClick={() => choose(city)}
              onMouseMove={() => setActive(index)}>
              <Flag city={city} />
              <span className="city-text"><strong>{city.name}</strong><span>{[city.region, city.country].filter(Boolean).join(", ")}</span></span>
              <span className="option-arrow" aria-hidden="true">↵</span>
            </li>)}
          </ul>
          {results.length === 0 && <p className="no-results">No matching city in this preview. Try another name.</p>}
          <div className="results-caption">{cities.length} cities in this preview <span>↑ ↓ to explore · Enter to select</span></div>
        </div>}
      </div>

  );
}
