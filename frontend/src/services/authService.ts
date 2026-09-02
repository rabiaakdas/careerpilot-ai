const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

export interface RegisterRequest {
  firstName: string
  lastName: string
  email: string
  password: string
}

export interface RegisterResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  id: string
  email: string
  firstName: string
  lastName: string
  accessToken: string
}

interface LoginApiResponse {
  id?: string
  Id?: string
  email?: string
  Email?: string
  firstName?: string
  FirstName?: string
  lastName?: string
  LastName?: string
  accessToken?: string
  AccessToken?: string
}

interface ApiErrorResponse {
  message?: string
  title?: string
  errors?: Record<string, string[]>
}

export async function register(request: RegisterRequest) {
  return sendRequest<RegisterResponse>('/api/auth/register', request)
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await sendRequest<LoginApiResponse>('/api/auth/login', request)
  const accessToken = response.accessToken ?? response.AccessToken

  if (!accessToken) {
    throw new Error('Login succeeded, but no access token was returned.')
  }

  return {
    id: response.id ?? response.Id ?? '',
    email: response.email ?? response.Email ?? '',
    firstName: response.firstName ?? response.FirstName ?? '',
    lastName: response.lastName ?? response.LastName ?? '',
    accessToken,
  }
}

async function sendRequest<TResponse>(path: string, body: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response))
  }

  return (await response.json()) as TResponse
}

async function getApiErrorMessage(response: Response) {
  const fallbackMessage = 'Request failed. Please try again.'

  try {
    const error = (await response.json()) as ApiErrorResponse

    if (error.message) {
      return error.message
    }

    if (error.errors) {
      return Object.values(error.errors).flat().join(' ')
    }

    if (error.title) {
      return error.title
    }
  } catch {
    return fallbackMessage
  }

  return fallbackMessage
}
