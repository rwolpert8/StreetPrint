"use client";

import { useRef } from "react";
import { FEEDBACK, MAX_GUESSES, type Feedback } from "@/lib/game";

export function HowToPlay() {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef("");

  return <>
    <button className="help-button" type="button" onClick={() => {
      previousOverflow.current = document.body.style.overflow;
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    }}>How to play <span aria-hidden="true">?</span></button>
    <dialog ref={dialog} className="instructions-dialog" aria-labelledby="instructions-title"
      onClose={() => { document.body.style.overflow = previousOverflow.current; }}
      onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="dialog-content">
        <div className="dialog-heading"><h2 id="instructions-title"><span aria-hidden="true">🌍</span> How to play</h2><button autoFocus type="button" aria-label="Close how to play" className="close-dialog" onClick={() => dialog.current?.close()}>×</button></div>
        <p>Identify the city from its street map. You have <strong>{MAX_GUESSES} guesses</strong>.</p>
        <ol className="instructions-steps"><li>Explore the map. North is up; water is light blue. Use the zoom controls for a closer look.</li><li>Type a city name, select a result, and press <strong>Submit guess</strong>.</li><li>Use the feedback to narrow down your next guess.</li></ol>
        <h3>What the colors mean</h3>
        <ul className="feedback-key">{(["different", "continent", "country", "correct"] as Feedback[]).map((feedback) => <li key={feedback}><span className={`key-swatch ${feedback}`} aria-hidden="true" /><div><strong>{FEEDBACK[feedback].label}</strong><p>{FEEDBACK[feedback].description}</p></div></li>)}</ul>
        <div className="direction-explainer"><h3><span aria-hidden="true">🧭</span> Distance & direction</h3><p><strong>850 km · NE ↗</strong> means the answer is about 850 km northeast of your guessed city. Distances are straight-line estimates between city reference points, not driving distances. Switch between km and mi above your guess history.</p></div>
        <p className="rules-note">A city can only be guessed once. Find the correct city to win; after six incorrect guesses, the answer is revealed. This preview has one practice puzzle and a 44-city search list. Refreshing starts a new round.</p>
        <button className="primary-button" type="button" onClick={() => dialog.current?.close()}>Got it</button>
      </div>
    </dialog>
  </>;
}
