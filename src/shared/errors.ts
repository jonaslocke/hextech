export class AppError extends Error {
  constructor(
    message: string,
    public readonly code = "APP_ERROR",
    public readonly statusCode = 500,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR", 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, "NOT_FOUND", 404);
  }
}
