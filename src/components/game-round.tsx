"use client";

import { useEffect, useRef, useState } from "react";
import type { City } from "@/data/cities";
import { puzzle } from "@/data/puzzle";
import { cityLabel } from "@/lib/city-search";
import { emptyRound, FEEDBACK, formatDistance, geography, judge, MAX_GUESSES, submitGuess, type Round, type Units } from "@/lib/game";
import { CitySearch } from "./city-search";

export function GameRound() {
  const [round, setRound] = useState<Round>(emptyRound);
  const [selected, setSelected] = useState<City | null>(null);
  const [units, setUnits] = useState<Units>("km");
  const [session, setSession] = useState(0);
  const outcome = useRef<HTMLDivElement>(null);
  const complete = round.status !== "playing";
  const duplicate = selected && round.guesses.some((guess) => guess.id === selected.id);
  const lastGuess = round.guesses.at(-1);

  useEffect(() => {
    try { if (localStorage.getItem("streetprint-units") === "mi") setUnits("mi"); } catch { /* Storage can be unavailable in private browsing. */ }
  }, []);
  useEffect(() => { if (complete) outcome.current?.focus(); }, [complete]);

  function changeUnits(next: Units) {
    setUnits(next);
    try { localStorage.setItem("streetprint-units", next); } catch { /* The switch still works for this visit. */ }
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!selected || duplicate || complete) return;
    setRound((previous) => submitGuess(previous, selected, puzzle.target));
    setSelected(null);
  }

  const announcement = lastGuess ? `${cityLabel(lastGuess)}: ${FEEDBACK[judge(lastGuess, puzzle.target)].label}. ${lastGuess.id === puzzle.target.id ? "You found the city!" : `${formatDistance(geography(lastGuess, puzzle.target).distanceKm, units)}. Target direction ${geography(lastGuess, puzzle.target).direction ?? "unavailable"}. ${MAX_GUESSES - round.guesses.length} guesses remaining.`}` : "";

  return <section className="search-panel" aria-labelledby="guess-heading">
    <div className="round-heading"><h2 id="guess-heading">Guess the city</h2><span className="attempt-count">{round.guesses.length} / {MAX_GUESSES}</span></div>
    <p className="panel-intro">Select a city and submit your guess.</p>
    <div className="attempt-dots" aria-label={`${MAX_GUESSES - round.guesses.length} guesses remaining`}>
      {Array.from({length: MAX_GUESSES}, (_, index) => <span key={index} className={round.guesses[index] ? `attempt used ${judge(round.guesses[index], puzzle.target)}` : "attempt"}>{index + 1}</span>)}
    </div>

    {!complete ? <form onSubmit={submit}>
      <CitySearch key={`${session}-${round.guesses.length}`} selected={selected} onSelect={setSelected} autoFocus={round.guesses.length > 0 || session > 0} />
      {duplicate && <p className="duplicate-note" role="status">You already guessed {selected.name}. Choose a different city.</p>}
      <button className="primary-button" type="submit" disabled={!selected || !!duplicate}>Submit guess <span aria-hidden="true">→</span></button>
    </form> : <div ref={outcome} tabIndex={-1} className={`round-result ${round.status === "won" ? "correct" : "finished"}`}>
      <h3>{round.status === "won" ? "You got it! 🎉" : "Out of guesses"}</h3>
      <p className="answer-name"><span className={`fi fi-${puzzle.target.countryCode}`} aria-hidden="true" />{cityLabel(puzzle.target)}</p>
      <p>{puzzle.reveal}</p>
      <button className="secondary-button" type="button" onClick={() => { setRound(emptyRound); setSelected(null); setSession((value) => value + 1); }}>Play again</button>
      <span className="replay-note">Replay this practice puzzle.</span>
    </div>}

    <div className="history-heading"><h3>Guesses</h3><div className="unit-toggle" role="group" aria-label="Distance units">
      <button type="button" aria-pressed={units === "km"} onClick={() => changeUnits("km")}>km</button>
      <button type="button" aria-pressed={units === "mi"} onClick={() => changeUnits("mi")}>mi</button>
    </div></div>
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    {round.guesses.length === 0 ? <p className="empty-history"><span aria-hidden="true">🧭</span>Your clues will appear here after each guess.</p> : <ol className="guess-list">
      {round.guesses.map((guess) => {
        const feedback = judge(guess, puzzle.target);
        const geo = geography(guess, puzzle.target);
        return <li key={guess.id} className={`guess-row ${feedback}`}>
          <div className="guess-city"><span className={`fi fi-${guess.countryCode}`} aria-hidden="true" /><div><strong>{guess.name}</strong><span>{[guess.region, guess.country].filter(Boolean).join(", ")}</span></div></div>
          <div className="guess-details"><span className={`feedback-badge ${feedback}`}>{FEEDBACK[feedback].label}</span>
            {feedback !== "correct" && <span className="distance-clue">{formatDistance(geo.distanceKm, units)} <span className="direction" aria-label={geo.direction ? `Target is ${geo.direction} from ${guess.name}` : "Direction unavailable"}><span aria-hidden="true">{geo.arrow ?? "—"}</span> {geo.direction}</span></span>}
          </div>
        </li>;
      })}
    </ol>}
    <p className="history-note">Distance and direction point from your guess toward the answer.</p>
  </section>;
}
