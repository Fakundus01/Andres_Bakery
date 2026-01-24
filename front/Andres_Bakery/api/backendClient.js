const defaultBaseUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export async function backendRequest(
  path,
  { method = "GET", body, token } = {},
) {
  const response = await fetch(`${defaultBaseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Backend error ${response.status}: ${errorText}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}