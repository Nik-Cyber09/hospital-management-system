export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  let result
  try {
    result = await response.json()
  } catch {
    throw new ApiError('The server returned an invalid response.', response.status)
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/logout') window.dispatchEvent(new Event('carepoint:unauthorized'))
    throw new ApiError(result.error || 'The request could not be completed.', response.status)
  }
  return result
}
