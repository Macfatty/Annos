const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Hjälpfunktion för att skapa Authorization header
function authHeader() {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchProfile() {
  const res = await fetch(`${BASE_URL}/api/profile`, {
    headers: { ...authHeader() },
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error(`Profile ${res.status}`);
  }
  return await res.json();
}
