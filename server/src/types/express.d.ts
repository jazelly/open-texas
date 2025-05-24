declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        userId: string;
        username: string;
      };
    }
  }
}

export {}; 