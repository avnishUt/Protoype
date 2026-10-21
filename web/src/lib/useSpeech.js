import { useCallback, useRef, useState } from 'react';

const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

/**
 * Push-to-talk speech recognition (browser Web Speech API, Chrome/Edge).
 * start() on press, stop() on release; onDone(transcript) fires once the
 * recogniser has flushed its final result.
 */
export function useSpeech({ lang, onDone, onError }) {
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const rec = useRef(null);
  const latest = useRef({ final: '', interim: '' });

  const start = useCallback(() => {
    if (!SR) return onError?.('unsupported');
    if (rec.current) return;
    const r = new SR();
    r.lang = lang;
    r.continuous = true;
    r.interimResults = true;
    latest.current = { final: '', interim: '' };
    setFinalText('');
    setInterim('');
    r.onresult = (e) => {
      let f = '';
      let i = '';
      for (const res of e.results) {
        if (res.isFinal) f += res[0].transcript + ' ';
        else i += res[0].transcript;
      }
      latest.current = { final: f, interim: i };
      setFinalText(f);
      setInterim(i);
    };
    r.onerror = (e) => {
      if (e.error !== 'aborted' && e.error !== 'no-speech') onError?.(e.error);
    };
    r.onend = () => {
      rec.current = null;
      setListening(false);
      onDone?.(`${latest.current.final} ${latest.current.interim}`.trim());
    };
    r.start();
    rec.current = r;
    setListening(true);
  }, [lang, onDone, onError]);

  const stop = useCallback(() => rec.current?.stop(), []);

  return { supported: Boolean(SR), listening, finalText, interim, start, stop };
}
