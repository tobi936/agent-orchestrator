// Push events to the API Gateway, which broadcasts them to SSE clients.

const GATEWAY_URL = process.env.API_GATEWAY_URL ?? 'http://api-gateway:3000'
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? ''

export function broadcastEvent(userId: string, event: string, data: unknown): void {
  fetch(`${GATEWAY_URL}/internal/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': INTERNAL_SECRET,
    },
    body: JSON.stringify({ userId, event, data }),
  }).catch(() => { /* non-critical: gateway may not be up */ })
}
