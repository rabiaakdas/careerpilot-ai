import { type FormEvent, useEffect, useMemo, useState } from 'react'
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
  getJobById,
  getJobs,
  UnauthorizedError,
  updateJob,
} from './services/jobService'
import type { CreateJobRequest, Job, UpdateJobRequest } from './types/job'

type AuthMode = 'login' | 'register'
type JobView = 'list' | 'new' | 'detail' | 'edit'

interface RouteState {
  view: JobView
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
    if (!route.jobId) {
      setSelectedJob(null)
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

      {route.view === 'detail' && (
        <JobDetail
          job={visibleJob}
          isLoading={isDetailLoading && !visibleJob}
          onBack={() => onNavigate('/jobs')}
          onEdit={(job) => onNavigate(`/jobs/${job.id}/edit`)}
          onDelete={setDeleteCandidate}
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
  onBack: () => void
  onEdit: (job: Job) => void
  onDelete: (job: Job) => void
}

function JobDetail({ job, isLoading, onBack, onEdit, onDelete }: JobDetailProps) {
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
    </section>
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export default App
