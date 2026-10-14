export type CareerAiKind = 'bio' | 'headline'

export interface ImproveCareerTextInput {
  text: string
  kind: CareerAiKind
  locale: 'ar' | 'en'
}

export interface ImproveCareerTextResult {
  text: string
  model?: string
  remainingToday?: number
}

interface ApiErrorBody {
  error?: string
  limit?: number
}

const API_URL = 'https://taqdom-studio-api.abdullahyehia1566.workers.dev/api/ai/improve'
const MAX_TEXT_LENGTH = 2400

export class CareerAiError extends Error {
  code: string

  constructor(code: string) {
    super(code)
    this.name = 'CareerAiError'
    this.code = code
  }
}

/**
 * Sends only the selected text to Taqdom's AI endpoint after the user explicitly
 * clicks an improvement action. Credentials and provider keys remain server-side.
 */
export async function improveCareerText(
  input: ImproveCareerTextInput,
): Promise<ImproveCareerTextResult> {
  const text = input.text.trim()
  if (text.length < 8) throw new CareerAiError('text_too_short')
  if (text.length > MAX_TEXT_LENGTH) throw new CareerAiError('text_too_long')

  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 25_000)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal,
      body: JSON.stringify({ text, kind: input.kind, locale: input.locale }),
    })

    let payload: ImproveCareerTextResult & ApiErrorBody
    try {
      payload = (await response.json()) as ImproveCareerTextResult & ApiErrorBody
    } catch {
      throw new CareerAiError('invalid_response')
    }

    if (!response.ok) throw new CareerAiError(payload.error || 'request_failed')
    if (typeof payload.text !== 'string' || !payload.text.trim()) {
      throw new CareerAiError('empty_response')
    }

    return { text: payload.text.trim(), model: payload.model, remainingToday: payload.remainingToday }
  } catch (error) {
    if (error instanceof CareerAiError) throw error
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new CareerAiError('request_timeout')
    }
    throw new CareerAiError('network_error')
  } finally {
    window.clearTimeout(timeout)
  }
}
