import { useSyncExternalStore } from 'react';
import type { SectionId, TimePreference } from '../types';

export interface UIState {
  section: SectionId;
  timePreference: TimePreference;
  blueprint: boolean;
  exploded: boolean;
  activeProjectId: string;
  activePinId: string;
  selectedFloor: number | null; // floorNumber selected in 3D / list
  savedHomes: string[]; // `${projectId}:${floorNumber}`
  modalFloor: { projectId: string; floorNumber: number } | null;
  hoverTip: { x: number; y: number; label: string; sub: string } | null;
  quality: 'high' | 'medium' | 'low';
  sceneReady: boolean;
}

const STORAGE_KEY = 'vs-saved-homes-v1';

function loadSaved(): string[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

class Store {
  private state: UIState = {
    section: 'hero',
    timePreference: 'auto',
    blueprint: false,
    exploded: true,
    activeProjectId: 'spire',
    activePinId: 'marina',
    selectedFloor: null,
    savedHomes: typeof window !== 'undefined' ? loadSaved() : [],
    modalFloor: null,
    hoverTip: null,
    quality: 'high',
    sceneReady: false,
  };
  private listeners = new Set<() => void>();

  get = (): UIState => this.state;

  set = (partial: Partial<UIState>) => {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l());
  };

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  toggleSaved(projectId: string, floorNumber: number) {
    const key = `${projectId}:${floorNumber}`;
    const saved = this.state.savedHomes.includes(key)
      ? this.state.savedHomes.filter((k) => k !== key)
      : [...this.state.savedHomes, key];
    this.set({ savedHomes: saved });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* private mode */
    }
  }

  isSaved(projectId: string, floorNumber: number): boolean {
    return this.state.savedHomes.includes(`${projectId}:${floorNumber}`);
  }
}

export const store = new Store();

export function useUI<T>(selector: (s: UIState) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get())
  );
}
