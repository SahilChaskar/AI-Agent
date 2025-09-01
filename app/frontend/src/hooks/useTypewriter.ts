import { useEffect, useRef, useState } from "react";

/**
 * ChatGPT-like typewriter:
 * - Streams towards the latest target text (doesn't reset when text grows)
 * - Starts only when `enabled` flips true (last, streaming message)
 * - Keeps typing even if `enabled` becomes false, until it fully catches up and `done` is true
 * - On non-streaming (old) messages, shows full text immediately
 */
export default function useTypewriter(
  targetText: string,
  enabled: boolean,
  done: boolean,
  cps: number = 60 // characters per second
) {
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);

  const targetRef = useRef<string>(targetText);
  const typedCountRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const cpsRef = useRef<number>(cps);

  // Always keep target up to date without restarting animation
  useEffect(() => {
    targetRef.current = targetText || "";
  }, [targetText]);

  // Start typing when enabled flips true
  useEffect(() => {
    if (enabled && !typing) {
      // begin from current typed count (fresh message => 0)
      setTyping(true);
      // do not reset typedCountRef here; preserves progress when chunks arrive mid-anim
    }
    // If not enabled and not typing (i.e., old message), show full text immediately
    if (!enabled && !typing) {
      const tgt = targetRef.current;
      typedCountRef.current = tgt.length;
      setText(tgt);
    }
  }, [enabled, typing]);

  // Animation loop
  useEffect(() => {
    if (!typing) return;

    const loop = (ts: number) => {
      const tgt = targetRef.current;
      const typed = typedCountRef.current;

      // time delta
      const last = lastTsRef.current ?? ts;
      const dt = (ts - last) / 1000; // seconds
      lastTsRef.current = ts;

      // how many chars to add this frame
      const add = Math.max(1, Math.floor(dt * cpsRef.current));
      const nextCount = Math.min(tgt.length, typed + add);

      if (nextCount !== typed) {
        typedCountRef.current = nextCount;
        setText(tgt.slice(0, nextCount));
      }

      // stop only when we've fully caught up AND stream is done
      const fullyCaughtUp = nextCount >= tgt.length;
      if (fullyCaughtUp && done) {
        setTyping(false);
        lastTsRef.current = null;
        rafRef.current = null;
        return;
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [typing, done]);

  // If CPS prop changes, update without restarting
  useEffect(() => {
    cpsRef.current = cps;
  }, [cps]);

  return { text, typing };
}
