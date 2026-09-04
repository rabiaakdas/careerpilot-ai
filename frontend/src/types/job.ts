export interface Job {
  id: string
  companyName: string
  positionTitle: string
  description: string
  location: string | null
  jobUrl: string | null
  createdAt: string
  updatedAt: string | null
}

export interface CreateJobRequest {
  companyName: string
  positionTitle: string
  description: string
  location?: string | null
  jobUrl?: string | null
}

export interface UpdateJobRequest {
  companyName: string
  positionTitle: string
  description: string
  location?: string | null
  jobUrl?: string | null
}
