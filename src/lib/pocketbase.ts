import type { Creator, Image, PocketbaseListResponse } from './types';

const BASE = (import.meta.env.POCKETBASE_URL as string).replace(/\/$/, '');

async function pbFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`PB ${res.status} ${res.statusText}: ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function getCreators(): Promise<Creator[]> {
  const filter = encodeURIComponent('(active=true)');
  const data = await pbFetch<PocketbaseListResponse<Creator>>(
    `/api/collections/creators/records?filter=${filter}&sort=name&perPage=200&fields=*`
  );
  return data.items;
}

export async function getCreatorBySlug(slug: string): Promise<Creator | null> {
  const filter = encodeURIComponent(`(slug="${slug}"&&active=true)`);
  const data = await pbFetch<PocketbaseListResponse<Creator>>(
    `/api/collections/creators/records?filter=${filter}&perPage=1&fields=*`
  );
  return data.items[0] ?? null;
}

export async function getImagesByCreator(creatorId: string): Promise<Image[]> {
  const filter = encodeURIComponent(`(creator="${creatorId}"&&active=true)`);
  const data = await pbFetch<PocketbaseListResponse<Image>>(
    `/api/collections/images/records?filter=${filter}&sort=order,created&perPage=500`
  );
  return data.items;
}

export async function getAllImages(): Promise<Image[]> {
  const filter = encodeURIComponent('(active=true)');
  const data = await pbFetch<PocketbaseListResponse<Image>>(
    `/api/collections/images/records?filter=${filter}&sort=order,created&perPage=2000`
  );
  return data.items;
}
