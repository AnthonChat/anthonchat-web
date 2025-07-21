"use client";

import { useState, useEffect, useCallback } from "react";
import { hookLogger } from "@/lib/utils/loggers";

type SetValue<T> = T | ((val: T) => T);

/**
 * Type-safe localStorage hook with SSR support
 * @param key - The localStorage key
 * @param initialValue - The initial value or a function that returns the initial value
 * @returns A tuple with the current value and a setter function
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, (value: SetValue<T>) => void, () => void] {
  // State to store our value
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") {
      return typeof initialValue === "function" 
        ? (initialValue as () => T)() 
        : initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        const value = typeof initialValue === "function" 
          ? (initialValue as () => T)() 
          : initialValue;
        window.localStorage.setItem(key, JSON.stringify(value));
        return value;
      }
      return JSON.parse(item);
    } catch (error) {
      hookLogger.warn('LOCALSTORAGE_READ_ERROR', 'LOCAL_STORAGE', { key, error });
      return typeof initialValue === "function" 
        ? (initialValue as () => T)() 
        : initialValue;
    }
  });

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback((value: SetValue<T>) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      // Save state
      setStoredValue(valueToStore);
      
      // Save to local storage
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      hookLogger.warn('LOCALSTORAGE_SET_ERROR', 'LOCAL_STORAGE', { key, error });
    }
  }, [key, storedValue]);

  // Function to remove the item from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(key);
      }
      const resetValue = typeof initialValue === "function" 
        ? (initialValue as () => T)() 
        : initialValue;
      setStoredValue(resetValue);
    } catch (error) {
      hookLogger.warn('LOCALSTORAGE_REMOVE_ERROR', 'LOCAL_STORAGE', { key, error });
    }
  }, [key, initialValue]);

  // Listen for changes to the localStorage key from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          hookLogger.warn('LOCALSTORAGE_PARSE_ERROR', 'LOCAL_STORAGE', { key, error });
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for managing boolean values in localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial boolean value
 * @returns A tuple with the current value, setter, and remover functions
 */
export function useLocalStorageBoolean(
  key: string,
  initialValue: boolean = false
): [boolean, (value: boolean) => void, () => void] {
  return useLocalStorage<boolean>(key, initialValue);
}

/**
 * Hook for managing string values in localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial string value
 * @returns A tuple with the current value, setter, and remover functions
 */
export function useLocalStorageString(
  key: string,
  initialValue: string = ""
): [string, (value: string) => void, () => void] {
  return useLocalStorage<string>(key, initialValue);
}

/**
 * Hook for managing number values in localStorage
 * @param key - The localStorage key
 * @param initialValue - The initial number value
 * @returns A tuple with the current value, setter, and remover functions
 */
export function useLocalStorageNumber(
  key: string,
  initialValue: number = 0
): [number, (value: number) => void, () => void] {
  return useLocalStorage<number>(key, initialValue);
}