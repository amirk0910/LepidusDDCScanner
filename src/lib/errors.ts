export class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "AppError";
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const reference = crypto.randomUUID();
  console.error(`[MiniDSP ${reference}] Request failed. No uploaded content or exception payload was logged.`);
  return Response.json({ error: `The request failed. Try again or contact your administrator. Reference: ${reference}` }, { status: 500 });
}
