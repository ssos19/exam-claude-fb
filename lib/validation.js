export class ValidationError extends Error {}

export function parsePosition(value) {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new ValidationError('position must be an integer');
  }
  if (value < 0 || value > 100) {
    throw new ValidationError('position must be between 0 and 100');
  }
  return value;
}

export function parseLimit(value, { defaultValue = 100, max = 500 } = {}) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new ValidationError(`limit must be an integer between 1 and ${max}`);
  }
  return n;
}

export function parseId(value, name = 'id') {
  if (value === undefined || value === null || value === '') {
    throw new ValidationError(`${name} is required`);
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) {
    throw new ValidationError(`${name} must be a positive integer`);
  }
  return n;
}
