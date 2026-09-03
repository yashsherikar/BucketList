// Milliseconds until the stored JWT's `exp`; <= 0 means missing, malformed, or expired.
export function tokenMsLeft(token = localStorage.getItem("wishroom_token")) {
  try {
    const { exp } = JSON.parse(atob(token.split(".")[1]));
    return exp * 1000 - Date.now();
  } catch {
    return 0;
  }
}

export function hasValidToken() {
  return tokenMsLeft() > 0;
}
