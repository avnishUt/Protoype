import { useCallback, useEffect, useState } from 'react';
import { useSpeech } from '../lib/useSpeech.js';

export const SAMPLES = [
  'Date today. Round 1, time 10:30, chlorine zero, turbidity 0.18, pH 6.8, TDS 410',
  'Round 2 time 2:30 pm turbidity point four, p h six point five, TDS four hundred twenty',
  'Total hardness 85, calcium hardness 60, chlorides 120, iron 0.05',
  'Round 1 pH 7.2, no sorry 7.4',
];

export function VoiceDock({ engine, disabled, onTranscript, onToast }) {
  const [lang, setLang] = useState('en-IN');
  const [typed, setTyped] = useState('');
  const [shown, setShown] = useState(null); // last transcript sent

  const onDone = useCallback(
    (text) => {
      if (text) {
        setShown(text);
        onTranscript(text);
      } else {
        onToast("Didn't catch anything. Hold the mic while you speak.");
      }
    },
    [onTranscript, onToast],
  );
  const onError = useCallback(
    (err) => {
      if (err === 'unsupported') onToast('Speech recognition needs Chrome or Edge. You can type below instead.');
      else if (err === 'not-allowed') onToast('Microphone permission was denied.');
      else onToast(`Speech error: ${err}`);
    },
    [onToast],
  );
  const speech = useSpeech({ lang, onDone, onError });

  // Hold Space to talk (outside inputs and dialogs).
  useEffect(() => {
    let down = false;
    const kd = (e) => {
      if (e.code !== 'Space' || down || e.repeat || disabled) return;
      if (e.target.closest('input, select, textarea, dialog, button')) return;
      e.preventDefault();
      down = true;
      speech.start();
    };
    const ku = (e) => {
      if (e.code !== 'Space' || !down) return;
      down = false;
      speech.stop();
    };
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [speech, disabled]);

  const send = (text) => {
    setShown(text);
    onTranscript(text);
  };

  let live = <span className="hint">Hold the mic<span className="desktop-only"> (or hold <kbd>Space</kbd>)</span> and speak the readings</span>;
  if (speech.listening) {
    live =
      speech.finalText || speech.interim ? (
        <>
          {speech.finalText} <span className="interim">{speech.interim}</span>
        </>
      ) : (
        <span className="hint">Listening… speak the readings</span>
      );
  } else if (shown) {
    live = shown;
  }

  const isClaude = engine?.kind === 'claude';

  return (
    <div className="dock">
      <div className="dock-inner">
        <button
          className={`mic${speech.listening ? ' listening' : ''}`}
          type="button"
          aria-label="Hold to speak"
          disabled={disabled}
          onPointerDown={(e) => {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
            speech.start();
          }}
          onPointerUp={speech.stop}
          onPointerCancel={speech.stop}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
            <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" fill="none" />
          </svg>
          <span className="ring" />
        </button>
        <div className="dock-main">
          <div className="dock-row">
            <div className="live">{live}</div>
          </div>
          <div className="dock-row dock-tools">
            <form
              className="type-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (typed.trim() && !disabled) send(typed.trim());
                setTyped('');
              }}
            >
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder="…or type what you'd say, e.g. round 2 time 14:30 turbidity 0.4 pH 6.5"
                autoComplete="off"
              />
              <button className="btn btn-outline" type="submit">
                Send
              </button>
            </form>
            <select value={lang} onChange={(e) => setLang(e.target.value)} title="Speech language">
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">Hindi / Hinglish</option>
              <option value="en-US">English (US)</option>
            </select>
            <span
              className={`engine${isClaude ? '' : ' local'}`}
              title={isClaude ? 'Claude maps the transcript onto this form' : 'No API key configured: a keyword parser stands in for the AI'}
            >
              {isClaude ? `AI: Claude · ${engine.model}` : 'Offline demo parser'}
            </span>
          </div>
          <div className="samples">
            <span className="label">Try:</span>
            {SAMPLES.map((s) => (
              <button key={s} type="button" disabled={disabled} onClick={() => send(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
