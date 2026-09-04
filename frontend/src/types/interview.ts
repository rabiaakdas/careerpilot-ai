export type InterviewQuestionDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface InterviewPrepResponse {
  summary: string
  technicalQuestions: TechnicalInterviewQuestion[]
  behavioralQuestions: BehavioralInterviewQuestion[]
  cvBasedQuestions: CvBasedInterviewQuestion[]
  questionsToAskEmployer: string[]
}

export interface TechnicalInterviewQuestion {
  question: string
  whyAsked: string
  answerGuidance: string
  difficulty: InterviewQuestionDifficulty
}

export interface BehavioralInterviewQuestion {
  question: string
  whyAsked: string
  answerGuidance: string
}

export interface CvBasedInterviewQuestion {
  question: string
  cvEvidence: string
  answerGuidance: string
}
