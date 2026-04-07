export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

export function validateName(name: string): boolean {
  return name.trim().length > 0;
}

export function validateMessage(msg: string): boolean {
  const trimmed = msg.trim();
  return trimmed.length >= 1 && trimmed.length <= 1000;
}
