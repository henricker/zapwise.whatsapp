export class SessionError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ForceLogoutError extends SessionError {
  constructor() {
    super(ForceLogoutError.MESSAGE);
  }

  static MESSAGE = 'Force logout';
}
