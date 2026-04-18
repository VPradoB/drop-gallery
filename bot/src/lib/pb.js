/**
 * PocketBase client — module-level token cache, retry-enabled auth.
 */

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const PB_ADMIN_EMAIL = process.env.PB_EMAIL;
const PB_ADMIN_PASSWORD = process.env.PB_PASSWORD;

let token = null;

/**
 * Authenticate with PocketBase and cache the token.
 * Retries up to 5 times with a 3s delay. Exits process on final failure.
 */
export async function getToken() {
  if (token) return token;

  const maxRetries = 5;
  const delay = 3000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${PB_URL}/api/collections/_superusers/auth-with-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: PB_ADMIN_EMAIL, password: PB_ADMIN_PASSWORD }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`PocketBase auth failed (${res.status}): ${body}`);
      }

      const data = await res.json();
      token = data.token;
      console.log('[pb] Authenticated successfully');
      return token;
    } catch (err) {
      console.error(`[pb] Auth attempt ${attempt}/${maxRetries} failed:`, err.message);
      if (attempt === maxRetries) {
        console.error('[pb] All auth attempts exhausted. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

/**
 * Invalidate the cached token (e.g. after a 401 response).
 */
export function invalidateToken() {
  token = null;
}

/**
 * Fetch wrapper that adds PocketBase Authorization header.
 * Automatically re-authenticates once on 401.
 */
export async function pbFetch(path, options = {}) {
  const t = await getToken();

  const res = await fetch(`${PB_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      Authorization: t,
    },
  });

  if (res.status === 401) {
    // Token expired — refresh and retry once
    invalidateToken();
    const newToken = await getToken();
    const retry = await fetch(`${PB_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
        Authorization: newToken,
      },
    });
    return retry;
  }

  return res;
}

// ─── Creators ────────────────────────────────────────────────────────────────

export async function listCreators() {
  const res = await pbFetch('/api/collections/creators/records?perPage=200&sort=name');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`listCreators failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.items ?? data.records ?? [];
}

export async function getCreator(id) {
  const res = await pbFetch(`/api/collections/creators/records/${id}`);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`getCreator(${id}) failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function createCreator(fields) {
  const res = await pbFetch('/api/collections/creators/records', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createCreator failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function updateCreator(id, fields) {
  const res = await pbFetch(`/api/collections/creators/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`updateCreator(${id}) failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function deleteCreator(id) {
  const res = await pbFetch(`/api/collections/creators/records/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`deleteCreator(${id}) failed (${res.status}): ${body}`);
  }
}

// ─── Images ──────────────────────────────────────────────────────────────────

export async function listImages(creatorId) {
  const filter = encodeURIComponent(`creator="${creatorId}"`);
  const res = await pbFetch(
    `/api/collections/images/records?perPage=200&sort=order&filter=${filter}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`listImages(${creatorId}) failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.items ?? data.records ?? [];
}

export async function createImage(fields) {
  const res = await pbFetch('/api/collections/images/records', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createImage failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function updateImage(id, fields) {
  const res = await pbFetch(`/api/collections/images/records/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`updateImage(${id}) failed (${res.status}): ${body}`);
  }
  return res.json();
}

export async function deleteImage(id) {
  const res = await pbFetch(`/api/collections/images/records/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`deleteImage(${id}) failed (${res.status}): ${body}`);
  }
}
