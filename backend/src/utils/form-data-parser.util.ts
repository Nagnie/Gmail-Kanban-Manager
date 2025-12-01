import { BadRequestException } from '@nestjs/common';

export function parseEmailArray(
  value: string | string[] | undefined,
): string[] | undefined {
  // If undefined or empty, return undefined
  if (!value) {
    return undefined;
  }

  // Already an array - just filter empty values
  if (Array.isArray(value)) {
    return value
      .filter((email) => email && email.trim().length > 0)
      .map((email) => email.trim());
  }

  // String value - need to parse
  const trimmedValue = value.trim();

  // Empty string
  if (trimmedValue.length === 0) {
    return undefined;
  }

  // Try parse as JSON array: ["email1", "email2"]
  if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmedValue);

      if (!Array.isArray(parsed)) {
        throw new BadRequestException(
          `Expected array format, got: ${typeof parsed}`,
        );
      }

      // Filter and trim
      return parsed
        .filter(
          (email) =>
            email && typeof email === 'string' && email.trim().length > 0,
        )
        .map((email) => email.trim());
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Invalid JSON array format for email list: ${trimmedValue}`,
      );
    }
  }

  // Comma-separated: "email1@x.com, email2@x.com"
  if (trimmedValue.includes(',')) {
    return trimmedValue
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email.length > 0);
  }

  // Single email: "email@example.com"
  return [trimmedValue];
}

export function parseBoolean(value: string | boolean | undefined): boolean {
  // If undefined, return false (default)
  if (value === undefined || value === null) {
    return false;
  }

  // Already a boolean
  if (typeof value === 'boolean') {
    return value;
  }

  // String value - need to parse
  const trimmedValue = value.trim().toLowerCase();

  // True values
  if (
    trimmedValue === 'true' ||
    trimmedValue === '1' ||
    trimmedValue === 'yes'
  ) {
    return true;
  }

  // False values
  if (
    trimmedValue === 'false' ||
    trimmedValue === '0' ||
    trimmedValue === 'no' ||
    trimmedValue === ''
  ) {
    return false;
  }

  // Invalid value - throw error for clarity
  throw new BadRequestException(
    `Invalid boolean value: "${value}". Expected: true, false, 1, 0, yes, no`,
  );
}
