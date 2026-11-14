const SESSION_KEY = "hrSmartOcrSession";

export function saveSession(name, code) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    name,
    code,
    loggedInAt: Date.now()
  }));
}
export function getSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (value && value.name && value.code) return value;
  } catch (_) {}
  return null;
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
