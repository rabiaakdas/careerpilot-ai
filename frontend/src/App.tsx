import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './App.css'
import {
  login,
  register,
  type LoginRequest,
  type RegisterRequest,
} from './services/authService'
import {
  createJob,
  deleteJob,
  getInterviewPrep,
  getJobById,
  getJobs,
  matchResumeWithJob,
  ApiError,
  UnauthorizedError,
  updateJob,
} from './services/jobService'
import {
  deleteResume,
  getMyResume,
  MAX_RESUME_FILE_SIZE,
  uploadResume,
} from './services/resumeService'
import type { InterviewPrepResponse } from './types/interview'
import type { CreateJobRequest, Job, UpdateJobRequest } from './types/job'
import type { ResumeJobMatchResponse } from './types/match'
import type { Resume } from './types/resume'

type AuthMode = 'login' | 'register'
type AppView = 'list' | 'new' | 'detail' | 'edit' | 'resume'

interface RouteState {
  view: AppView
  jobId?: string
}

const initialLoginForm: LoginRequest = {
  email: '',
  password: '',
}

const initialRegisterForm: RegisterRequest = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
}

const initialJobForm: CreateJobRequest = {
  companyName: '',
  positionTitle: '',
  description: '',
  location: '',
  jobUrl: '',
}

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loginForm, setLoginForm] = useState<LoginRequest>(initialLoginForm)
  const [registerForm, setRegisterForm] =
    useState<RegisterRequest>(initialRegisterForm)
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem('accessToken')),
  )
  const [authLoading, setAuthLoading] = useState(false)
  const [authErrorMessage, setAuthErrorMessage] = useState('')
  const [authSuccessMessage, setAuthSuccessMessage] = useState('')
  const [route, setRoute] = useState<RouteState>(() =>
    getRouteState(window.location.pathname),
  )

  useEffect(() => {
    function handlePopState() {
      setRoute(getRouteState(window.location.pathname))
    }

    window.addEventListener('popstate', handlePopState)

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const isLogin = authMode === 'login'

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')

    try {
      const response = await login(loginForm)
      localStorage.setItem('accessToken', response.accessToken)
      setIsAuthenticated(true)
      setAuthSuccessMessage(`Welcome back, ${response.firstName}.`)
      navigateTo('/jobs')
    } catch (error) {
      setAuthErrorMessage(getErrorMessage(error))
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')

    try {
      await register(registerForm)
      setRegisterForm(initialRegisterForm)
      setAuthSuccessMessage('Registration completed successfully.')
    } catch (error) {
      setAuthErrorMessage(getErrorMessage(error))
    } finally {
      setAuthLoading(false)
    }
  }

  function switchMode(mode: AuthMode) {
    setAuthMode(mode)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')
  }

  function navigateTo(path: string) {
    window.history.pushState(null, '', path)
    setRoute(getRouteState(path))
  }

  function handleUnauthorized(message?: string) {
    localStorage.removeItem('accessToken')
    setIsAuthenticated(false)
    setAuthMode('login')
    setAuthErrorMessage(message ?? 'Please login to continue.')
    navigateTo('/')
  }

  function handleLogout() {
    localStorage.removeItem('accessToken')
    setIsAuthenticated(false)
    setLoginForm(initialLoginForm)
    setAuthSuccessMessage('')
    setAuthErrorMessage('')
    navigateTo('/')
  }

  if (isAuthenticated) {
    return (
      <JobsPage
        route={route}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onUnauthorized={handleUnauthorized}
      />
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-labelledby="auth-title">
        <p className="eyebrow">CareerPilot AI</p>
        <h1 id="auth-title">Your career workspace starts here.</h1>
        <p className="intro-copy">
          Create an account or sign in to continue building your career plan.
        </p>
      </section>

      <section className="auth-panel" aria-label="Authentication form">
        <div className="auth-tabs" role="tablist" aria-label="Authentication">
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => switchMode('login')}
            disabled={authLoading}
          >
            Login
          </button>
          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => switchMode('register')}
            disabled={authLoading}
          >
            Register
          </button>
        </div>

        {isLogin ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label>
              Email
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, email: event.target.value })
                }
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, password: event.target.value })
                }
                autoComplete="current-password"
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={authLoading}
            >
              {authLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="name-fields">
              <label>
                First Name
                <input
                  type="text"
                  value={registerForm.firstName}
                  onChange={(event) =>
                    setRegisterForm({
                      ...registerForm,
                      firstName: event.target.value,
                    })
                  }
                  autoComplete="given-name"
                />
              </label>

              <label>
                Last Name
                <input
                  type="text"
                  value={registerForm.lastName}
                  onChange={(event) =>
                    setRegisterForm({
                      ...registerForm,
                      lastName: event.target.value,
                    })
                  }
                  autoComplete="family-name"
                />
              </label>
            </div>

            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, email: event.target.value })
                }
                autoComplete="email"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) =>
                  setRegisterForm({
                    ...registerForm,
                    password: event.target.value,
                  })
                }
                autoComplete="new-password"
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={authLoading}
            >
              {authLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}

        {authErrorMessage && <p className="message error">{authErrorMessage}</p>}
        {authSuccessMessage && (
          <p className="message success">{authSuccessMessage}</p>
        )}
      </section>
    </main>
  )
}

interface JobsPageProps {
  route: RouteState
  onNavigate: (path: string) => void
  onLogout: () => void
  onUnauthorized: (message?: string) => void
}

function JobsPage({
  route,
  onNavigate,
  onLogout,
  onUnauthorized,
}: JobsPageProps) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [deleteCandidate, setDeleteCandidate] = useState<Job | null>(null)
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null)
  const [matchResult, setMatchResult] =
    useState<ResumeJobMatchResponse | null>(null)
  const [matchErrorMessage, setMatchErrorMessage] = useState('')
  const [isMatchLoading, setIsMatchLoading] = useState(false)
  const [interviewResult, setInterviewResult] =
    useState<InterviewPrepResponse | null>(null)
  const [interviewErrorMessage, setInterviewErrorMessage] = useState('')
  const [isInterviewLoading, setIsInterviewLoading] = useState(false)

  const visibleJob = useMemo(() => {
    if (!route.jobId) {
      return null
    }

    return jobs.find((job) => job.id === route.jobId) ?? selectedJob
  }, [jobs, route.jobId, selectedJob])

  useEffect(() => {
    void loadJobs()
  }, [])

  useEffect(() => {
    setMatchResult(null)
    setMatchErrorMessage('')
    setInterviewResult(null)
    setInterviewErrorMessage('')
  }, [route.jobId])

  useEffect(() => {
    if (!route.jobId) {
      setSelectedJob(null)
      setMatchResult(null)
      setMatchErrorMessage('')
      setInterviewResult(null)
      setInterviewErrorMessage('')
      return
    }

    if (jobs.some((job) => job.id === route.jobId)) {
      return
    }

    void loadJob(route.jobId)
  }, [jobs, route.jobId])

  async function loadJobs() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      setJobs(await getJobs())
    } catch (error) {
      handleJobError(error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadJob(id: string) {
    setIsDetailLoading(true)
    setErrorMessage('')

    try {
      setSelectedJob(await getJobById(id))
    } catch (error) {
      handleJobError(error)
    } finally {
      setIsDetailLoading(false)
    }
  }

  async function handleCreate(request: CreateJobRequest) {
    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const createdJob = await createJob(request)
      setJobs((currentJobs) => [createdJob, ...currentJobs])
      setSuccessMessage('Job created successfully.')
      onNavigate(`/jobs/${createdJob.id}`)
    } catch (error) {
      handleJobError(error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleUpdate(request: UpdateJobRequest) {
    if (!route.jobId) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const updatedJob = await updateJob(route.jobId, request)
      setJobs((currentJobs) =>
        currentJobs.map((job) => (job.id === updatedJob.id ? updatedJob : job)),
      )
      setSelectedJob(updatedJob)
      setSuccessMessage('Job updated successfully.')
      onNavigate(`/jobs/${updatedJob.id}`)
    } catch (error) {
      handleJobError(error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(job: Job) {
    setDeletingJobId(job.id)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteJob(job.id)
      setJobs((currentJobs) =>
        currentJobs.filter((currentJob) => currentJob.id !== job.id),
      )
      setDeleteCandidate(null)
      setSuccessMessage('Job deleted successfully.')

      if (route.jobId === job.id) {
        onNavigate('/jobs')
      }
    } catch (error) {
      handleJobError(error)
    } finally {
      setDeletingJobId(null)
    }
  }

  async function handleAnalyzeMatch(job: Job) {
    if (isMatchLoading) {
      return
    }

    setIsMatchLoading(true)
    setMatchErrorMessage('')
    setMatchResult(null)

    try {
      setMatchResult(await matchResumeWithJob(job.id))
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        onUnauthorized(error.message)
        return
      }

      setMatchErrorMessage(getMatchErrorMessage(error))
    } finally {
      setIsMatchLoading(false)
    }
  }

  async function handlePrepareInterview(job: Job) {
    if (isInterviewLoading) {
      return
    }

    setIsInterviewLoading(true)
    setInterviewErrorMessage('')
    setInterviewResult(null)

    try {
      setInterviewResult(await getInterviewPrep(job.id))
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        onUnauthorized(error.message)
        return
      }

      setInterviewErrorMessage(getInterviewErrorMessage(error))
    } finally {
      setIsInterviewLoading(false)
    }
  }

  function handleJobError(error: unknown) {
    if (error instanceof UnauthorizedError) {
      onUnauthorized(error.message)
      return
    }

    setErrorMessage(getErrorMessage(error))
  }

  return (
    <main className="jobs-page">
      <header className="jobs-header">
        <div>
          <p className="eyebrow">CareerPilot AI</p>
          <h1>Job Management</h1>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate('/jobs')}
          >
            Jobs
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate('/resume')}
          >
            Resume
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate('/jobs/new')}
          >
            New Job
          </button>
          <button type="button" className="ghost-button" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      {successMessage && <p className="message success">{successMessage}</p>}
      {errorMessage && <p className="message error">{errorMessage}</p>}

      {route.view === 'new' && (
        <JobForm
          title="Create job"
          submitLabel="Create Job"
          isSaving={isSaving}
          onSubmit={handleCreate}
          onCancel={() => onNavigate('/jobs')}
        />
      )}

      {route.view === 'edit' && (
        <JobForm
          title="Edit job"
          submitLabel="Save Changes"
          initialValue={visibleJob ?? undefined}
          isLoading={isDetailLoading && !visibleJob}
          isSaving={isSaving}
          onSubmit={handleUpdate}
          onCancel={() =>
            route.jobId ? onNavigate(`/jobs/${route.jobId}`) : onNavigate('/jobs')
          }
        />
      )}

      {route.view === 'resume' && (
        <ResumePage
          onUnauthorized={onUnauthorized}
          onBackToJobs={() => onNavigate('/jobs')}
        />
      )}

      {route.view === 'detail' && (
        <JobDetail
          job={visibleJob}
          isLoading={isDetailLoading && !visibleJob}
          isMatchLoading={isMatchLoading}
          matchResult={matchResult}
          matchErrorMessage={matchErrorMessage}
          isInterviewLoading={isInterviewLoading}
          interviewResult={interviewResult}
          interviewErrorMessage={interviewErrorMessage}
          onBack={() => onNavigate('/jobs')}
          onEdit={(job) => onNavigate(`/jobs/${job.id}/edit`)}
          onDelete={setDeleteCandidate}
          onAnalyzeMatch={handleAnalyzeMatch}
          onPrepareInterview={handlePrepareInterview}
          onOpenResume={() => onNavigate('/resume')}
        />
      )}

      {route.view === 'list' && (
        <JobList
          jobs={jobs}
          isLoading={isLoading}
          onCreate={() => onNavigate('/jobs/new')}
          onView={(job) => onNavigate(`/jobs/${job.id}`)}
          onEdit={(job) => onNavigate(`/jobs/${job.id}/edit`)}
          onDelete={setDeleteCandidate}
        />
      )}

      {deleteCandidate && (
        <DeleteConfirmation
          job={deleteCandidate}
          isDeleting={deletingJobId === deleteCandidate.id}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => handleDelete(deleteCandidate)}
        />
      )}
    </main>
  )
}

interface JobListProps {
  jobs: Job[]
  isLoading: boolean
  onCreate: () => void
  onView: (job: Job) => void
  onEdit: (job: Job) => void
  onDelete: (job: Job) => void
}

interface ResumePageProps {
  onUnauthorized: (message?: string) => void
  onBackToJobs: () => void
}

function ResumePage({ onUnauthorized, onBackToJobs }: ResumePageProps) {
  const [resume, setResume] = useState<Resume | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [validationMessage, setValidationMessage] = useState('')

  useEffect(() => {
    void loadResume()
  }, [])

  async function loadResume() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      setResume(await getMyResume())
    } catch (error) {
      handleResumeError(error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleFileChange(file: File | null) {
    setSelectedFile(file)
    setValidationMessage('')
    setSuccessMessage('')

    if (!file) {
      return
    }

    const validationError = validateResumeFile(file)

    if (validationError) {
      setValidationMessage(validationError)
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!selectedFile) {
      setValidationMessage('Choose a PDF or DOCX resume first.')
      return
    }

    const validationError = validateResumeFile(selectedFile)

    if (validationError) {
      setValidationMessage(validationError)
      return
    }

    setIsUploading(true)

    try {
      const uploadedResume = await uploadResume(selectedFile)
      setResume(uploadedResume)
      setSelectedFile(null)
      setValidationMessage('')
      setSuccessMessage(
        resume
          ? 'Resume replaced successfully.'
          : 'Resume uploaded successfully.',
      )
    } catch (error) {
      handleResumeError(error)
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteResume() {
    setIsDeleting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await deleteResume()
      setResume(null)
      setSelectedFile(null)
      setShowDeleteConfirmation(false)
      setSuccessMessage('Resume deleted successfully.')
    } catch (error) {
      handleResumeError(error)
    } finally {
      setIsDeleting(false)
    }
  }

  function handleResumeError(error: unknown) {
    if (error instanceof UnauthorizedError) {
      onUnauthorized(error.message)
      return
    }

    setErrorMessage(getResumeErrorMessage(error))
  }

  return (
    <section className="resume-layout" aria-labelledby="resume-title">
      <div className="section-heading">
        <div>
          <h2 id="resume-title">Resume</h2>
          <p>Manage the CV used for AI job matching.</p>
        </div>
        <button type="button" className="secondary-button" onClick={onBackToJobs}>
          Back to Jobs
        </button>
      </div>

      {successMessage && <p className="message success">{successMessage}</p>}
      {errorMessage && <p className="message error">{errorMessage}</p>}

      <div className="resume-grid">
        <section className="resume-card" aria-label="Current resume">
          <h3>Current Resume</h3>

          {isLoading ? (
            <p className="muted-text">Loading resume...</p>
          ) : resume ? (
            <dl className="detail-list resume-details">
              <div>
                <dt>File Name</dt>
                <dd>{resume.originalFileName}</dd>
              </div>
              <div>
                <dt>File Size</dt>
                <dd>{formatFileSize(resume.fileSize)}</dd>
              </div>
              <div>
                <dt>Uploaded</dt>
                <dd>{formatDateTime(resume.uploadedAt)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  {resume.updatedAt
                    ? formatDateTime(resume.updatedAt)
                    : 'Not updated'}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted-text">No resume uploaded yet.</p>
          )}

          {resume && (
            <button
              type="button"
              className="danger-button"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isDeleting || isUploading}
            >
              Delete Resume
            </button>
          )}
        </section>

        <section className="resume-card" aria-label="Resume upload">
          <h3>{resume ? 'Replace Resume' : 'Upload Resume'}</h3>
          <form className="job-form" onSubmit={handleUpload}>
            <label>
              Resume File
              <input
                type="file"
                accept=".pdf,.docx"
                onChange={(event) =>
                  handleFileChange(event.target.files?.[0] ?? null)
                }
                disabled={isUploading || isDeleting}
              />
            </label>

            <p className="muted-text">
              PDF or DOCX only. Maximum file size is 5 MB.
            </p>

            {selectedFile && (
              <p className="selected-file">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}

            {validationMessage && (
              <p className="message error">{validationMessage}</p>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={isUploading || Boolean(validationMessage)}
              >
                {isUploading
                  ? 'Uploading...'
                  : resume
                    ? 'Replace Resume'
                    : 'Upload Resume'}
              </button>
            </div>
          </form>
        </section>
      </div>

      {showDeleteConfirmation && resume && (
        <div className="modal-backdrop">
          <section
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-resume-title"
          >
            <h2 id="delete-resume-title">Delete resume?</h2>
            <p>
              Are you sure you want to delete {resume.originalFileName}? AI match
              analysis will need a new resume.
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteResume}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  )
}

function JobList({
  jobs,
  isLoading,
  onCreate,
  onView,
  onEdit,
  onDelete,
}: JobListProps) {
  if (isLoading) {
    return <p className="state-panel">Loading jobs...</p>
  }

  if (jobs.length === 0) {
    return (
      <section className="state-panel">
        <h2>No jobs yet</h2>
        <p>Add the first role you want to track.</p>
        <button type="button" className="primary-button" onClick={onCreate}>
          New Job
        </button>
      </section>
    )
  }

  return (
    <section className="jobs-grid" aria-label="Jobs">
      {jobs.map((job) => (
        <article className="job-card" key={job.id}>
          <div className="job-card-main">
            <p className="job-company">{job.companyName}</p>
            <h2>{job.positionTitle}</h2>
            <p className="job-meta">{job.location || 'Remote / Not specified'}</p>
            <p className="job-date">Created {formatDate(job.createdAt)}</p>
          </div>
          <div className="job-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onView(job)}
            >
              Detail
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onEdit(job)}
            >
              Edit
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => onDelete(job)}
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </section>
  )
}

interface JobDetailProps {
  job: Job | null
  isLoading: boolean
  isMatchLoading: boolean
  matchResult: ResumeJobMatchResponse | null
  matchErrorMessage: string
  isInterviewLoading: boolean
  interviewResult: InterviewPrepResponse | null
  interviewErrorMessage: string
  onBack: () => void
  onEdit: (job: Job) => void
  onDelete: (job: Job) => void
  onAnalyzeMatch: (job: Job) => void
  onPrepareInterview: (job: Job) => void
  onOpenResume: () => void
}

function JobDetail({
  job,
  isLoading,
  isMatchLoading,
  matchResult,
  matchErrorMessage,
  isInterviewLoading,
  interviewResult,
  interviewErrorMessage,
  onBack,
  onEdit,
  onDelete,
  onAnalyzeMatch,
  onPrepareInterview,
  onOpenResume,
}: JobDetailProps) {
  if (isLoading) {
    return <p className="state-panel">Loading job details...</p>
  }

  if (!job) {
    return (
      <section className="state-panel">
        <h2>Job not found</h2>
        <button type="button" className="secondary-button" onClick={onBack}>
          Back to Jobs
        </button>
      </section>
    )
  }

  return (
    <section className="detail-panel" aria-labelledby="job-detail-title">
      <div className="detail-heading">
        <div>
          <p className="job-company">{job.companyName}</p>
          <h2 id="job-detail-title">{job.positionTitle}</h2>
        </div>
        <div className="job-actions">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onEdit(job)}
          >
            Edit
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(job)}
          >
            Delete
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onAnalyzeMatch(job)}
            disabled={isMatchLoading}
          >
            {isMatchLoading ? 'Analyzing...' : 'Analyze CV Match'}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onPrepareInterview(job)}
            disabled={isInterviewLoading}
          >
            {isInterviewLoading ? 'Preparing...' : 'Prepare for Interview'}
          </button>
        </div>
      </div>

      <dl className="detail-list">
        <div>
          <dt>Location</dt>
          <dd>{job.location || 'Not specified'}</dd>
        </div>
        <div>
          <dt>Job URL</dt>
          <dd>
            {job.jobUrl ? (
              <a href={job.jobUrl} target="_blank" rel="noreferrer noopener">
                {job.jobUrl}
              </a>
            ) : (
              'Not specified'
            )}
          </dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>{formatDateTime(job.createdAt)}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{job.updatedAt ? formatDateTime(job.updatedAt) : 'Not updated'}</dd>
        </div>
      </dl>

      <div className="description-block">
        <h3>Description</h3>
        <p>{job.description}</p>
      </div>

      {matchErrorMessage && (
        <div className="match-error-panel">
          <p className="message error">{matchErrorMessage}</p>
          {isResumeMissingError(matchErrorMessage) && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenResume}
            >
              Go to Resume
            </button>
          )}
        </div>
      )}

      {matchResult && <MatchResultPanel result={matchResult} />}

      {interviewErrorMessage && (
        <div className="match-error-panel">
          <p className="message error">{interviewErrorMessage}</p>
          {isResumeMissingError(interviewErrorMessage) && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenResume}
            >
              Go to Resume
            </button>
          )}
        </div>
      )}

      {interviewResult && <InterviewPrepPanel result={interviewResult} />}
    </section>
  )
}

function MatchResultPanel({ result }: { result: ResumeJobMatchResponse }) {
  const score = Math.min(Math.max(result.matchScore, 0), 100)

  return (
    <section className="match-panel" aria-labelledby="match-title">
      <div className="match-score-row">
        <div>
          <p className="eyebrow">AI CV Match</p>
          <h3 id="match-title">Match Score</h3>
        </div>
        <strong>{score} / 100</strong>
      </div>

      <div
        className="score-bar"
        role="progressbar"
        aria-label="Match score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <span style={{ width: `${score}%` }} />
      </div>

      <section className="match-section">
        <h4>Summary</h4>
        <p>{result.summary || 'No summary returned.'}</p>
      </section>

      <div className="match-columns">
        <SkillList title="Matched Skills" items={result.matchedSkills} />
        <SkillList title="Missing Skills" items={result.missingSkills} />
      </div>

      <div className="match-columns">
        <BulletList title="Strengths" items={result.strengths} />
        <BulletList title="Recommendations" items={result.recommendations} />
      </div>
    </section>
  )
}

function SkillList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="match-section">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul className="skill-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">None identified.</p>
      )}
    </section>
  )
}

function BulletList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="match-section">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <ul className="plain-list">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted-text">None identified.</p>
      )}
    </section>
  )
}

function InterviewPrepPanel({ result }: { result: InterviewPrepResponse }) {
  return (
    <section className="interview-panel" aria-labelledby="interview-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">AI Interview Prep</p>
          <h3 id="interview-title">Personalized Interview Preparation</h3>
        </div>
      </div>

      <section className="interview-summary">
        <h4>Summary</h4>
        <p>{result.summary || 'No summary returned.'}</p>
      </section>

      <InterviewQuestionSection
        title="Technical Questions"
        items={result.technicalQuestions}
        renderItem={(item) => (
          <QuestionCard key={item.question} question={item.question}>
            <p className="difficulty-badge">Difficulty: {item.difficulty}</p>
            <QuestionDetail
              label="Why this may be asked"
              value={item.whyAsked}
            />
            <QuestionDetail
              label="Answer guidance"
              value={item.answerGuidance}
            />
          </QuestionCard>
        )}
      />

      <InterviewQuestionSection
        title="Behavioral Questions"
        items={result.behavioralQuestions}
        renderItem={(item) => (
          <QuestionCard key={item.question} question={item.question}>
            <QuestionDetail
              label="Why this may be asked"
              value={item.whyAsked}
            />
            <QuestionDetail
              label="Answer guidance"
              value={item.answerGuidance}
            />
          </QuestionCard>
        )}
      />

      <InterviewQuestionSection
        title="CV-Based Questions"
        items={result.cvBasedQuestions}
        renderItem={(item) => (
          <QuestionCard key={item.question} question={item.question}>
            <QuestionDetail
              label="CV evidence"
              value={item.cvEvidence}
              variant="evidence"
            />
            <QuestionDetail
              label="Answer guidance"
              value={item.answerGuidance}
            />
          </QuestionCard>
        )}
      />

      <section className="interview-section">
        <h4>Questions You Can Ask the Employer</h4>
        {result.questionsToAskEmployer.length > 0 ? (
          <ul className="plain-list">
            {result.questionsToAskEmployer.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">None identified.</p>
        )}
      </section>
    </section>
  )
}

function InterviewQuestionSection<TItem>({
  title,
  items,
  renderItem,
}: {
  title: string
  items: TItem[]
  renderItem: (item: TItem) => ReactNode
}) {
  return (
    <section className="interview-section">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <div className="question-grid">{items.map(renderItem)}</div>
      ) : (
        <p className="muted-text">None identified.</p>
      )}
    </section>
  )
}

function QuestionCard({
  question,
  children,
}: {
  question: string
  children: ReactNode
}) {
  return (
    <article className="question-card">
      <h5>{question}</h5>
      {children}
    </article>
  )
}

function QuestionDetail({
  label,
  value,
  variant,
}: {
  label: string
  value: string
  variant?: 'evidence'
}) {
  return (
    <div
      className={
        variant === 'evidence' ? 'question-detail evidence' : 'question-detail'
      }
    >
      <strong>{label}</strong>
      <p>{value}</p>
    </div>
  )
}

interface JobFormProps {
  title: string
  submitLabel: string
  initialValue?: Job
  isLoading?: boolean
  isSaving: boolean
  onSubmit: (request: CreateJobRequest) => Promise<void>
  onCancel: () => void
}

function JobForm({
  title,
  submitLabel,
  initialValue,
  isLoading = false,
  isSaving,
  onSubmit,
  onCancel,
}: JobFormProps) {
  const [form, setForm] = useState<CreateJobRequest>(() =>
    initialValue ? toJobForm(initialValue) : initialJobForm,
  )
  const [validationMessage, setValidationMessage] = useState('')

  useEffect(() => {
    setForm(initialValue ? toJobForm(initialValue) : initialJobForm)
    setValidationMessage('')
  }, [initialValue])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationMessage('')

    if (!form.companyName.trim()) {
      setValidationMessage('Company name is required.')
      return
    }

    if (!form.positionTitle.trim()) {
      setValidationMessage('Position title is required.')
      return
    }

    if (!form.description.trim()) {
      setValidationMessage('Description is required.')
      return
    }

    await onSubmit(form)
  }

  if (isLoading) {
    return <p className="state-panel">Loading job form...</p>
  }

  return (
    <section className="form-panel" aria-labelledby="job-form-title">
      <h2 id="job-form-title">{title}</h2>
      <form className="job-form" onSubmit={handleSubmit}>
        <label>
          Company Name
          <input
            type="text"
            value={form.companyName}
            onChange={(event) =>
              setForm({ ...form, companyName: event.target.value })
            }
            required
          />
        </label>

        <label>
          Position Title
          <input
            type="text"
            value={form.positionTitle}
            onChange={(event) =>
              setForm({ ...form, positionTitle: event.target.value })
            }
            required
          />
        </label>

        <label>
          Description
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm({ ...form, description: event.target.value })
            }
            rows={8}
            required
          />
        </label>

        <div className="form-row">
          <label>
            Location
            <input
              type="text"
              value={form.location ?? ''}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
            />
          </label>

          <label>
            Job URL
            <input
              type="url"
              value={form.jobUrl ?? ''}
              onChange={(event) =>
                setForm({ ...form, jobUrl: event.target.value })
              }
            />
          </label>
        </div>

        {validationMessage && (
          <p className="message error">{validationMessage}</p>
        )}

        <div className="form-actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </section>
  )
}

interface DeleteConfirmationProps {
  job: Job
  isDeleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

function DeleteConfirmation({
  job,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationProps) {
  return (
    <div className="modal-backdrop">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">Delete job?</h2>
        <p>
          Are you sure you want to delete {job.positionTitle} at{' '}
          {job.companyName}?
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </section>
    </div>
  )
}

function getRouteState(pathname: string): RouteState {
  if (pathname === '/resume') {
    return { view: 'resume' }
  }

  if (pathname === '/jobs/new') {
    return { view: 'new' }
  }

  const match = pathname.match(/^\/jobs\/([^/]+)(?:\/(edit))?$/)

  if (match) {
    return {
      view: match[2] === 'edit' ? 'edit' : 'detail',
      jobId: match[1],
    }
  }

  return { view: 'list' }
}

function toJobForm(job: Job): CreateJobRequest {
  return {
    companyName: job.companyName,
    positionTitle: job.positionTitle,
    description: job.description,
    location: job.location ?? '',
    jobUrl: job.jobUrl ?? '',
  }
}

function formatDate(value: string) {
  if (!value) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  if (!value) {
    return 'Unknown date'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatFileSize(value: number) {
  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

function validateResumeFile(file: File) {
  const fileName = file.name.toLowerCase()
  const isAllowedExtension =
    fileName.endsWith('.pdf') || fileName.endsWith('.docx')

  if (!isAllowedExtension) {
    return 'Only PDF and DOCX files are allowed.'
  }

  if (file.size === 0) {
    return 'Resume file cannot be empty.'
  }

  if (file.size > MAX_RESUME_FILE_SIZE) {
    return 'Resume file must be 5 MB or smaller.'
  }

  return ''
}

function getResumeErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return error.message
    }

    if (error.status === 404) {
      return 'No resume uploaded yet.'
    }
  }

  return getErrorMessage(error)
}

function getMatchErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return error.message.toLowerCase().includes('resume')
        ? 'Upload a resume before running AI match analysis.'
        : 'Job not found.'
    }

    if (error.status === 422) {
      return 'The resume could not be read. It may be a scanned PDF or a damaged file.'
    }

    if (error.status === 502) {
      return 'The AI provider could not complete the match. Please try again.'
    }

    if (error.status === 503) {
      return 'AI match is not configured yet.'
    }

    if (error.status === 504) {
      return 'AI match timed out. Please try again.'
    }

    if (error.message) {
      return error.message
    }
  }

  return getErrorMessage(error)
}

function getInterviewErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return error.message.toLowerCase().includes('resume')
        ? 'Upload a resume before preparing for an interview.'
        : 'Job not found.'
    }

    if (error.status === 422) {
      return 'The resume could not be read. It may be a scanned PDF or a damaged file.'
    }

    if (error.status === 502) {
      return 'The AI provider could not complete the interview preparation. Please try again.'
    }

    if (error.status === 503) {
      return 'AI interview preparation is not configured yet.'
    }

    if (error.status === 504) {
      return 'AI interview preparation timed out. Please try again.'
    }

    if (error.message) {
      return error.message
    }
  }

  return getErrorMessage(error)
}

function isResumeMissingError(message: string) {
  return message.toLowerCase().includes('upload a resume')
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export default App
