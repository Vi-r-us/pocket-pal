import type { AppErrorShape } from '@/lib/errors/types'

type AppErrorBaseShape = Omit<AppErrorShape, 'name'>

export class AppError extends Error {
  readonly shape: AppErrorShape

  constructor(shape: AppErrorShape) {
    super(shape.message)
    this.name = 'AppError'
    this.shape = {
      ...shape,
      name: 'AppError',
    }
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class HttpAppError extends AppError {
  constructor(shape: Omit<AppErrorBaseShape, 'kind'> & { status: number }) {
    super({
      ...shape,
      kind: shape.status === 401 ? 'auth' : shape.status === 400 || shape.status === 422 ? 'validation' : 'http',
      name: 'AppError',
    })
    this.name = 'HttpAppError'
  }
}

export class ValidationAppError extends AppError {
  constructor(shape: Omit<AppErrorBaseShape, 'kind'>) {
    super({
      ...shape,
      kind: 'validation',
      name: 'AppError',
    })
    this.name = 'ValidationAppError'
  }
}

export class RuntimeAppError extends AppError {
  constructor(shape: Omit<AppErrorBaseShape, 'kind'>) {
    super({
      ...shape,
      kind: 'runtime',
      name: 'AppError',
    })
    this.name = 'RuntimeAppError'
  }
}
