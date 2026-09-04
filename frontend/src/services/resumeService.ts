import { ApiError, UnauthorizedError } from './apiErrors'
import type { Resume } from '../types/resume'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

interface ResumeApiResponse {
  id?: string
  Id?: string
  originalFileName?: string
  OriginalFileName?: string
  contentType?: string
  ContentType?: string
  fileSize?: number
  FileSize?: number
  uploadedAt?: string
  UploadedAt?: string
  updatedAt?: string | null
  UpdatedAt?: string | null
}

interface ApiErrorResponse {
  message?: string
  title?: string
  errors?: Record<string, string[]>
}

export const MAX_RESUME_FILE_SIZE = 5 * 1024 * 1024

export async function getMyResume() {
  try {
    const response = await sendRequest<ResumeApiResponse>('/api/resumes/me')

    return toResume(response)
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function uploadResume(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await sendRequest<ResumeApiResponse>('/api/resumes', {
    method: 'POST',
    body: formData,
  })

  return toResume(response)
}

export async function deleteResume() {
  await sendRequest<void>('/api/resumes/me', {
    method: 'DELETE',
  })
}

async function sendRequest<TResponse>(
  path: string,
  options: { method?: string; body?: BodyInit } = {},
) {
  const token = localStorage.getItem('accessToken')

  if (!token) {
    throw new UnauthorizedError('Please login to manage your resume.')
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: options.body,
  })

  if (response.status === 401) {
    localStorage.removeItem('accessToken')
    throw new UnauthorizedError()
  }

  if (!response.ok) {
    throw new ApiError(response.status, await getApiErrorMessage(response))
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

function toResume(response: ResumeApiResponse): Resume {
  return {
    id: response.id ?? response.Id ?? '',
    originalFileName:
      response.originalFileName ?? response.OriginalFileName ?? '',
    contentType: response.contentType ?? response.ContentType ?? '',
    fileSize: response.fileSize ?? response.FileSize ?? 0,
    uploadedAt: response.uploadedAt ?? response.UploadedAt ?? '',
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
