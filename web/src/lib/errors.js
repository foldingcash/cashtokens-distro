/** A user-facing error with a short machine-readable `kind` and any extra `details`. */
export class AppError extends Error {
  constructor(kind, message, details = {}) {
    super(message);
    this.name = 'AppError';
    this.kind = kind;
    this.details = details;
  }
}

/** Thrown when the user explicitly cancels a confirmation step (e.g. the send dialog). */
export class UserCancelledError extends AppError {
  constructor(message = 'Cancelled.') {
    super('cancelled', message);
    this.name = 'UserCancelledError';
  }
}
