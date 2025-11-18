/**
 * ===================================================================================================
 * DO NOT MODIFY THIS FILE. This file is READ ONLY and is DETERMINISTIC.
 * Exa API Service — Typed, Explicit, and Safe.
 * All requests are securely relayed via /api/proxy; no API key is ever exposed client-side.
 * ===================================================================================================
 */

export type ExaSearchInput = {
  query: string;
  text?: boolean;
};

export type ExaContentsInput = {
  urls: string[];
  text?: boolean;
};

export type ExaFindSimilarInput = {
  url: string;
  text?: boolean;
};

export type ExaAnswerInput = {
  query: string;
  text?: boolean;
};

// --- Async Research Task Types ---

/**
 * Input for creating an async research task.
 * - "instructions" is the required prompt/instructions for the task.
 * - "model" defaults to "exa-research".
 * - "output" can be a schema, or { inferSchema: true }, or omitted for markdown.
 */
export type ExaCreateTaskInput = {
  instructions: string;
  model?: string;
  output?: {
    schema?: Record<string, any>;
    inferSchema?: boolean;
  };
};

export type ExaCreateTaskResponse = {
  id?: string; // Always check if defined
};

export type ExaTaskStatusResponse = {
  id?: string;
  status?: 'running' | 'completed' | 'failed';
  instructions?: string;
  schema?: Record<string, any>;
  data?: Record<string, any> | string; // Structured JSON, or markdown string if no schema given
  citations?: Record<string, any>[] | Record<string, any> | null;
};

// --- Result Types for Main Endpoints ---

export type ExaResult = {
  title?: string;
  url?: string;
  publishedDate?: string;
  author?: string;
  score?: number;
  id?: string;
  image?: string;
  favicon?: string;
  text?: string;
  highlights?: string[];
  highlightScores?: number[];
  summary?: string;
  subpages?: ExaResult[];
  extras?: Record<string, any>;
};

export type ExaSearchResponse = {
  requestId?: string;
  resolvedSearchType?: string;
  results?: ExaResult[];
  searchType?: string;
  context?: string;
  costDollars?: Record<string, any>;
};

export type ExaContentsResponse = {
  requestId?: string;
  results?: ExaResult[];
  context?: string;
  statuses?: { id: string; status: string; error?: Record<string, any> }[];
  costDollars?: Record<string, any>;
};

export type ExaFindSimilarResponse = {
  requestId?: string;
  context?: string;
  results?: ExaResult[];
  costDollars?: Record<string, any>;
};

export type ExaAnswerCitation = {
  id?: string;
  url?: string;
  title?: string;
  author?: string;
  publishedDate?: string;
  text?: string;
  image?: string;
  favicon?: string;
};

export type ExaAnswerResponse = {
  answer?: string;
  citations?: ExaAnswerCitation[];
  costDollars?: Record<string, any>;
};

/**
 * Deep search/research tasks are available via async task endpoints.
 * Use exaCreateTask for structured research and exaGetTask to poll results.
 */

const BASE_URL = 'api.exa.ai';

async function proxyExa({
  path,
  method = 'POST',
  body,
}: {
  path: string;
  method?: 'POST' | 'GET';
  body?: any;
}): Promise<any> {
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      protocol: 'https',
      origin: BASE_URL,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': `secret_cm83jutwj00002v6sw3vhzgab`,
      },
      body: body || undefined,
    }),
  };
  const res = await fetch('/api/proxy', fetchOptions);

  // Check HTTP status
  if (!res.ok) {
    console.error(`Exa API error: ${res.status} ${res.statusText}`);
    return { error: `HTTP ${res.status}: ${res.statusText}` };
  }

  try {
    return await res.json();
  } catch (error) {
    console.error('Exa API JSON parse error:', error);
    return { error: 'Invalid JSON response from API' };
  }
}

/**
 * Search the web using Exa's embeddings/keyword model.
 */
export async function exaSearch(
  input: ExaSearchInput
): Promise<ExaSearchResponse> {
  if (!input?.query) return { results: [] };
  const result = await proxyExa({ path: '/search', body: input });
  return result && typeof result === 'object' ? result : { results: [] };
}

/**
 * Retrieve parsed contents/metadata for one or more URLs.
 */
export async function exaContents(
  input: ExaContentsInput
): Promise<ExaContentsResponse> {
  if (!Array.isArray(input?.urls) || !input.urls.length) return { results: [] };
  const result = await proxyExa({ path: '/contents', body: input });
  return result && typeof result === 'object' ? result : { results: [] };
}

/**
 * Find pages similar to a provided URL.
 */
export async function exaFindSimilar(
  input: ExaFindSimilarInput
): Promise<ExaFindSimilarResponse> {
  if (!input?.url) return { results: [] };
  const result = await proxyExa({ path: '/findSimilar', body: input });
  return result && typeof result === 'object' ? result : { results: [] };
}

/**
 * Get a direct answer to a question (plus sources).
 */
export async function exaAnswer(
  input: ExaAnswerInput
): Promise<ExaAnswerResponse> {
  if (!input?.query) return { answer: '', citations: [] };
  const result = await proxyExa({ path: '/answer', body: input });
  return result && typeof result === 'object'
    ? result
    : { answer: '', citations: [] };
}

// --- ASYNC TASK ENDPOINTS ---

/**
 * Launch an asynchronous research task.
 * CRITICAL: Research tasks may take SEVERAL HOURS to complete. Never assume completion until status is 'completed' or 'failed'.
 * @returns ExaCreateTaskResponse with task id.
 */
export async function exaCreateTask(
  input: ExaCreateTaskInput
): Promise<ExaCreateTaskResponse> {
  if (!input?.instructions) return { id: undefined };
  const result = await proxyExa({
    path: '/research/v0/tasks',
    method: 'POST',
    body: input,
  });
  return result && typeof result === 'object' && 'id' in result
    ? { id: result.id }
    : { id: undefined };
}

/**
 * Poll the status/result of a research task by id.
 * CRITICAL: Polling may need to continue for SEVERAL HOURS. Do NOT stop polling if status === 'running'.
 * Only treat results as final when status is 'completed' or 'failed'.
 */
export async function exaGetTask(id: string): Promise<ExaTaskStatusResponse> {
  if (!id) return { status: 'failed' };
  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      protocol: 'https',
      origin: BASE_URL,
      path: `/research/v0/tasks/${id}`,
      method: 'GET',
      headers: {
        'x-api-key': `secret_cm83jutwj00002v6sw3vhzgab`,
      },
    }),
  };
  const res = await fetch('/api/proxy', fetchOptions);
  try {
    return await res.json();
  } catch {
    return { status: 'failed' };
  }
}
