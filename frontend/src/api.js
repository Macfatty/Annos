const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function fetchProfile() {
  try {
    const res = await fetch(`${BASE_URL}/api/profile`, {
      credentials: "include",
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  }
}
