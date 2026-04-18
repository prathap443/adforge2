import Anthropic from '@anthropic-ai/sdk'
import { ProductInput, GenerationResult } from '../types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a direct-response ad copywriter for short vertical mobile video (TikTok/Reels/Shorts).

Return ONLY a valid JSON object in this exact format with no other text:
{
  "ads": [
    {
      "angle": "pain",
      "hook": "opening line max 12 words",
      "voiceover": "full spoken script as one paragraph",
      "scenes": [
        { "text": "on-screen text max 8 words", "durationHint": 4 }
      ]
    },
    {
      "angle": "curiosity",
      "hook": "opening line max 12 words",
      "voiceover": "full spoken script as one paragraph",
      "scenes": [
        { "text": "on-screen text max 8 words", "durationHint": 4 }
      ]
    },
    {
      "angle": "bold-claim",
      "hook": "opening line max 12 words",
      "voiceover": "full spoken script as one paragraph",
      "scenes": [
        { "text": "on-screen text max 8 words", "durationHint": 4 }
      ]
    }
  ]
}

Rules:
- Return exactly 3 ads with angles: pain, curiosity, bold-claim
- 4 to 5 scenes per ad
- Last scene must contain the CTA
- Language: punchy, conversational, no jargon
- No markdown, no backticks, no explanation — just the JSON object`

export async function generateScripts(input: ProductInput): Promise<GenerationResult> {
  const userPrompt = `Product: ${input.productName}
What it does: ${input.description}
Target audience: ${input.targetAudience}
Pain point: ${input.painPoint}
Main benefit: ${input.mainBenefit}
CTA: ${input.cta}`

  let lastError = ''

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }]
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text : ''
      
      // Strip any accidental markdown fences
      const cleaned = raw
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .replace(/,(\s*[}\]])/g, '$1')
        .trim()

      console.log(`[ScriptGen] FULL RAW:`, cleaned)

      const parsed = JSON.parse(cleaned)

      // Handle both {ads: [...]} and direct array responses
      const ads = parsed.ads || (Array.isArray(parsed) ? parsed : null)

      if (!ads || !Array.isArray(ads) || ads.length < 3) {
        throw new Error(`Expected 3 ads, got: ${JSON.stringify(parsed).substring(0, 100)}`)
      }

      return { ads }

    } catch (err: any) {
      lastError = err.message
      console.warn(`[ScriptGen] Attempt ${attempt} failed:`, err.message)
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000))
    }
  }

  throw new Error(`Script generation failed after 3 attempts: ${lastError}`)
}
