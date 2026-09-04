export interface ResumeJobMatchResponse {
  matchScore: number
  summary: string
  matchedSkills: string[]
  missingSkills: string[]
  strengths: string[]
  recommendations: string[]
}
