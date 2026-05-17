export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

const CACHE_PREFIX = "api-cache:v2:";
const LEGACY_CACHE_PREFIX = "api-cache:v1:";
const VERSION_STATE_KEY = "api-cache:data-version:v1";
const VERSION_ENDPOINT_PATH = "/api/cache/version";
const VERSION_CHECK_TTL_MS = 10_000;

const responseCache = new Map();
const inflightRequests = new Map();
const inflightMutations = new Map();
let inflightVersionSync = null;

const CACHE_RULES = [
  { pattern: /^\/api\/estoques(?:\/.*)?$/, ttlMs: 30_000 },
  { pattern: /^\/api\/equipamentos-locados(?:\/.*)?$/, ttlMs: 30_000 },
  { pattern: /^\/api\/empresas(?:\/.*)?$/, ttlMs: 60_000 },
  { pattern: /^\/api\/oficinas(?:\/.*)?$/, ttlMs: 20_000 },
  { pattern: /^\/api\/historico-direcionamentos(?:\/.*)?$/, ttlMs: 20_000 },
  { pattern: /^\/api\/manutencoes(?:\/.*)?$/, ttlMs: 20_000 },
  { pattern: /^\/api\/equipes(?:\/.*)?$/, ttlMs: 60_000 },
  { pattern: /^\/api\/usuarios(?:\/.*)?$/, ttlMs: 60_000 },
  { pattern: /^\/api\/tipo-categoria(?:\/.*)?$/, ttlMs: 300_000 },
  { pattern: /^\/api\/relatorios(?:\/.*)?$/, ttlMs: 30_000 },
  { pattern: /^\/api\/checklist-modelos(?:\/.*)?$/, ttlMs: 60_000 },
  { pattern: /^\/api\/execucoes(?:\/.*)?$/, ttlMs: 20_000 },
  { pattern: /^\/api\/notificacoes\/transferencia\/recebidas(?:\/.*)?$/, ttlMs: 15_000 },
];

function getCacheKey(path) {
  return `${CACHE_PREFIX}${API_BASE_URL}${path}`;
}

function cloneCacheData(data) {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(data);
  }

  if (data == null || typeof data !== "object") {
    return data;
  }

  return JSON.parse(JSON.stringify(data));
}

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}

function removeStorage(key) {
  try {
    localStorage.removeItem(key);
  } catch {
  }
}

function getCacheTtlMs(path, options = {}) {
  if (options.cache === false) return 0;
  if (Number.isFinite(options.cacheTtlMs) && options.cacheTtlMs > 0) return options.cacheTtlMs;

  const rule = CACHE_RULES.find((item) => item.pattern.test(path));
  return rule?.ttlMs ?? 0;
}

function readVersionState() {
  try {
    const raw = readStorage(VERSION_STATE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!Number.isFinite(parsed?.version)) return null;

    return {
      version: Number(parsed.version),
      checkedAt: Number(parsed.checkedAt || 0),
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return null;
  }
}

function writeVersionState(state) {
  if (!state || !Number.isFinite(state.version)) return;

  writeStorage(VERSION_STATE_KEY, JSON.stringify({
    version: Number(state.version),
    checkedAt: Number(state.checkedAt || Date.now()),
    updatedAt: state.updatedAt || null,
  }));
}

function invalidateVersionState() {
  removeStorage(VERSION_STATE_KEY);
}

function readCachedEntry(path) {
  const key = getCacheKey(path);
  const now = Date.now();
  const memoryEntry = responseCache.get(key);

  if (memoryEntry?.expiresAt > now) {
    return {
      ...memoryEntry,
      data: cloneCacheData(memoryEntry.data),
    };
  }

  if (memoryEntry) {
    responseCache.delete(key);
  }

  try {
    const raw = readStorage(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.expiresAt || parsed.expiresAt <= now) {
      removeStorage(key);
      return null;
    }

    responseCache.set(key, parsed);
    return {
      ...parsed,
      data: cloneCacheData(parsed.data),
    };
  } catch {
    return null;
  }
}

function writeCachedResponse(path, data, ttlMs) {
  if (!(ttlMs > 0)) return;

  const key = getCacheKey(path);
  const versionState = readVersionState();
  const entry = {
    data: cloneCacheData(data),
    expiresAt: Date.now() + ttlMs,
    version: Number.isFinite(versionState?.version) ? Number(versionState.version) : null,
  };

  responseCache.set(key, entry);
  writeStorage(key, JSON.stringify(entry));
}

function clearResponseCache(path = null) {
  if (!path) {
    responseCache.clear();

    try {
      const localKeys = Object.keys(localStorage);
      localKeys
        .filter((key) => key.startsWith(CACHE_PREFIX) || key.startsWith(LEGACY_CACHE_PREFIX))
        .forEach((key) => localStorage.removeItem(key));
    } catch {
    }

    try {
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys
        .filter((key) => key.startsWith(CACHE_PREFIX) || key.startsWith(LEGACY_CACHE_PREFIX))
        .forEach((key) => sessionStorage.removeItem(key));
    } catch {
    }
    return;
  }

  const key = getCacheKey(path);
  responseCache.delete(key);
  removeStorage(key);
}

function clearCache(path = null) {
  clearResponseCache(path);
  if (!path) {
    invalidateVersionState();
  }
}

function getAuthHeaders() {
  try {
    const usuarioBruto = localStorage.getItem("usuario");
    if (!usuarioBruto) return {};

    const usuario = JSON.parse(usuarioBruto);
    const headers = {};

    if (usuario?.id != null) {
      headers["X-User-Id"] = String(usuario.id);
    }

    if (usuario?.tipoCategoria) {
      headers["X-User-Tipo"] = String(usuario.tipoCategoria);
    }

    if (usuario?.username) {
      headers["X-User-Username"] = String(usuario.username);
    }

    return headers;
  } catch {
    return {};
  }
}

function buildMutationRequestKey(path, method, options = {}) {
  const isFormData = options.body instanceof FormData;
  if (isFormData) {
    return null;
  }

  const rawBody = options.body == null ? "" : String(options.body);
  return `${method}:${path}:${rawBody}`;
}

function buildNetworkError(path, error) {
  const fallbackMessage = "Nao foi possivel conectar ao servidor. Verifique se o backend esta online e respondendo sem erro 502.";

  if (error instanceof Error && error.message) {
    if (/failed to fetch/i.test(error.message) || /load failed/i.test(error.message)) {
      return new Error(`${fallbackMessage} Endpoint: ${path}`);
    }

    return error;
  }

  return new Error(`${fallbackMessage} Endpoint: ${path}`);
}

function applyVersionFromHeaders(response) {
  const versionHeader = response.headers.get("x-app-data-version");
  if (!versionHeader) return null;

  const parsedVersion = Number(versionHeader);
  if (!Number.isFinite(parsedVersion)) return null;

  const nextState = {
    version: parsedVersion,
    checkedAt: Date.now(),
    updatedAt: response.headers.get("x-app-data-updated-at") || null,
  };

  writeVersionState(nextState);
  return nextState;
}

async function syncServerDataVersion(force = false) {
  const currentState = readVersionState();
  if (!force && currentState && Date.now() - currentState.checkedAt < VERSION_CHECK_TTL_MS) {
    return currentState;
  }

  if (inflightVersionSync) {
    return inflightVersionSync;
  }

  inflightVersionSync = (async () => {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${VERSION_ENDPOINT_PATH}`, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
      });
    } catch (error) {
      throw buildNetworkError(VERSION_ENDPOINT_PATH, error);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const mensagem = data?.mensagem ?? data?.message ?? `Request failed with status ${response.status}`;
      throw new Error(mensagem);
    }

    const previousState = readVersionState();
    const nextState = {
      version: Number(data?.version ?? response.headers.get("x-app-data-version") ?? 0),
      checkedAt: Date.now(),
      updatedAt: data?.updatedAt || response.headers.get("x-app-data-updated-at") || null,
    };

    if (Number.isFinite(nextState.version)) {
      if (previousState && previousState.version !== nextState.version) {
        clearResponseCache();
      }
      writeVersionState(nextState);
      return nextState;
    }

    return previousState;
  })().finally(() => {
    inflightVersionSync = null;
  });

  return inflightVersionSync;
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const method = String(options.method || "GET").toUpperCase();
  const cacheTtlMs = method === "GET" ? getCacheTtlMs(path, options) : 0;
  const cacheEnabled = cacheTtlMs > 0;
  const forceRefresh = options.forceRefresh === true;
  const baseHeaders = isFormData ? getAuthHeaders() : { "Content-Type": "application/json", ...getAuthHeaders() };
  const { headers: optionHeaders, cacheTtlMs: _cacheTtlMs, cache: _cache, forceRefresh: _forceRefresh, ...restOptions } = options;
  const shouldDedupeMutation = method !== "GET" && options.dedupe !== false;
  const mutationKey = shouldDedupeMutation ? buildMutationRequestKey(path, method, options) : null;

  if (method === "GET" && cacheEnabled && !forceRefresh) {
    const cachedEntry = readCachedEntry(path);
    if (cachedEntry != null) {
      try {
        const versionState = await syncServerDataVersion(false);
        if (!Number.isFinite(versionState?.version)) {
          return cachedEntry.data;
        }

        if (Number.isFinite(cachedEntry.version) && Number(cachedEntry.version) === Number(versionState.version)) {
          return cachedEntry.data;
        }
      } catch {
        return cachedEntry.data;
      }
    }

    const inflight = inflightRequests.get(path);
    if (inflight) {
      return inflight.then((data) => cloneCacheData(data));
    }
  }

  if (shouldDedupeMutation && mutationKey) {
    const inflightMutation = inflightMutations.get(mutationKey);
    if (inflightMutation) {
      return inflightMutation;
    }
  }

  const runRequest = async () => {
    let response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...restOptions,
        headers: {
          ...baseHeaders,
          ...(optionHeaders ?? {}),
        },
      });
    } catch (error) {
      throw buildNetworkError(path, error);
    }

    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const mensagem =
        typeof data === "object" && data !== null
          ? data.mensagem ?? data.message ?? `Request failed with status ${response.status}`
          : data || `Request failed with status ${response.status}`;

      throw new Error(mensagem);
    }

    const versionState = applyVersionFromHeaders(response);

    if (method === "GET" && cacheEnabled) {
      if (versionState == null) {
        writeVersionState({
          version: readVersionState()?.version ?? 0,
          checkedAt: Date.now(),
          updatedAt: readVersionState()?.updatedAt ?? null,
        });
      }
      writeCachedResponse(path, data, cacheTtlMs);
    } else if (method !== "GET") {
      clearResponseCache();
      if (versionState == null) {
        invalidateVersionState();
      }
    }

    return data;
  };

  if (method === "GET" && cacheEnabled) {
    const pending = runRequest().finally(() => inflightRequests.delete(path));
    inflightRequests.set(path, pending);
    return pending.then((data) => cloneCacheData(data));
  }

  if (shouldDedupeMutation && mutationKey) {
    const pendingMutation = runRequest().finally(() => inflightMutations.delete(mutationKey));
    inflightMutations.set(mutationKey, pendingMutation);
    return pendingMutation;
  }

  return runRequest();
}

async function requestArrayBuffer(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: {
        ...getAuthHeaders(),
        ...(optionHeaders ?? {}),
      },
    });
  } catch (error) {
    throw buildNetworkError(path, error);
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let mensagem = `Request failed with status ${response.status}`;

    if (contentType.includes("application/json")) {
      try {
        const data = await response.json();
        mensagem = data?.mensagem ?? data?.message ?? mensagem;
      } catch {
      }
    } else {
      try {
        const text = await response.text();
        if (text) mensagem = text;
      } catch {
      }
    }

    throw new Error(mensagem);
  }

  applyVersionFromHeaders(response);
  return response.arrayBuffer();
}

async function requestBlob(path, options = {}) {
  const { headers: optionHeaders, ...restOptions } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...restOptions,
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...(optionHeaders ?? {}),
      },
    });
  } catch (error) {
    throw buildNetworkError(path, error);
  }

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    let mensagem = `Request failed with status ${response.status}`;

    try {
      if (contentType.includes("application/json")) {
        const data = await response.json();
        mensagem = data?.mensagem ?? data?.message ?? mensagem;
      } else {
        const text = await response.text();
        if (text) mensagem = text;
      }
    } catch {
    }

    throw new Error(mensagem);
  }

  applyVersionFromHeaders(response);
  return response.blob();
}

function get(path, options = {}) {
  return request(path, { method: "GET", ...options });
}

function getCached(path, cacheTtlMs, options = {}) {
  return request(path, { method: "GET", cacheTtlMs, ...options });
}

function post(path, body, options = {}) {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...options,
  });
}

function postForm(path, body, options = {}) {
  return request(path, {
    method: "POST",
    body,
    ...options,
  });
}

function put(path, body, options = {}) {
  return request(path, {
    method: "PUT",
    body: JSON.stringify(body),
    ...options,
  });
}

function patch(path, body, options = {}) {
  return request(path, {
    method: "PATCH",
    body: body == null ? undefined : JSON.stringify(body),
    ...options,
  });
}

function remove(path, options = {}) {
  return request(path, { method: "DELETE", ...options });
}

function getArrayBuffer(path, options = {}) {
  return requestArrayBuffer(path, { method: "GET", ...options });
}

function postBlob(path, body, options = {}) {
  return requestBlob(path, {
    method: "POST",
    body: JSON.stringify(body),
    ...options,
  });
}

function prefetch(paths = []) {
  return Promise.allSettled(
    (paths || []).map((path) => get(path)),
  );
}

export const api = {
  clearCache,
  get,
  getCached,
  getArrayBuffer,
  post,
  postBlob,
  postForm,
  prefetch,
  put,
  patch,
  delete: remove,
  syncServerDataVersion,
};
