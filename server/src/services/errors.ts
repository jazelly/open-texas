export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class UserNameTaken extends AppError {
  constructor() {
    super('Username already exists', 409);
  }
}

export class UserEmailAlreadyRegistered extends AppError {
  constructor() {
    super('Email already exists', 409);
  }
}

export class InvalidCredentials extends AppError {
  constructor() {
    super('Invalid username/email or password', 401);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized access', 401);
  }
} 