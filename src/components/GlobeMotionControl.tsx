import { useSyncExternalStore } from "react";
let paused = false;
const listeners = new Set<() => void>();
export const isGlobePaused = () => paused;
export const subscribeGlobeMotion = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
export function GlobeMotionControl() {
  const value = useSyncExternalStore(subscribeGlobeMotion, isGlobePaused);
  return <button type="button" className="globe-motion-control" aria-pressed={value} onClick={() => { paused = !paused; listeners.forEach(listener => listener()); }}>{value ? "Resume globes" : "Pause globes"}</button>;
}
