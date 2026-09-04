import type { CreateJobRequest, Job, UpdateJobRequest } from '../types/job'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface JobApiResponse {
  id?: string
  Id?: string
  companyName?: string
  CompanyName?: string
  positionTitle?: string
  PositionTitle?: string
  description?: string
  Description?: string
  location?: string | null
  Location?: string | null
  jobUrl?: string | null
  JobUrl?: string | null
  createdAt?: string
  CreatedAt?: string
  updatedAt?: string | null
  UpdatedAt?: string | null
}

interface ApiErrorResponse {
  message?: string
  title?: string
  errors?: Record<string, string[]>
}

export class UnauthorizedError extends Error {
  constructor(message = 'Your session expired. Please login again.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export async function getJobs() {
  const response = await sendRequest<JobApiResponse[]>('/api/jobs')

  return response.map(toJob)
}

export async function getJobById(id: string) {
  const response = await sendRequest<JobApiResponse>(`/api/jobs/${id}`)

  return toJob(response)
}

export async function createJob(request: CreateJobRequest) {
  const response = await sendRequest<JobApiResponse>('/api/jobs', {
    method: 'POST',
    body: normalizeJobRequest(request),
  })

  return toJob(response)
}

export async function updateJob(id: string, request: UpdateJobRequest) {
  const response = await sendRequest<JobApiResponse>(`/api/jobs/${id}`, {
    method: 'PUT',
    body: normalizeJobRequest(request),
  })

  return toJob(response)
}

export async function deleteJob(id: string) {
  await sendRequest<void>(`/api/jobs/${id}`, {
    method: 'DELETE',
  })
}

async function sendRequest<TResponse>(
  path: string,
  options: { method?: string; body?: unknown } = {},
) {
  const token = localStorage.getItem('accessToken')

  if (!token) {
    throw new UnauthorizedError('Please login to manage jobs.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (response.status === 401) {
    localStorage.removeItem('accessToken')
    throw new UnauthorizedError()
  }

  if (!response.ok) {
    throw new Error(await getApiErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

function normalizeJobRequest(request: CreateJobRequest | UpdateJobRequest) {
  return {
    companyName: request.companyName.trim(),
    positionTitle: request.positionTitle.trim(),
    description: request.description.trim(),
    location: normalizeOptionalText(request.location),
    jobUrl: normalizeOptionalText(request.jobUrl),
  }
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmedValue = value?.trim()

  return trimmedValue ? trimmedValue : null
}

function toJob(response: JobApiResponse): Job {
  return {
    id: response.id ?? response.Id ?? '',
    companyName: response.companyName ?? response.CompanyName ?? '',
    positionTitle: response.positionTitle ?? response.PositionTitle ?? '',
    description: response.description ?? response.Description ?? '',
    location: response.location ?? response.Location ?? null,
    jobUrl: response.jobUrl ?? response.JobUrl ?? null,
    createdAt: response.createdAt ?? response.CreatedAt ?? '',
    updatedAt: response.updatedAt ?? response.UpdatedAt ?? null,
  }
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
