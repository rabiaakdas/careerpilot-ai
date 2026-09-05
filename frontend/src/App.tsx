import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './App.css'
import {
  createTranslator,
  getDifficultyLabel,
  getInitialLanguage,
  getLocale,
  persistLanguage,
  type Translator,
} from './i18n/i18n'
import type { Language } from './i18n/translations'
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
  const [language, setLanguage] = useState<Language>(getInitialLanguage)
  const t = useMemo(() => createTranslator(language), [language])
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

  useEffect(() => {
    persistLanguage(language)
  }, [language])

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')

    if (!loginForm.email.trim()) {
      setAuthLoading(false)
      setAuthErrorMessage(t('auth.emailRequired'))
      return
    }

    if (!loginForm.password.trim()) {
      setAuthLoading(false)
      setAuthErrorMessage(t('auth.passwordRequired'))
      return
    }

    try {
      const response = await login(loginForm)
      localStorage.setItem('accessToken', response.accessToken)
      setIsAuthenticated(true)
      setAuthSuccessMessage(t('auth.welcomeBack', { name: response.firstName }))
      navigateTo('/jobs')
    } catch (error) {
      setAuthErrorMessage(getErrorMessage(error, t))
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthLoading(true)
    setAuthErrorMessage('')
    setAuthSuccessMessage('')

    if (!registerForm.firstName.trim()) {
      setAuthLoading(false)
      setAuthErrorMessage(t('auth.firstNameRequired'))
      return
    }

    if (!registerForm.lastName.trim()) {
      setAuthLoading(false)
      setAuthErrorMessage(t('auth.lastNameRequired'))
      return
    }

    if (!registerForm.email.trim()) {
      setAuthLoading(false)
      setAuthErrorMessage(t('auth.emailRequired'))
      return
    }

    if (!registerForm.password.trim()) {
      setAuthLoading(false)
      setAuthErrorMessage(t('auth.passwordRequired'))
      return
    }

    try {
      await register(registerForm)
      setRegisterForm(initialRegisterForm)
      setAuthSuccessMessage(t('auth.registrationSuccess'))
    } catch (error) {
      setAuthErrorMessage(getErrorMessage(error, t))
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
    setAuthErrorMessage(message ?? t('errors.sessionExpired'))
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
        language={language}
        onLanguageChange={setLanguage}
        t={t}
      />
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-intro" aria-labelledby="auth-title">
        <p className="eyebrow">{t('brand')}</p>
        <h1 id="auth-title">{t('auth.title')}</h1>
        <p className="intro-copy">{t('auth.intro')}</p>
      </section>

      <section className="auth-panel" aria-label={t('auth.formLabel')}>
        <div className="auth-panel-top">
          <LanguageSwitcher
            language={language}
            onLanguageChange={setLanguage}
            t={t}
          />
        </div>
        <div className="auth-tabs" role="tablist" aria-label={t('auth.tabsLabel')}>
          <button
            type="button"
            className={isLogin ? 'active' : ''}
            onClick={() => switchMode('login')}
            disabled={authLoading}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => switchMode('register')}
            disabled={authLoading}
          >
            {t('auth.register')}
          </button>
        </div>

        {isLogin ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label>
              {t('auth.email')}
              <input
                type="email"
                value={loginForm.email}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, email: event.target.value })
                }
                autoComplete="email"
                required
              />
            </label>

            <label>
              {t('auth.password')}
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm({ ...loginForm, password: event.target.value })
                }
                autoComplete="current-password"
                required
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={authLoading}
            >
              {authLoading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <div className="name-fields">
              <label>
                {t('auth.firstName')}
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
                  required
                />
              </label>

              <label>
                {t('auth.lastName')}
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
                  required
                />
              </label>
            </div>

            <label>
              {t('auth.email')}
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm({ ...registerForm, email: event.target.value })
                }
                autoComplete="email"
                required
              />
            </label>

            <label>
              {t('auth.password')}
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
                required
              />
            </label>

            <button
              type="submit"
              className="primary-button"
              disabled={authLoading}
            >
              {authLoading ? t('auth.creatingAccount') : t('auth.register')}
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

interface LanguageSwitcherProps {
  language: Language
  onLanguageChange: (language: Language) => void
  t: Translator
}

function LanguageSwitcher({
  language,
  onLanguageChange,
  t,
}: LanguageSwitcherProps) {
  return (
    <div
      className="language-switcher"
      role="group"
      aria-label={t('language.label')}
    >
      <button
        type="button"
        className={language === 'tr' ? 'active' : ''}
        onClick={() => onLanguageChange('tr')}
        aria-pressed={language === 'tr'}
      >
        {t('language.tr')}
      </button>
      <button
        type="button"
        className={language === 'en' ? 'active' : ''}
        onClick={() => onLanguageChange('en')}
        aria-pressed={language === 'en'}
      >
        {t('language.en')}
      </button>
    </div>
  )
}

interface JobsPageProps {
  route: RouteState
  onNavigate: (path: string) => void
  onLogout: () => void
  onUnauthorized: (message?: string) => void
  language: Language
  onLanguageChange: (language: Language) => void
  t: Translator
}

function JobsPage({
  route,
  onNavigate,
  onLogout,
  onUnauthorized,
  language,
  onLanguageChange,
  t,
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
      setSuccessMessage(t('jobs.createSuccess'))
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
      setSuccessMessage(t('jobs.updateSuccess'))
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
      setSuccessMessage(t('jobs.deleteSuccess'))

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
        onUnauthorized()
        return
      }

      setMatchErrorMessage(getMatchErrorMessage(error, t))
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
        onUnauthorized()
        return
      }

      setInterviewErrorMessage(getInterviewErrorMessage(error, t))
    } finally {
      setIsInterviewLoading(false)
    }
  }

  function handleJobError(error: unknown) {
    if (error instanceof UnauthorizedError) {
      onUnauthorized()
      return
    }

    setErrorMessage(getErrorMessage(error, t))
  }

  return (
    <main className="jobs-page">
      <header className="jobs-header">
        <div>
          <p className="eyebrow">{t('brand')}</p>
          <h1>{t('jobs.title')}</h1>
        </div>
        <div className="header-actions">
          <LanguageSwitcher
            language={language}
            onLanguageChange={onLanguageChange}
            t={t}
          />
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate('/jobs')}
          >
            {t('nav.jobs')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onNavigate('/resume')}
          >
            {t('nav.resume')}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onNavigate('/jobs/new')}
          >
            {t('nav.newJob')}
          </button>
          <button type="button" className="ghost-button" onClick={onLogout}>
            {t('nav.logout')}
          </button>
        </div>
      </header>

      {successMessage && <p className="message success">{successMessage}</p>}
      {errorMessage && <p className="message error">{errorMessage}</p>}

      {route.view === 'new' && (
        <JobForm
          title={t('jobs.createJobTitle')}
          submitLabel={t('jobs.createJob')}
          isSaving={isSaving}
          t={t}
          onSubmit={handleCreate}
          onCancel={() => onNavigate('/jobs')}
        />
      )}

      {route.view === 'edit' && (
        <JobForm
          title={t('jobs.editJob')}
          submitLabel={t('jobs.saveChanges')}
          initialValue={visibleJob ?? undefined}
          isLoading={isDetailLoading && !visibleJob}
          isSaving={isSaving}
          t={t}
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
          language={language}
          t={t}
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
          language={language}
          t={t}
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
          language={language}
          t={t}
        />
      )}

      {deleteCandidate && (
        <DeleteConfirmation
          job={deleteCandidate}
          isDeleting={deletingJobId === deleteCandidate.id}
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => handleDelete(deleteCandidate)}
          t={t}
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
  language: Language
  t: Translator
}

interface ResumePageProps {
  onUnauthorized: (message?: string) => void
  onBackToJobs: () => void
  language: Language
  t: Translator
}

function ResumePage({
  onUnauthorized,
  onBackToJobs,
  language,
  t,
}: ResumePageProps) {
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

    const validationError = validateResumeFile(file, t)

    if (validationError) {
      setValidationMessage(validationError)
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!selectedFile) {
      setValidationMessage(t('resume.chooseFirst'))
      return
    }

    const validationError = validateResumeFile(selectedFile, t)

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
        resume ? t('resume.replacedSuccess') : t('resume.uploadedSuccess'),
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
      setSuccessMessage(t('resume.deletedSuccess'))
    } catch (error) {
      handleResumeError(error)
    } finally {
      setIsDeleting(false)
    }
  }

  function handleResumeError(error: unknown) {
    if (error instanceof UnauthorizedError) {
      onUnauthorized()
      return
    }

    setErrorMessage(getResumeErrorMessage(error, t))
  }

  return (
    <section className="resume-layout" aria-labelledby="resume-title">
      <div className="section-heading">
        <div>
          <h2 id="resume-title">{t('resume.title')}</h2>
          <p>{t('resume.copy')}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onBackToJobs}>
          {t('jobs.backToJobs')}
        </button>
      </div>

      {successMessage && <p className="message success">{successMessage}</p>}
      {errorMessage && <p className="message error">{errorMessage}</p>}

      <div className="resume-grid">
        <section className="resume-card" aria-label={t('resume.current')}>
          <h3>{t('resume.current')}</h3>

          {isLoading ? (
            <p className="muted-text">{t('resume.loading')}</p>
          ) : resume ? (
            <dl className="detail-list resume-details">
              <div>
                <dt>{t('resume.fileName')}</dt>
                <dd>{resume.originalFileName}</dd>
              </div>
              <div>
                <dt>{t('resume.fileSize')}</dt>
                <dd>{formatFileSize(resume.fileSize, language)}</dd>
              </div>
              <div>
                <dt>{t('resume.uploaded')}</dt>
                <dd>{formatDateTime(resume.uploadedAt, language, t)}</dd>
              </div>
              <div>
                <dt>{t('resume.updated')}</dt>
                <dd>
                  {resume.updatedAt
                    ? formatDateTime(resume.updatedAt, language, t)
                    : t('jobs.notUpdated')}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="muted-text">{t('resume.none')}</p>
          )}

          {resume && (
            <button
              type="button"
              className="danger-button"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isDeleting || isUploading}
            >
              {t('resume.delete')}
            </button>
          )}
        </section>

        <section className="resume-card" aria-label={t('resume.uploadLabel')}>
          <h3>{resume ? t('resume.replace') : t('resume.upload')}</h3>
          <form className="job-form" onSubmit={handleUpload}>
            <label>
              {t('resume.fileLabel')}
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
              {t('resume.fileHelp')}
            </p>

            {selectedFile && (
              <p className="selected-file">
                {t('resume.selected', {
                  fileName: selectedFile.name,
                  fileSize: formatFileSize(selectedFile.size, language),
                })}
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
                  ? t('resume.uploading')
                  : resume
                    ? t('resume.replace')
                    : t('resume.upload')}
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
            <h2 id="delete-resume-title">{t('resume.deleteTitle')}</h2>
            <p>
              {t('resume.deleteConfirm', {
                fileName: resume.originalFileName,
              })}
            </p>
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isDeleting}
              >
                {t('jobs.cancel')}
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteResume}
                disabled={isDeleting}
              >
                {isDeleting ? t('jobs.deleting') : t('jobs.delete')}
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
  language,
  t,
}: JobListProps) {
  if (isLoading) {
    return <p className="state-panel">{t('jobs.loading')}</p>
  }

  if (jobs.length === 0) {
    return (
      <section className="state-panel">
        <h2>{t('jobs.emptyTitle')}</h2>
        <p>{t('jobs.emptyCopy')}</p>
        <button type="button" className="primary-button" onClick={onCreate}>
          {t('nav.newJob')}
        </button>
      </section>
    )
  }

  return (
    <section className="jobs-grid" aria-label={t('nav.jobs')}>
      {jobs.map((job) => (
        <article className="job-card" key={job.id}>
          <div className="job-card-main">
            <p className="job-company">{job.companyName}</p>
            <h2>{job.positionTitle}</h2>
            <p className="job-meta">
              {job.location || t('jobs.remoteNotSpecified')}
            </p>
            <p className="job-date">
              {t('jobs.created')} {formatDate(job.createdAt, language, t)}
            </p>
          </div>
          <div className="job-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => onView(job)}
            >
              {t('jobs.detail')}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => onEdit(job)}
            >
              {t('jobs.edit')}
            </button>
            <button
              type="button"
              className="danger-button"
              onClick={() => onDelete(job)}
            >
              {t('jobs.delete')}
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
  language: Language
  t: Translator
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
  language,
  t,
}: JobDetailProps) {
  if (isLoading) {
    return <p className="state-panel">{t('jobs.loadingDetails')}</p>
  }

  if (!job) {
    return (
      <section className="state-panel">
        <h2>{t('jobs.notFound')}</h2>
        <button type="button" className="secondary-button" onClick={onBack}>
          {t('jobs.backToJobs')}
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
            {t('jobs.back')}
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => onEdit(job)}
          >
            {t('jobs.edit')}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(job)}
          >
            {t('jobs.delete')}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onAnalyzeMatch(job)}
            disabled={isMatchLoading}
          >
            {isMatchLoading ? t('ai.analyzing') : t('ai.analyzeMatch')}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onPrepareInterview(job)}
            disabled={isInterviewLoading}
          >
            {isInterviewLoading
              ? t('ai.preparing')
              : t('ai.prepareInterview')}
          </button>
        </div>
      </div>

      <dl className="detail-list">
        <div>
          <dt>{t('jobs.location')}</dt>
          <dd>{job.location || t('jobs.notSpecified')}</dd>
        </div>
        <div>
          <dt>{t('jobs.jobUrl')}</dt>
          <dd>
            {job.jobUrl ? (
              <a href={job.jobUrl} target="_blank" rel="noreferrer noopener">
                {job.jobUrl}
              </a>
            ) : (
              t('jobs.notSpecified')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('jobs.createdAt')}</dt>
          <dd>{formatDateTime(job.createdAt, language, t)}</dd>
        </div>
        <div>
          <dt>{t('jobs.updatedAt')}</dt>
          <dd>
            {job.updatedAt
              ? formatDateTime(job.updatedAt, language, t)
              : t('jobs.notUpdated')}
          </dd>
        </div>
      </dl>

      <div className="description-block">
        <h3>{t('jobs.description')}</h3>
        <p>{job.description}</p>
      </div>

      {matchErrorMessage && (
        <div className="match-error-panel">
          <p className="message error">{matchErrorMessage}</p>
          {isResumeMissingError(matchErrorMessage, t) && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenResume}
            >
              {t('ai.goToResume')}
            </button>
          )}
        </div>
      )}

      {matchResult && <MatchResultPanel result={matchResult} t={t} />}

      {interviewErrorMessage && (
        <div className="match-error-panel">
          <p className="message error">{interviewErrorMessage}</p>
          {isResumeMissingError(interviewErrorMessage, t) && (
            <button
              type="button"
              className="secondary-button"
              onClick={onOpenResume}
            >
              {t('ai.goToResume')}
            </button>
          )}
        </div>
      )}

      {interviewResult && (
        <InterviewPrepPanel result={interviewResult} language={language} t={t} />
      )}
    </section>
  )
}

function MatchResultPanel({
  result,
  t,
}: {
  result: ResumeJobMatchResponse
  t: Translator
}) {
  const score = Math.min(Math.max(result.matchScore, 0), 100)

  return (
    <section className="match-panel" aria-labelledby="match-title">
      <div className="match-score-row">
        <div>
          <p className="eyebrow">{t('match.eyebrow')}</p>
          <h3 id="match-title">{t('match.title')}</h3>
        </div>
        <strong>{score} / 100</strong>
      </div>

      <div
        className="score-bar"
        role="progressbar"
        aria-label={t('match.progressLabel')}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={score}
      >
        <span style={{ width: `${score}%` }} />
      </div>

      <section className="match-section">
        <h4>{t('match.summary')}</h4>
        <p>{result.summary || t('match.noSummary')}</p>
      </section>

      <div className="match-columns">
        <SkillList title={t('match.matchedSkills')} items={result.matchedSkills} t={t} />
        <SkillList title={t('match.missingSkills')} items={result.missingSkills} t={t} />
      </div>

      <div className="match-columns">
        <BulletList title={t('match.strengths')} items={result.strengths} t={t} />
        <BulletList
          title={t('match.recommendations')}
          items={result.recommendations}
          t={t}
        />
      </div>
    </section>
  )
}

function SkillList({
  title,
  items,
  t,
}: {
  title: string
  items: string[]
  t: Translator
}) {
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
        <p className="muted-text">{t('match.none')}</p>
      )}
    </section>
  )
}

function BulletList({
  title,
  items,
  t,
}: {
  title: string
  items: string[]
  t: Translator
}) {
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
        <p className="muted-text">{t('match.none')}</p>
      )}
    </section>
  )
}

function InterviewPrepPanel({
  result,
  language,
  t,
}: {
  result: InterviewPrepResponse
  language: Language
  t: Translator
}) {
  return (
    <section className="interview-panel" aria-labelledby="interview-title">
      <div className="section-heading compact-heading">
        <div>
          <p className="eyebrow">{t('interview.eyebrow')}</p>
          <h3 id="interview-title">{t('interview.title')}</h3>
        </div>
      </div>

      <section className="interview-summary">
        <h4>{t('interview.summary')}</h4>
        <p>{result.summary || t('interview.noSummary')}</p>
      </section>

      <InterviewQuestionSection
        title={t('interview.technicalQuestions')}
        items={result.technicalQuestions}
        t={t}
        renderItem={(item) => (
          <QuestionCard key={item.question} question={item.question}>
            <p className="difficulty-badge">
              {t('interview.difficulty')}:{' '}
              {getDifficultyLabel(item.difficulty, language)}
            </p>
            <QuestionDetail
              label={t('interview.whyAsked')}
              value={item.whyAsked}
            />
            <QuestionDetail
              label={t('interview.answerGuidance')}
              value={item.answerGuidance}
            />
          </QuestionCard>
        )}
      />

      <InterviewQuestionSection
        title={t('interview.behavioralQuestions')}
        items={result.behavioralQuestions}
        t={t}
        renderItem={(item) => (
          <QuestionCard key={item.question} question={item.question}>
            <QuestionDetail
              label={t('interview.whyAsked')}
              value={item.whyAsked}
            />
            <QuestionDetail
              label={t('interview.answerGuidance')}
              value={item.answerGuidance}
            />
          </QuestionCard>
        )}
      />

      <InterviewQuestionSection
        title={t('interview.cvBasedQuestions')}
        items={result.cvBasedQuestions}
        t={t}
        renderItem={(item) => (
          <QuestionCard key={item.question} question={item.question}>
            <QuestionDetail
              label={t('interview.cvEvidence')}
              value={item.cvEvidence}
              variant="evidence"
            />
            <QuestionDetail
              label={t('interview.answerGuidance')}
              value={item.answerGuidance}
            />
          </QuestionCard>
        )}
      />

      <section className="interview-section">
        <h4>{t('interview.employerQuestions')}</h4>
        {result.questionsToAskEmployer.length > 0 ? (
          <ul className="plain-list">
            {result.questionsToAskEmployer.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">{t('interview.none')}</p>
        )}
      </section>
    </section>
  )
}

function InterviewQuestionSection<TItem>({
  title,
  items,
  renderItem,
  t,
}: {
  title: string
  items: TItem[]
  renderItem: (item: TItem) => ReactNode
  t: Translator
}) {
  return (
    <section className="interview-section">
      <h4>{title}</h4>
      {items.length > 0 ? (
        <div className="question-grid">{items.map(renderItem)}</div>
      ) : (
        <p className="muted-text">{t('interview.none')}</p>
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
  t: Translator
}

function JobForm({
  title,
  submitLabel,
  initialValue,
  isLoading = false,
  isSaving,
  onSubmit,
  onCancel,
  t,
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
      setValidationMessage(t('jobs.validationCompanyName'))
      return
    }

    if (!form.positionTitle.trim()) {
      setValidationMessage(t('jobs.validationPositionTitle'))
      return
    }

    if (!form.description.trim()) {
      setValidationMessage(t('jobs.validationDescription'))
      return
    }

    await onSubmit(form)
  }

  if (isLoading) {
    return <p className="state-panel">{t('jobs.loadingForm')}</p>
  }

  return (
    <section className="form-panel" aria-labelledby="job-form-title">
      <h2 id="job-form-title">{title}</h2>
      <form className="job-form" onSubmit={handleSubmit}>
        <label>
          {t('jobs.companyName')}
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
          {t('jobs.positionTitle')}
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
          {t('jobs.description')}
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
            {t('jobs.location')}
            <input
              type="text"
              value={form.location ?? ''}
              onChange={(event) =>
                setForm({ ...form, location: event.target.value })
              }
            />
          </label>

          <label>
            {t('jobs.jobUrl')}
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
            {t('jobs.cancel')}
          </button>
          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? t('jobs.saving') : submitLabel}
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
  t: Translator
}

function DeleteConfirmation({
  job,
  isDeleting,
  onCancel,
  onConfirm,
  t,
}: DeleteConfirmationProps) {
  return (
    <div className="modal-backdrop">
      <section
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-title"
      >
        <h2 id="delete-title">{t('jobs.deleteTitle')}</h2>
        <p>
          {t('jobs.deleteConfirm', {
            positionTitle: job.positionTitle,
            companyName: job.companyName,
          })}
        </p>
        <div className="form-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('jobs.cancel')}
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? t('jobs.deleting') : t('jobs.delete')}
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

function formatDate(value: string, language: Language, t: Translator) {
  if (!value) {
    return t('jobs.unknownDate')
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatDateTime(value: string, language: Language, t: Translator) {
  if (!value) {
    return t('jobs.unknownDate')
  }

  return new Intl.DateTimeFormat(getLocale(language), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatFileSize(value: number, language: Language) {
  const formatter = new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 1,
  })

  if (value < 1024) {
    return `${value} B`
  }

  if (value < 1024 * 1024) {
    return `${formatter.format(value / 1024)} KB`
  }

  return `${formatter.format(value / (1024 * 1024))} MB`
}

function validateResumeFile(file: File, t: Translator) {
  const fileName = file.name.toLowerCase()
  const isAllowedExtension =
    fileName.endsWith('.pdf') || fileName.endsWith('.docx')

  if (!isAllowedExtension) {
    return t('resume.allowed')
  }

  if (file.size === 0) {
    return t('resume.empty')
  }

  if (file.size > MAX_RESUME_FILE_SIZE) {
    return t('resume.tooLarge')
  }

  return ''
}

function getResumeErrorMessage(error: unknown, t: Translator) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return t('errors.requestFailed')
    }

    if (error.status === 404) {
      return t('errors.noResume')
    }
  }

  return getErrorMessage(error, t)
}

function getMatchErrorMessage(error: unknown, t: Translator) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return error.message.toLowerCase().includes('resume')
        ? t('errors.resumeMissingMatch')
        : t('errors.jobNotFound')
    }

    if (error.status === 422) {
      return t('errors.resumeExtraction')
    }

    if (error.status === 502) {
      return t('errors.aiMatchProvider')
    }

    if (error.status === 503) {
      return t('errors.aiMatchConfig')
    }

    if (error.status === 504) {
      return t('errors.aiMatchTimeout')
    }
  }

  return getErrorMessage(error, t)
}

function getInterviewErrorMessage(error: unknown, t: Translator) {
  if (error instanceof ApiError) {
    if (error.status === 404) {
      return error.message.toLowerCase().includes('resume')
        ? t('errors.resumeMissingInterview')
        : t('errors.jobNotFound')
    }

    if (error.status === 422) {
      return t('errors.resumeExtraction')
    }

    if (error.status === 502) {
      return t('errors.aiInterviewProvider')
    }

    if (error.status === 503) {
      return t('errors.aiInterviewConfig')
    }

    if (error.status === 504) {
      return t('errors.aiInterviewTimeout')
    }
  }

  return getErrorMessage(error, t)
}

function isResumeMissingError(message: string, t: Translator) {
  return (
    message === t('errors.resumeMissingMatch') ||
    message === t('errors.resumeMissingInterview')
  )
}

function getErrorMessage(error: unknown, t: Translator) {
  if (error instanceof UnauthorizedError) {
    return t('errors.sessionExpired')
  }

  if (error instanceof ApiError) {
    return t('errors.requestFailed')
  }

  return t('errors.generic')
}

export default App
