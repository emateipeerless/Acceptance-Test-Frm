const SAVE_URL =
  import.meta.env.VITE_SAVE_ACCEPTANCE_TEST_URL ||
  'https://f8gp85rdxe.execute-api.us-east-1.amazonaws.com/saveacceptancetest'

export async function saveAcceptanceTest(payload) {
  if (!SAVE_URL) {
    throw new Error('VITE_SAVE_ACCEPTANCE_TEST_URL is not configured')
  }

  const response = await fetch(SAVE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  let body
  try {
    body = await response.json()
  } catch {
    throw new Error(`Save failed (${response.status})`)
  }

  if (!response.ok || body.success === false) {
    throw new Error(body.error || `Save failed (${response.status})`)
  }

  return body
}
