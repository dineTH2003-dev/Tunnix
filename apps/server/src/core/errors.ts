// Typed API errors and response helpers.

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ErrorResponse = {
  success: false;
  error: { code: string; message: string };
  requestId: string;
};

export type SuccessResponse<T> = {
  success: true;
  data: T;
  requestId: string;
};

export function toErrorResponse(error: ApiError, requestId: string): ErrorResponse {
  return {
    success: false,
    error: { code: error.code, message: error.message },
    requestId,
  };
}

export function toSuccessResponse<T>(data: T, requestId: string): SuccessResponse<T> {
  return { success: true, data, requestId };
}

export function normalizeError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (err instanceof Error) {
    return new ApiError(500, "INTERNAL_ERROR", err.message);
  }
  return new ApiError(500, "INTERNAL_ERROR", "An unexpected error occurred.");
}
