/**
 * use-debounce.ts — Primitive debounce hook
 *
 * Standalone utility. Accepts a value and delay, returns the debounced value.
 * No TanStack Query involvement. Used by use-search and anything else
 * that needs to defer expensive operations until input settles.
 *
 * Usage:
 *   const debouncedQuery = useDebounce(rawInput, 400)
 */

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clear timer if value changes before delay expires
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
