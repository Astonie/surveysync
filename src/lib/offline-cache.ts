"use client";

import { db } from "@/offline/db";

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cacheKey(url: string, init?: RequestInit): string {
  if (init?.method && init.method !== "GET") return `__${init.method}__${url}`;
  return url;
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const rec = await db.cache.get(key);
    if (!rec) return null;
    const age = Date.now() - new Date(rec.updatedAt).getTime();
    if (age > CACHE_TTL_MS) {
      await db.cache.delete(key);
      return null;
    }
    return JSON.parse(rec.value) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson<T>(key: string, value: T): Promise<void> {
  await db.cache.put({ key, value: JSON.stringify(value), updatedAt: new Date().toISOString() });
}

export async function invalidateCache(key: string): Promise<void> {
  await db.cache.delete(key);
}

export async function fetchCached<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method || "GET").toUpperCase();
  const key = cacheKey(url, init);

  if (method === "GET") {
    let lastError: unknown;
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        const data = (await res.json()) as T;
        await setCachedJson(key, data);
        return data;
      }
      lastError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      lastError = err;
    }
    const cached = await getCachedJson<T>(key);
    if (cached !== null) return cached;
    throw lastError;
  }

  const res = await fetch(url, init);
  return (await res.json()) as T;
}

export interface CachedSession {
  user: { id: string; email: string; name: string | null };
  expiresAt: string;
}

export async function cacheSession(user: CachedSession["user"]): Promise<void> {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.session.put({
    key: "current",
    user: JSON.stringify(user),
    expiresAt,
    updatedAt: new Date().toISOString(),
  });
}

export async function getCachedSession(): Promise<CachedSession | null> {
  try {
    const rec = await db.session.get("current");
    if (!rec) return null;
    if (Date.now() > new Date(rec.expiresAt).getTime()) {
      await db.session.delete("current");
      return null;
    }
    return {
      user: JSON.parse(rec.user) as CachedSession["user"],
      expiresAt: rec.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function clearSessionCache(): Promise<void> {
  await db.session.delete("current");
}
