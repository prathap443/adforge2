import OpenAI from 'openai'
import { z } from 'zod'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

const SceneSchema = z.object({
  text: z.string().min(1).max(120),
  durationHint: z.number().min(1).max(8).optional()
})

const AdSchema = z.object({
  angle: z.enum(['pain', 'curiosity', 'bold-claim']),
  hook: z.string().min(1).max(180),
  voiceover: z.string().min(1).max(1200),
  scenes: z.array(SceneSchema).min(3).max(6)
})

const ScriptResponseSchema = z.object({
  ads: z.array(AdSchema).length(3)
})

export type ScriptResponse = z.infer<typeof ScriptResponseSchema>

type ProductInput = {
  productName: string
  description: string
  targetAudience: string
  painPoint: string
  mainBenefit: string
  cta: string
  screenshots?: string[]
}

function extractJsonObject(raw: string): string {
  const trimmed = raw.trim()

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed
  }

  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in model response')
  }

  return trimmed.slice(firstBrace, lastBrace + 1)
}

function normalizeScripts(data: ScriptResponse): ScriptResponse {
  const expectedAngles: Array<'pain' | 'curiosity' | 'bold-claim'> = [
    'pain',
    'curiosity',
    'bold-claim'
  ]

  const adsByAngle = new Map(data.ads.map((ad) => [ad.angle, ad]))

  const normalizedAds = expectedAngles.map((angle) => {
    const ad = adsByAngle.get(angle)

    if (!ad) {
      throw new Error(`Missing required ad angle: ${angle}`)
    }

    return {
      ...ad,
      scenes: ad.scenes.map((scene) => ({
        text: scene.text.trim(),
        durationHint: scene.durationHint ?? 3
      }))
    }
  })

  return { ads: normalizedAds }
}

function buildPrompt(input: ProductInput): string {
  return `
You are writing short-form direct-response ad scripts for vertical mobile videos.

Return VALID JSON ONLY.
Do not include markdown.
Do not include commentary.
Do not include code fences.
Do not include trailing commas.

Create exactly 3 ad variants for this product:
1. pain
2. curiosity
3. bold-claim

Required JSON schema:
{
  "ads": [
    {
      "angle": "pain",
      "hook": "string",
      "voiceover": "string",
      "scenes": [
        {
          "text": "string",
          "durationHint": 3
        }
      ]
    },
    {
      "angle": "curiosity",
      "hook": "string",
      "voiceover": "string",
      "scenes": [
        {
          "text": "string",
          "durationHint": 3
        }
      ]
    },
    {
      "angle": "bold-claim",
      "hook": "string",
      "voiceover": "string",
      "scenes": [
        {
          "text": "string",
          "durationHint": 3
        }
      ]
    }
  ]
}

Rules:
- each ad must feel like a 20 to 30 second vertical ad
- each ad must have 4 to 5 scenes
- each scene text must be short, punchy, and readable on mobile
- final scene should feel like a CTA
- target audience must be reflected in the copy
- keep the language simple and direct
- avoid hypey nonsense
- do not mention pricing or claims you cannot support unless given in the input
- use the CTA provided by the user

Product:
- Product name: ${input.productName}
- Description: ${input.description}
- Target audience: ${input.targetAudience}
- Main pain point: ${input.painPoint}
- Main benefit: ${input.mainBenefit}
- CTA: ${input.cta}
`.trim()
}

async function callModel(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content:
          'You generate ad script JSON. Return only valid JSON. No markdown. No explanations.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]
  })

  const content = response.choices[0]?.message?.content?.trim()

  if (!content) {
    throw new Error('Empty response from model')
  }

  return content
}

async function parseAndValidate(raw: string): Promise<ScriptResponse> {
  console.log('[ScriptGen] FULL RAW:', raw)

  const jsonString = extractJsonObject(raw)
  const parsed = JSON.parse(jsonString)
  const validated = ScriptResponseSchema.parse(parsed)

  return normalizeScripts(validated)
}

export async function generateScripts(input: ProductInput): Promise<ScriptResponse> {
  const prompt = buildPrompt(input)

  try {
    const raw = await callModel(prompt)
    const validated = await parseAndValidate(raw)
    console.log('[ScriptGen] Validation passed on first attempt')
    return validated
  } catch (firstErr: any) {
    console.warn('[ScriptGen] First attempt failed:', firstErr?.message)

    const retryPrompt = `
The previous response was invalid.

Return ONLY valid JSON that matches the required schema exactly.
Do not include markdown.
Do not include explanation text.
Do not include trailing commas.

${buildPrompt(input)}
`.trim()

    const retryRaw = await callModel(retryPrompt)
    const validated = await parseAndValidate(retryRaw)
    console.log('[ScriptGen] Validation passed on retry')
    return validated
  }
}
