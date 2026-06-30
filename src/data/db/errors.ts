export function isDatabaseConstraintError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return /constraint|unique/i.test(message);
}
