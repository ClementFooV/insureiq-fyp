/**
 * Shared authentication utilities for InsureIQ frontend.
 * Centralises token handling so it's not duplicated across every page.
 */

/**
 * Decode a JWT token payload (without signature verification).
 * The backend verifies the signature — this is only for UI display.
 * @param {string} token - JWT token string
 * @returns {object|null} Decoded payload or null if invalid
 */
export function decodeToken(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

/**
 * Get the current auth token from localStorage.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem('token');
}

/**
 * Get the decoded user object from the stored token.
 * @returns {object} User info ({ id, email, role, name }) or empty object
 */
export function getUser() {
  const token = getToken();
  return token ? decodeToken(token) || {} : {};
}

/**
 * Remove the auth token (logout).
 */
export function clearToken() {
  localStorage.removeItem('token');
}

/**
 * Set the document title with InsureIQ branding.
 * @param {string} page - The page name (e.g. "Dashboard", "Risk Assessment")
 */
export function setPageTitle(page) {
  document.title = page ? `${page} — InsureIQ` : 'InsureIQ';
}
