import { ParseZipResponse } from './types';
const API_URL = 'http://localhost:8000';
export async function parseZip(base64Zip: string): Promise<ParseZipResponse> {
  const res = await fetch(`${API_URL}/v1/vfs/parse`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ zip_base64: base64Zip }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || 'Failed to parse ZIP');
  }
  return res.json();
}
