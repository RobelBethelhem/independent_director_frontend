/**
 * Password complexity, mirroring the server's rule (auth.dto.ts): at least 8
 * characters including uppercase, lowercase, a number and a special character.
 * Kept in sync so users get inline guidance instead of a server-side 400.
 */
export const PASSWORD_HINT = 'Min 8 chars, with upper & lowercase, a number, and a symbol';

const HAS_LOWER = /[a-z]/;
const HAS_UPPER = /[A-Z]/;
const HAS_DIGIT = /\d/;
const HAS_SPECIAL = /[^A-Za-z0-9]/;

/** Returns an error message if the password is too weak, or null if it passes. */
export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters.';
  if (!HAS_LOWER.test(pw) || !HAS_UPPER.test(pw) || !HAS_DIGIT.test(pw) || !HAS_SPECIAL.test(pw)) {
    return 'Password must include uppercase and lowercase letters, a number, and a special character.';
  }
  return null;
}
