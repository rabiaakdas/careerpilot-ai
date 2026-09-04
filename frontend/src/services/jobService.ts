import type { CreateJobRequest, Job, UpdateJobRequest } from '../types/job'
import { ApiError, UnauthorizedError } from './apiErrors'
import type {
  BehavioralInterviewQuestion,
  CvBasedInterviewQuestion,
  InterviewPrepResponse,
  InterviewQuestionDifficulty,
  TechnicalInterviewQuestion,
} from '../types/interview'
import type { ResumeJobMatchResponse } from '../types/match'

export { ApiError, UnauthorizedError } from './apiErrors'

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

interface ResumeJobMatchApiResponse {
  matchScore?: number
  MatchScore?: number
  summary?: string
  Summary?: string
  matchedSkills?: string[]
  MatchedSkills?: string[]
  missingSkills?: string[]
  MissingSkills?: string[]
  strengths?: string[]
  Strengths?: string[]
  recommendations?: string[]
  Recommendations?: string[]
}

interface InterviewPrepApiResponse {
  summary?: string
  Summary?: string
  technicalQuestions?: TechnicalInterviewQuestionApiResponse[]
  TechnicalQuestions?: TechnicalInterviewQuestionApiResponse[]
  behavioralQuestions?: BehavioralInterviewQuestionApiResponse[]
  BehavioralQuestions?: BehavioralInterviewQuestionApiResponse[]
  cvBasedQuestions?: CvBasedInterviewQuestionApiResponse[]
  CvBasedQuestions?: CvBasedInterviewQuestionApiResponse[]
  questionsToAskEmployer?: string[]
  QuestionsToAskEmployer?: string[]
}

interface TechnicalInterviewQuestionApiResponse {
  question?: string
  Question?: string
  whyAsked?: string
  WhyAsked?: string
  answerGuidance?: string
  AnswerGuidance?: string
  difficulty?: string
  Difficulty?: string
}

interface BehavioralInterviewQuestionApiResponse {
  question?: string
  Question?: string
  whyAsked?: string
  WhyAsked?: string
  answerGuidance?: string
  AnswerGuidance?: string
}

interface CvBasedInterviewQuestionApiResponse {
  question?: string
  Question?: string
  cvEvidence?: string
  CvEvidence?: string
  answerGuidance?: string
  AnswerGuidance?: string
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

export async function matchResumeWithJob(id: string) {
  const response = await sendRequest<ResumeJobMatchApiResponse>(
    `/api/jobs/${id}/match`,
    {
      method: 'POST',
    },
  )

  return toResumeJobMatch(response)
}

export async function getInterviewPrep(id: string) {
  const response = await sendRequest<InterviewPrepApiResponse>(
    `/api/jobs/${id}/interview-prep`,
    {
      method: 'POST',
    },
  )

  return toInterviewPrep(response)
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
    throw new ApiError(response.status, await getApiErrorMessage(response))
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

function toResumeJobMatch(
  response: ResumeJobMatchApiResponse,
): ResumeJobMatchResponse {
  return {
    matchScore: response.matchScore ?? response.MatchScore ?? 0,
    summary: response.summary ?? response.Summary ?? '',
    matchedSkills: response.matchedSkills ?? response.MatchedSkills ?? [],
    missingSkills: response.missingSkills ?? response.MissingSkills ?? [],
    strengths: response.strengths ?? response.Strengths ?? [],
    recommendations:
      response.recommendations ?? response.Recommendations ?? [],
  }
}

function toInterviewPrep(response: InterviewPrepApiResponse): InterviewPrepResponse {
  return {
    summary: response.summary ?? response.Summary ?? '',
    technicalQuestions: (
      response.technicalQuestions ??
      response.TechnicalQuestions ??
      []
    ).map(toTechnicalInterviewQuestion),
    behavioralQuestions: (
      response.behavioralQuestions ??
      response.BehavioralQuestions ??
      []
    ).map(toBehavioralInterviewQuestion),
    cvBasedQuestions: (
      response.cvBasedQuestions ??
      response.CvBasedQuestions ??
      []
    ).map(toCvBasedInterviewQuestion),
    questionsToAskEmployer:
      response.questionsToAskEmployer ?? response.QuestionsToAskEmployer ?? [],
  }
}

function toTechnicalInterviewQuestion(
  response: TechnicalInterviewQuestionApiResponse,
): TechnicalInterviewQuestion {
  return {
    question: response.question ?? response.Question ?? '',
    whyAsked: response.whyAsked ?? response.WhyAsked ?? '',
    answerGuidance: response.answerGuidance ?? response.AnswerGuidance ?? '',
    difficulty: toInterviewQuestionDifficulty(
      response.difficulty ?? response.Difficulty,
    ),
  }
}

function toBehavioralInterviewQuestion(
  response: BehavioralInterviewQuestionApiResponse,
): BehavioralInterviewQuestion {
  return {
    question: response.question ?? response.Question ?? '',
    whyAsked: response.whyAsked ?? response.WhyAsked ?? '',
    answerGuidance: response.answerGuidance ?? response.AnswerGuidance ?? '',
  }
}

function toCvBasedInterviewQuestion(
  response: CvBasedInterviewQuestionApiResponse,
): CvBasedInterviewQuestion {
  return {
    question: response.question ?? response.Question ?? '',
    cvEvidence: response.cvEvidence ?? response.CvEvidence ?? '',
    answerGuidance: response.answerGuidance ?? response.AnswerGuidance ?? '',
  }
}

function toInterviewQuestionDifficulty(
  value: string | undefined,
): InterviewQuestionDifficulty {
  if (value === 'Easy' || value === 'Hard') {
    return value
  }

  return 'Medium'
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
