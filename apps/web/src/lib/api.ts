export const api = {
  async get<T>(url: string): Promise<T> {
    const r = await fetch(url, { credentials: "include" });
    if (!r.ok) throw new Error(`GET ${url} → ${r.status}`);
    return (await r.json()) as T;
  },
  async post(url: string, body?: any) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`POST ${url} → ${r.status}`);
    return r.json();
  },
};
