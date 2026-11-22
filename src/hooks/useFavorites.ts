import { useEffect, useRef, useState } from "react";
import { cloneFavoriteTabs, type FavoriteItem, type FavoriteTab } from "../data/favoritesTabs";

const STORAGE_KEY = "mt.favorites.v1";

type StoredFavorites = {
  version: 1;
  activeId: string;
  tabs: FavoriteTab[];
};

function defaults(): StoredFavorites {
  return { version: 1, activeId: "algebra", tabs: cloneFavoriteTabs() };
}

function readStored(): StoredFavorites {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw) as StoredFavorites;
    const ids = new Set(parsed.tabs?.map((tab) => tab.id));
    const complete = cloneFavoriteTabs().every((tab) => ids.has(tab.id));
    if (parsed.version !== 1 || !complete) return defaults();
    return parsed;
  } catch {
    return defaults();
  }
}

export function useFavorites() {
  const [state, setState] = useState<StoredFavorites>(defaults);
  const skipWrite = useRef(true);

  useEffect(() => {
    setState(readStored());
  }, []);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addToActive = (latex: string) => {
    const trimmed = latex.trim();
    if (!trimmed) return;
    const item: FavoriteItem = { id: `fav-${Date.now()}`, latex: trimmed, size: "large" };
    setState((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === current.activeId ? { ...tab, items: [...tab.items, item] } : tab,
      ),
    }));
  };

  const removeItem = (id: string) => {
    setState((current) => ({
      ...current,
      tabs: current.tabs.map((tab) =>
        tab.id === current.activeId
          ? { ...tab, items: tab.items.filter((item) => item.id !== id) }
          : tab,
      ),
    }));
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(defaults());
  };

  return {
    tabs: state.tabs,
    activeId: state.activeId,
    setActiveId: (activeId: string) => setState((current) => ({ ...current, activeId })),
    addToActive,
    removeItem,
    reset,
  };
}
