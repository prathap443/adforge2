import { AdVariant, Scene } from '../types'

const WORDS_PER_SECOND = 2.5
const MIN_DURATION = 2
const MAX_DURATION = 6

export function assignSceneTiming(ads: AdVariant[]): AdVariant[] {
  return ads.map(ad => ({
    ...ad,
    scenes: ad.scenes.map(scene => ({
      ...scene,
      duration: estimateDuration(scene.text)
    }))
  }))
}

function estimateDuration(text: string): number {
  const wordCount = text.trim().split(/\s+/).length
  const estimated = wordCount / WORDS_PER_SECOND
  return Math.round(Math.max(MIN_DURATION, Math.min(MAX_DURATION, estimated)))
}

// After TTS is generated, update timing based on actual audio duration
export function redistributeTiming(scenes: Scene[], actualAudioSeconds: number): Scene[] {
  const totalWords = scenes.reduce((sum, s) => sum + s.text.split(/\s+/).length, 0)
  return scenes.map(scene => {
    const proportion = scene.text.split(/\s+/).length / totalWords
    const duration = Math.max(MIN_DURATION, Math.round(actualAudioSeconds * proportion))
    return { ...scene, duration }
  })
}
