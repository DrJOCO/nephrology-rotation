const DEFAULT_LIKE_ADMIN_PINS = new Set([
  "0000",
  "1111",
  "2222",
  "3333",
  "4444",
  "5555",
  "6666",
  "7777",
  "8888",
  "9999",
  "0123",
  "1234",
  "4321",
  "9876",
  "admin",
  "pass",
  "password",
  "qwer",
  "asdf",
]);

function isSingleCharacterRepeat(value: string): boolean {
  return value.length >= 4 && new Set(Array.from(value)).size === 1;
}

function isSequential(value: string): boolean {
  if (value.length < 4) return false;
  const chars = Array.from(value.toLowerCase());
  const codes = chars.map((char) => char.charCodeAt(0));
  const ascending = codes.every((code, index) => index === 0 || code - codes[index - 1] === 1);
  const descending = codes.every((code, index) => index === 0 || codes[index - 1] - code === 1);
  return ascending || descending;
}

export function getAdminPinValidationError(pin: string, currentPin = ""): string | null {
  const nextPin = pin.trim();
  const existingPin = currentPin.trim();

  if (nextPin.length < 4) return "Use at least 4 characters.";
  if (/\s/.test(nextPin)) return "Avoid spaces in the admin PIN.";
  if (existingPin && nextPin === existingPin) return "Choose a new PIN that is different from the current one.";

  const normalized = nextPin.toLowerCase();
  if (DEFAULT_LIKE_ADMIN_PINS.has(normalized)) return "Avoid default-looking PINs like 1234, 0000, or admin.";
  if (isSingleCharacterRepeat(normalized)) return "Avoid repeating the same character.";
  if (isSequential(normalized)) return "Avoid simple sequential PINs.";

  return null;
}
