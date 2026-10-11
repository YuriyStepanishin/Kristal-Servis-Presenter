import { useEffect, useState } from "react";

const CACHE_NAME = "laska-presenter-v4";

export type OfflinePreloadState = {
  supported: boolean;
  done: number;
  total: number;
  failed: number;
  ready: boolean;
};

export function useOfflinePreload(files: string[]): OfflinePreloadState {
  const supported = typeof caches !== "undefined";
  const [done, setDone] = useState(0);
  const [failed, setFailed] = useState(0);
  const key = files.join("\n");

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const list = key ? key.split("\n") : [];

    async function run() {
      const cache = await caches.open(CACHE_NAME);
      let ok = 0;
      let bad = 0;
      for (const file of list) {
        if (cancelled) return;
        try {
          if (!(await cache.match(file))) {
            const response = await fetch(file);
            if (!response.ok || response.status !== 200) {
              throw new Error(`Failed to load ${file}`);
            }
            await cache.put(file, response);
          }
          ok += 1;
        } catch {
          bad += 1;
        }
        if (!cancelled) {
          setDone(ok);
          setFailed(bad);
        }
      }
    }

    void run().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, supported]);

  const total = key ? key.split("\n").length : 0;
  return {
    supported,
    done,
    total,
    failed,
    ready: total > 0 && done === total,
  };
}
