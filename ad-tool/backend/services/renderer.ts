import path from 'path'
import fs from 'fs'
import { AdVariant } from '../types'
import { createSceneClip, concatClips, addAudio } from './ffmpeg'

const VIDEOS_DIR = path.join(__dirname, '../tmp/videos')
const FRAMES_DIR = path.join(__dirname, '../tmp/frames')

export async function renderAdVideo(
  ad: AdVariant,
  screenshots: string[],
  jobId: string
): Promise<string> {
  if (!ad.audioPath || !fs.existsSync(ad.audioPath)) {
    throw new Error(`Missing audio file for ad angle: ${ad.angle}`)
  }

  fs.mkdirSync(VIDEOS_DIR, { recursive: true })
  fs.mkdirSync(FRAMES_DIR, { recursive: true })

  const outputPath = path.join(VIDEOS_DIR, `${jobId}-${ad.angle}.mp4`)
  const clipPaths: string[] = []

  const enrichedScenes = ad.scenes.map((scene, i) => ({
    ...scene,
    image: screenshots.length > 0 ? screenshots[i % screenshots.length] : undefined,
    visualType: screenshots.length > 0 ? 'screenshot' : 'text-only'
  }))

  for (let i = 0; i < enrichedScenes.length; i++) {
    const scene = enrichedScenes[i]
    const clipPath = path.join(FRAMES_DIR, `${jobId}-${ad.angle}-scene${i}.mp4`)

    await createSceneClip({
      text: scene.text,
      duration: scene.duration || 4,
      outputPath: clipPath,
      imagePath: scene.image,
      isCta: i === enrichedScenes.length - 1,
      jobId
    })

    clipPaths.push(clipPath)
  }

  const silentVideoPath = path.join(FRAMES_DIR, `${jobId}-${ad.angle}-silent.mp4`)
  await concatClips(clipPaths, silentVideoPath)
  await addAudio(silentVideoPath, ad.audioPath, outputPath)

  for (const p of clipPaths) {
    if (fs.existsSync(p)) fs.unlinkSync(p)
  }
  if (fs.existsSync(silentVideoPath)) fs.unlinkSync(silentVideoPath)

  console.log(`[Renderer] Done: ${outputPath}`)
  return outputPath
}
