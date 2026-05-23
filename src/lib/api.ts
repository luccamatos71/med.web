// fetch wrapper with Bearer token — full implementation comes in Story 1.3 (auth)
const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    cache: "no-store", // user data must never be cached
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}
