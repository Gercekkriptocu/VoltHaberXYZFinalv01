/**
 * ================================================================================
 * DO NOT MODIFY THIS HEADER.  File is deterministic; use only exported helpers.
 * Strict OpenAI API Proxy Layer
 * ================================================================================
 */

const API_KEY = 'secret_cm915c66b00023b6r51yc9cw3';

// Supported image sizes per model
type GPTImageSize = '1024x1024' | '1536x1024' | '1024x1536' | 'auto';
type Dalle2Size   = '256x256'   | '512x512'   | '1024x1024';
type Dalle3Size   = '1024x1024' | '1792x1024' | '1024x1792';

// Main chat models
export type ChatModel =
  | 'gpt-4' | 'gpt-4.1' | 'gpt-4o' | 'gpt-4o-mini'
  | 'gpt-3.5-turbo' | 'o3-mini' | 'o3' | 'o4-mini' | 'gpt-4.1-mini';

// Main image models
export type ImageModel  = 'gpt-image-1' | 'dall-e-2' | 'dall-e-3';
export type ImageBG     = 'auto' | 'transparent' | 'opaque';
export type ImageFormat = 'png' | 'webp';
export type ImageQuality= 'low' | 'medium' | 'high' | 'auto';

/* ============================== Chat Types =============================== */

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'developer';
  content:
    | string
    | { type: 'text';      text: string }
    | { type: 'image_url'; image_url: { url: string } };
}

export interface OpenAIChatCompletionRequest {
  model: ChatModel;
  messages: OpenAIChatMessage[];
}

export interface OpenAIChatCompletionResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string; refusal?: string | null; annotations?: any[] };
    finish_reason?: string;
  }>;
  usage?: any;
}

/* ========================== Image Generation Types ======================= */

// GPT-Image-1 request and response types
export type GPTImageRequest = {
  model: 'gpt-image-1';
  prompt: string;
  size?: GPTImageSize;
  n?: number;
  background?: ImageBG;
  output_format?: ImageFormat;
  quality?: ImageQuality;
};
export interface B64Chunk  { b64_json: string }
export interface GPTImageResponse {
  created: number;
  data: B64Chunk[];
  background?: ImageBG;
  output_format?: ImageFormat;
  size?: string;
  quality?: string;
  usage?: any;
}

// DALL·E requests and responses
export type Dalle2ImageRequest = {
  model: 'dall-e-2';
  prompt: string;
  size?: Dalle2Size;
  n?: number;
};
export type Dalle3ImageRequest = {
  model: 'dall-e-3';
  prompt: string;
  size?: Dalle3Size;
  n?: number;
};
export type DalleImageRequest = Dalle2ImageRequest | Dalle3ImageRequest;
export interface UrlChunk  { url: string; revised_prompt?: string }
export interface DalleImageResponse {
  created: number;
  data: UrlChunk[];
  usage?: any;
}

/* ============================ Image Editing Types ========================= */

export interface OpenAIEditImageRequest {
  /**
   * Only GPT-Image-1 supported for editing.
   */
  model: 'gpt-image-1';
  prompt: string;
  images: (File | Blob | ArrayBuffer | string)[];
}
export interface OpenAIEditImageResponse {
  created: number;
  data: B64Chunk[];
  usage?: any;
}

/* =========================== Internal Proxy Helpers ======================= */

async function _proxyOpenAI<T = any>(cfg: {
  body?: any; path: string; method?: string; headers?: Record<string, string>;
}): Promise<T> {
  const { body, path, method = 'POST', headers } = cfg;
  const res = await fetch('/api/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      protocol: 'https',
      origin:   'api.openai.com',
      path,
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}`, ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
  });

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json'))    return res.json();
  if (ct.startsWith('text/')) return res.text() as any;
  return res.arrayBuffer() as any;
}

async function _proxyForm<T = any>(cfg: {
  form: FormData; path: string; method?: string; headers?: Record<string,string>;
}): Promise<T> {
  const { form, path, method = 'POST', headers } = cfg;
  form.append('protocol', 'https');
  form.append('origin',   'api.openai.com');
  form.append('path',     path);
  form.append('method',   method);
  form.append('headers',  JSON.stringify({ Authorization: `Bearer ${API_KEY}`, ...headers }));
  const res = await fetch('/api/proxy', { method: 'POST', body: form });

  const ct = res.headers.get('content-type') || '';
  if (ct.includes('json'))    return res.json();
  if (ct.startsWith('text/')) return res.text() as any;
  return res.arrayBuffer() as any;
}

/* ============================ Public API Helpers ========================== */

/**
 * Get a chat/completion result from OpenAI.
 * @param input Chat model, messages, and metadata.
 * @returns Parsed chat completion payload.
 */
export async function openaiChatCompletion(
  input: OpenAIChatCompletionRequest,
): Promise<OpenAIChatCompletionResponse> {
  if (!input.messages?.length) throw new Error('At least one message required');
  return _proxyOpenAI({
    body: { model: input.model, messages: input.messages },
    path: '/v1/chat/completions',
  });
}

/**
 * Generate image as base64 (GPT-Image-1 only).
 * @param input GPT-Image-1 request: prompt, size, etc.
 * @returns Base64-encoded image result.
 */
export async function openaiImageFromPromptB64(
  input: GPTImageRequest,
): Promise<GPTImageResponse> {
  if (input.size && !['1024x1024', '1536x1024', '1024x1536', 'auto'].includes(input.size)) {
    throw new Error('Invalid size for gpt-image-1. Allowed: 1024x1024, 1536x1024, 1024x1536, auto');
  }
  return _proxyOpenAI({
    body: input,
    path: '/v1/images/generations',
  });
}

/**
 * Generate image as signed URL (DALL·E-2 or DALL·E-3).
 * @param input DALL·E request: prompt, size, etc.
 * @returns Object containing image URLs.
 */
export async function openaiImageFromPromptUrl(
  input: DalleImageRequest,
): Promise<DalleImageResponse> {
  if (input.model === 'dall-e-2' && input.size && !['256x256', '512x512', '1024x1024'].includes(input.size)) {
    throw new Error('Invalid size for dall-e-2. Allowed: 256x256, 512x512, 1024x1024');
  }
  if (input.model === 'dall-e-3' && input.size && !['1024x1024', '1792x1024', '1024x1792'].includes(input.size)) {
    throw new Error('Invalid size for dall-e-3. Allowed: 1024x1024, 1792x1024, 1024x1792');
  }
  return _proxyOpenAI({
    body: input,
    path: '/v1/images/generations',
  });
}

/**
 * Edit image(s) with GPT-Image-1 (base64 only).
 * @param input Edit request: prompt and one or more images (File, Blob, ArrayBuffer, or data-URL string).
 * @returns Edited image as base64-encoded result.
 */
export async function openaiEditImage(
  input: OpenAIEditImageRequest,
): Promise<OpenAIEditImageResponse> {
  if (input.model !== 'gpt-image-1') throw new Error('Image editing is only supported with model gpt-image-1.');
  if (!input.images?.length) throw new Error('At least one source image required');

  const form = new FormData();
  form.append('body[model]',  input.model);
  form.append('body[prompt]', input.prompt);

  // Key must be 'body[image]', and repeat for each image
  for (const img of input.images) {
    form.append(
      'body[image]',
      typeof img === 'string' && img.startsWith('data:')
        ? dataURLtoBlob(img)
        : (img as any),
      'image.png',
    );
  }

  return _proxyForm({ form, path: '/v1/images/edits' });
}

/* ============================== Util ============================== */

function dataURLtoBlob(dataurl: string): Blob {
  const [meta, base64] = dataurl.split(',');
  if (!base64) throw new Error('Invalid data URL');
  const mime = meta.match(/:(.*?);/)?.[1] || 'image/png';
  const bin  = atob(base64);
  return new Blob([Uint8Array.from(bin, c => c.charCodeAt(0))], { type: mime });
}