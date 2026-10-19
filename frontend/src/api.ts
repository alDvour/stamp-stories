export type Collectible = {
  id: number
  title: string
  description?: string
  image_url: string
  created_at: string
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = await response.json()
      message = body.detail || message
    } catch {
      // Keep the fallback message for non-JSON errors.
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function imageSrc(path: string) {
  if (/^https?:\/\//i.test(path)) return path
  return `${API_BASE}${path}`
}

export const api = {
  list: () => request<Collectible[]>('/api/collectibles'),
  get: (id: number) => request<Collectible>(`/api/collectibles/${id}`),
  create: (form: FormData, token: string) =>
    request<Collectible>('/api/collectibles', {
      method: 'POST',
      headers: { 'X-Admin-Token': token },
      body: form,
    }),
  delete: (id: number, token: string) =>
    request<void>(`/api/collectibles/${id}`, {
      method: 'DELETE',
      headers: { 'X-Admin-Token': token },
    }),
}
