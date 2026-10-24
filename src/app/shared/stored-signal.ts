import { WritableSignal, effect, signal } from '@angular/core';

/**
 * A signal remembered in this browser (localStorage), e.g. a layout choice.
 * Falls back to `initial` when nothing valid is stored or storage is unavailable.
 * Call it from a component or service field, as it registers an effect.
 */
export function storedSignal<T extends string>(
  key: string,
  initial: T,
  allowed: readonly T[],
): WritableSignal<T> {
  const value = signal(readStored(key, allowed) ?? initial);
  effect(() => {
    try {
      localStorage.setItem(key, value());
    } catch {
      // Storage blocked (private mode): the choice just isn't remembered.
    }
  });
  return value;
}

function readStored<T extends string>(key: string, allowed: readonly T[]): T | null {
  try {
    const stored = localStorage.getItem(key) as T | null;
    return stored !== null && allowed.includes(stored) ? stored : null;
  } catch {
    return null;
  }
}
