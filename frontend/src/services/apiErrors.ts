export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Your session expired. Please login again.') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}
