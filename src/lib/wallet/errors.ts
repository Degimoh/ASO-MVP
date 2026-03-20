export class InsufficientCreditsError extends Error {
  readonly required: number;
  readonly available: number;

  constructor(required: number, available: number) {
    super(`Insufficient credits: required ${required}, available ${available}`);
    this.required = required;
    this.available = available;
  }
}
