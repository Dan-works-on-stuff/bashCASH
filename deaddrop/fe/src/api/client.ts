const API_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    let message: string;
    try {
      const parsed = JSON.parse(body);
      message = parsed.message ?? parsed.error ?? body;
    } catch {
      message = body || response.statusText;
    }
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export interface CreateSecretRequest {
  content: string;
  password: string;
  email: string;
  expiresIn: '1h' | '24h' | '7d';
}

export interface CreateSecretResponse {
  id: string;
  expiresAt: string;
}

export function createSecret(
  data: CreateSecretRequest,
): Promise<CreateSecretResponse> {
  return request<CreateSecretResponse>('/secrets', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface ViewSecretResponse {
  content: string;
}

export function viewSecret(
  id: string,
  password: string,
): Promise<ViewSecretResponse> {
  return request<ViewSecretResponse>(`/secrets/${id}/view`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export interface GenerateSecretResponse {
  content: string;
}

export function generateSecret(
  prompt: string,
): Promise<GenerateSecretResponse> {
  return request<GenerateSecretResponse>('/secrets/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}
