// Malformed tokens count as expired so a corrupt stored value sends the user to login.
export function isTokenExpired(token: string, now = Date.now()): boolean {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp !== 'number' || exp * 1000 <= now;
  } catch {
    return true;
  }
}
