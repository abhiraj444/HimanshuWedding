/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { openDB, IDBPDatabase } from 'idb';
import { Project, AssetRef, AssetSlotId } from '../data/schema.ts';
import { DEFAULT_PROJECT } from '../data/defaultProject.ts';

const DB_NAME = 'wedding_video_studio_db';
const DB_VERSION = 1;
const STORE_PROJECT = 'project';
const STORE_ASSETS = 'asset_images';

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_PROJECT)) {
          db.createObjectStore(STORE_PROJECT);
        }
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          db.createObjectStore(STORE_ASSETS);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveProjectToDB(project: Project): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_PROJECT, project, 'current_project');
  } catch (err) {
    console.warn('Failed to autosave project to IndexedDB:', err);
  }
}

export async function loadProjectFromDB(): Promise<Project> {
  try {
    const db = await getDB();
    const saved = await db.get(STORE_PROJECT, 'current_project');
    if (saved && saved.version) {
      return saved;
    }
  } catch (err) {
    console.warn('Failed to load project from IndexedDB:', err);
  }
  return DEFAULT_PROJECT;
}

export async function saveAssetImageBlob(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await getDB();
    await db.put(STORE_ASSETS, dataUrl, id);
  } catch (err) {
    console.warn('Failed to store asset blob:', err);
  }
}

export async function getAssetImageBlob(id: string): Promise<string | null> {
  try {
    const db = await getDB();
    return (await db.get(STORE_ASSETS, id)) || null;
  } catch (err) {
    return null;
  }
}

/**
 * Image Cache for instant synchronous frame rendering
 */
class ImagePreloader {
  private cache = new Map<string, HTMLImageElement>();
  private loadPromises = new Map<string, Promise<HTMLImageElement>>();

  getImage(url: string): HTMLImageElement | null {
    if (!url) return null;
    const img = this.cache.get(url);
    if (img && img.complete && img.naturalWidth > 0) {
      return img;
    }
    // Kick off load in background if not already started
    if (!this.loadPromises.has(url)) {
      this.preload(url);
    }
    return null;
  }

  async preload(url: string): Promise<HTMLImageElement> {
    if (!url) throw new Error('Empty URL');
    if (this.cache.has(url)) {
      const existing = this.cache.get(url)!;
      if (existing.complete) return existing;
    }
    if (this.loadPromises.has(url)) {
      return this.loadPromises.get(url)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.cache.set(url, img);
        resolve(img);
      };
      img.onerror = (e) => {
        console.warn(`Failed to preload image: ${url}`, e);
        reject(e);
      };
      img.src = url;
    });

    this.loadPromises.set(url, promise);
    return promise;
  }

  async preloadAll(urls: (string | null | undefined)[]): Promise<void> {
    const valid = urls.filter((u): u is string => Boolean(u));
    await Promise.allSettled(valid.map((u) => this.preload(u)));
  }

  setCache(url: string, img: HTMLImageElement): void {
    this.cache.set(url, img);
  }
}

export const imagePreloader = new ImagePreloader();
