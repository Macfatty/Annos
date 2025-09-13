const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// Hämtar profil. Kastar Error med status-egenskap när svaret inte är OK.
export async function fetchProfile() {
  const res = await fetch(`${BASE_URL}/api/profile`, {
    credentials: "include", // skicka med cookies
  });
  if (!res.ok) {
    const err = new Error(`Profile ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function createOrder(payload) {
  const res = await fetch(`${BASE_URL}/api/order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = new Error(`Order ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}