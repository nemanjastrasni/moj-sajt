// Shared by lightweight playlist models and the full song validation path.
export class SubmissionError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
