import path from 'path'
import fs from 'fs'
import { AdVariant } from '../types'
import { createSceneClip, concatClips, addAudio } from './ffmpeg'

const VIDEOS_DIR = path.join(__dirname, '../tmp/videos')
const FRAMES_DIR = path.join(__dirname, '../tmp/frames')

type EnrichedScene = {
  text: string
  duration?: number
  image?: string
  visualType: 'hook' | 'screenshot' | 'text-only' | 'cta'
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

function enrichScenes(ad: AdVariant, screenshots: string[]): EnrichedScene[] {
  return ad.scenes.map((scene, i) => {
    const isFirst = i === 0
    const isLast = i === ad.scenes.length - 1
    const hasScreenshots = screenshots.length > 0

    if (isFirst) {
      return {
        ...scene,
        visualType: 'hook'
      }
    }

    if (isLast) {
      return {
        ...scene,
        visualType: 'cta',
        image: hasScreenshots ? screenshots[0] : undefined
      }
    }

    if (hasScreenshots) {
      return {
        ...scene,
        visualType: 'screenshot',
        image: screenshots[(i - 1) % screenshots.length]
      }
    }

    return {
      ...scene,
      visualType: 'text-only'
    }
  })
}

export async function renderAdVideo(
  ad: AdVariant,
  screenshots: string[],
  jobId: string
): Promise<string> {
  if (!ad.audioPath || !fs.existsSync(ad.audioPath)) {
    throw new Error(`Missing audio file for ad angle: ${ad.angle}`)
  }

  ensureDir(VIDEOS_DIR)
  ensureDir(FRAMES_DIR)

  const outputPath = path.join(VIDEOS_DIR, `${jobId}-${ad.angle}.mp4`)
  const clipPaths: string[] = []
  const enrichedScenes = enrichScenes(ad, screenshots)

  for (let i = 0; i < enrichedScenes.length; i++) {
    const scene = enrichedScenes[i]
    const clipPath = path.join(FRAMES_DIR, `${jobId}-${ad.angle}-scene${i}.mp4`)

    await createSceneClip({
      text: scene.text,
      duration: scene.duration || 3,
      outputPath: clipPath,
      imagePath: scene.visualType === 'screenshot' || scene.visualType === 'cta' ? scene.image : undefined,
      isCta: scene.visualType === 'cta'
    })

    clipPaths.push(clipPath)
  }

  const silentVideoPath = path.join(FRAMES_DIR, `${jobId}-${ad.angle}-silent.mp4`)
  await concatClips(clipPaths, silentVideoPath)
  await addAudio(silentVideoPath, ad.audioPath, outputPath)

  for (const p of clipPaths) {
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }

  if (fs.existsSync(silentVideoPath)) {
    fs.unlinkSync(silentVideoPath)
  }

  console.log(`[Renderer] Done: ${outputPath}`)
  return outputPath
}
