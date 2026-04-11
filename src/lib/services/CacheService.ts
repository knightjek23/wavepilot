/**
 * CacheService — Manages trend data cache in Supabase (trend_cache table)
 *
 * Cache key = SHA-256 hash of sorted niche + platform array.
 * TTL: 24 hours by default. pg_cron prunes expired entries nightly.
 *
 * All reads check expires_at — if the row exists but is expired,
 * it's treated as a cache miss (and will be overwritten on next set).
 */

import { createHash } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TrendPayload } from "@/types";

export class CacheService {
  private client: SupabaseClient | null = null;

  /**
   * Lazy-load the Supabase admin client.
   * Avoids crashing at import time when env vars aren't set (e.g. CI builds).
   */
  private getClient(): SupabaseClient {
    if (!this.client) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) throw new Error("Supabase env vars not set");
      this.client = createClient(url, key, { auth: { persistSession: false } });
    }
    return this.client;
  }

  /**
   * Generate a deterministic, collision-resistant cache key.
   * SHA-256 of lowercase niche + sorted platform array.
   */
  static buildKey(niche: string, platforms: string[]): string {
    const sorted = [...platforms].sort().join(",");
    const raw = `${niche.toLowerCase().trim()}:${sorted}`;
    return createHash("sha256").update(raw).digest("hex");
  }

  /**
   * Get cached trend data.
   * Returns null if key doesn't exist or has expired.
   */
  async get(key: string): Promise<TrendPayload | null> {
    const client = this.getClient();

    const { data, error } = await client
      .from("trend_cache")
      .select("data, expires_at")
      .eq("cache_key", key)
      .single();

    if (error || !data) {
      // PGRST116 = no rows found (expected for cache miss)
      if (error && error.code !== "PGRST116") {
        console.error("CacheService.get failed", { key: key.slice(0, 12), error });
      }
      return null;
    }

    // Check expiry (belt-and-suspenders with pg_cron prune)
    const row = data as { data: TrendPayload; expires_at: string };
    if (new Date(row.expires_at) < new Date()) {
      return null;
    }

    return row.data;
  }

  /**
   * Write trend data to cache.
   * Uses upsert — if the key already exists, the row is replaced.
   */
  async set(key: string, payload: TrendPayload, ttlHours = 24): Promise<void> {
    const client = this.getClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const { error } = await client
      .from("trend_cache")
      .upsert(
        {
          cache_key: key,
          data: payload,
          fetched_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "cache_key" }
      );

    if (error) {
      console.error("CacheService.set failed", { key: key.slice(0, 12), error });
      // Non-fatal — the request can still succeed without caching
    }
  }

  /**
   * Invalidate a specific cache entry.
   * Used when the user explicitly requests fresh data.
   */
  async invalidate(key: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from("trend_cache")
      .delete()
      .eq("cache_key", key);

    if (error) {
      console.error("CacheService.invalidate failed", { key: key.slice(0, 12), error });
    }
  }

  /**
   * Bulk invalidate all cache entries.
   * Useful for admin/debugging — not part of normal flow.
   */
  async invalidateAll(): Promise<void> {
    const client = this.getClient();

    const { error } = await client
      .from("trend_cache")
      .delete()
      .lt("expires_at", new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString());

    if (error) {
      console.error("CacheService.invalidateAll failed", error);
    }
  }
}
