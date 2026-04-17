import Anthropic from '@anthropic-ai/sdk'
import { ProductInput, GenerationResult, AdVariant } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a direct-response ad copywriter for short vertical mobile video (TikTok/Reels/Shorts).

Return ONLY valid JSON. No commentary. No markdown. No backticks. Just raw JSON.

Create exactly 3 ad variants with these angles:
- "pain" — lead with the user's frustration
- "curiosity" — hook with intrigue or a surprising question  
- "bold-claim" — open with a confident, almost provocative statement

Each variant must follow this exact schema:
{
  "angle": "pain" | "curiosity" | "bold-claim",
  "hook": "opening line (max 12 words)",
  "voiceover": "full spoken script as one paragraph",
  "scenes": [
    { "text": "on-screen text (max 8 words)", "durationHint": 4 }
  ]
}

Rules:
- 4 to 5 scenes per ad
- Total video target: 20-28 seconds
- Last scene must contain the CTA
- Language: punchy, conversational, no jargon
- Mobile-first: short lines, big ideas`

export async function generateScripts(input: ProductInput): Promise<GenerationResult> {
  const userPrompt = `Product: ${input.productName}
What it does: ${input.description}
Target audience: ${input.targetAudience}
Pain point: ${input.painPoint}
Main benefit: ${input.mainBenefit}
CTA: ${input.cta}`

  let attempts = 0
  while (attempts < 2) {
    attempts++
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)

      if (!parsed.ads || !Array.isArray(parsed.ads) || parsed.ads.length !== 3) {
        throw new Error('Invalid response structure — expected {ads: [...]} with 3 items')
      }

      return parsed as GenerationResult

    } catch (err) {
      if (attempts >= 2) throw new Error(`Script generation failed after 2 attempts: ${err}`)
      console.warn('Script parse failed, retrying...', err)
    }
  }

  throw new Error('Script generation failed')
}
