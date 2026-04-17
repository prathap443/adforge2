export interface ProductInput {
  productName: string
  description: string
  targetAudience: string
  painPoint: string
  mainBenefit: string
  cta: string
  screenshots: string[]
}

export interface Scene {
  text: string
  duration?: number
  durationHint?: number
  visualType?: 'screenshot' | 'text-only'
  image?: string
}

export interface AdVariant {
  angle: 'pain' | 'curiosity' | 'bold-claim'
  hook: string
  voiceover: string
  scenes: Scene[]
  audioPath?: string
  videoPath?: string
}

export interface GenerationResult {
  ads: AdVariant[]
}

export interface JobStatus {
  status: 'generating_scripts' | 'generating_voiceovers' | 'rendering_videos' | 'done' | 'error'
  step?: number
  totalSteps?: number
  ads?: AdVariant[]
  error?: string
}

export interface JobManifest {
  id: string
  createdAt: string
  input: ProductInput
  ads: AdVariant[]
}
