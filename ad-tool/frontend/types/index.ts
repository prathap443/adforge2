export interface ProductFormData {
  productName: string
  description: string
  targetAudience: string
  painPoint: string
  mainBenefit: string
  cta: string
  screenshots: File[]
}

export interface Scene {
  text: string
  duration?: number
}

export interface AdVariant {
  angle: 'pain' | 'curiosity' | 'bold-claim'
  hook: string
  voiceover: string
  scenes: Scene[]
  audioPath?: string
  videoPath?: string
}

export interface JobStatus {
  status: 'generating_scripts' | 'generating_voiceovers' | 'rendering_videos' | 'done' | 'error'
  step?: number
  totalSteps?: number
  ads?: AdVariant[]
  error?: string
}
