export type PasswordScore = {
  score: 0 | 1 | 2 | 3 | 4; // 0 very weak, 4 strong
  suggestions: string[];
};

const common = new Set([
  "password",
  "123456",
  "qwerty",
  "111111",
  "letmein",
  "admin",
]);

export function scorePassword(pw: string): PasswordScore {
  const suggestions: string[] = [];
  if (!pw) return { score: 0, suggestions: ["Enter a password"] };
  const lower = /[a-z]/.test(pw);
  const upper = /[A-Z]/.test(pw);
  const digit = /\d/.test(pw);
  const symbol = /[^A-Za-z0-9]/.test(pw);
  const length = pw.length;
  let score = 0 as 0 | 1 | 2 | 3 | 4;

  if (length >= 12) score = (score + 1) as any;
  if (lower && upper) score = (score + 1) as any;
  if (digit && symbol) score = (score + 1) as any;
  if (length >= 16 || (lower && upper && digit && symbol)) score = (score + 1) as any;

  if (length < 8) suggestions.push("Use at least 8 characters");
  if (!(lower && upper)) suggestions.push("Mix upper and lower case");
  if (!(digit && symbol)) suggestions.push("Add numbers and symbols");
  if (common.has(pw.toLowerCase())) suggestions.push("Avoid common passwords");

  return { score, suggestions };
}

