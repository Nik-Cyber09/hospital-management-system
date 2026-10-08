export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest(path, options = {}) {
  let response
  try {
    response = await fetch(path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError('The clinic server is unavailable. Check that the server is running and try again.', 0)
  }

  if (response.status === 204) return null

  let result
  try {
    result = await response.json()
  } catch {
    throw new ApiError(response.ok
      ? 'The server returned an invalid response.'
      : `The server is temporarily unavailable (HTTP ${response.status}). Try again.`, response.status)
  }

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/logout') window.dispatchEvent(new Event('carepoint:unauthorized'))
    throw new ApiError(result.error || 'The request could not be completed.', response.status)
  }
  return result
}
