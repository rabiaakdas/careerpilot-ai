import { type FormEvent, useState } from 'react'
import './App.css'
import {
  login,
  register,
  type LoginRequest,
  type RegisterRequest,
} from './services/authService'

type AuthMode = 'login' | 'register'

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

function App() {
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [loginForm, setLoginForm] = useState<LoginRequest>(initialLoginForm)
  const [registerForm, setRegisterForm] =
    useState<RegisterRequest>(initialRegisterForm)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isLogin = authMode === 'login'

  async function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const response = await login(loginForm)
      localStorage.setItem('accessToken', response.accessToken)
      setSuccessMessage(`Welcome back, ${response.firstName}.`)
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegisterSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await register(registerForm)
      setRegisterForm(initialRegisterForm)
      setSuccessMessage('Registration completed successfully.')
    } catch (error) {
      setErrorMessage(getErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  function switchMode(mode: AuthMode) {
    setAuthMode(mode)
    setErrorMessage('')
    setSuccessMessage('')
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
            disabled={isLoading}
          >
            Login
          </button>
          <button
            type="button"
            className={!isLogin ? 'active' : ''}
            onClick={() => switchMode('register')}
            disabled={isLoading}
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

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
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

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}

        {errorMessage && <p className="message error">{errorMessage}</p>}
        {successMessage && <p className="message success">{successMessage}</p>}
      </section>
    </main>
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong. Please try again.'
}

export default App
