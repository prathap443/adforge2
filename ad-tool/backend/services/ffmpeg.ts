import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg'
const FONT = process.env.FONT_PATH || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
const WIDTH = 1080
const HEIGHT = 1920
const FPS = 30

interface SceneClipOptions {
  text: string
  duration: number
  outputPath: string
  imagePath?: string
  isCta?: boolean
}

export async function createSceneClip(opts: SceneClipOptions): Promise<void> {
  const { text, duration, outputPath, imagePath, isCta } = opts

  // Escape text for FFmpeg drawtext (colons and special chars need escaping)
  const safeText = text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')

  const bgColor = isCta ? '0x1a1a2e' : '0x0d0d0d'
  const fontSize = isCta ? 72 : 64
  const textY = isCta ? '(h-text_h)/2' : '(h*0.65)'

  let inputArgs = ''
  let videoFilter = ''

  if (imagePath && fs.existsSync(imagePath)) {
    // Screenshot scene: image background + text overlay
    inputArgs = `-loop 1 -t ${duration} -i "${imagePath}"`
    videoFilter = [
      `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease`,
      `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`,
      `drawtext=fontfile='${FONT}':text='${safeText}':fontcolor=white:fontsize=${fontSize}:bordercolor=black:borderw=4:x=(w-text_w)/2:y=${textY}:line_spacing=10`
    ].join(',')
  } else {
    // Text-only scene: solid background + centered text
    inputArgs = `-f lavfi -t ${duration} -i color=c=${bgColor}:size=${WIDTH}x${HEIGHT}:rate=${FPS}`
    videoFilter = `drawtext=fontfile='${FONT}':text='${safeText}':fontcolor=white:fontsize=${fontSize}:bordercolor=black:borderw=4:x=(w-text_w)/2:y=${textY}:line_spacing=10`
  }

  const cmd = `${FFMPEG} -y ${inputArgs} -vf "${videoFilter}" -c:v libx264 -pix_fmt yuv420p -r ${FPS} "${outputPath}" 2>&1`

  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (err: any) {
    throw new Error(`FFmpeg scene clip failed: ${err.message}\nCommand: ${cmd}`)
  }
}

export async function concatClips(clipPaths: string[], outputPath: string): Promise<void> {
  // Write concat file
  const concatFile = outputPath.replace('.mp4', '-concat.txt')
  const content = clipPaths.map(p => `file '${p}'`).join('\n')
  fs.writeFileSync(concatFile, content)

  const cmd = `${FFMPEG} -y -f concat -safe 0 -i "${concatFile}" -c copy "${outputPath}" 2>&1`

  try {
    execSync(cmd, { stdio: 'pipe' })
    fs.unlinkSync(concatFile)
  } catch (err: any) {
    throw new Error(`FFmpeg concat failed: ${err.message}`)
  }
}

export async function addAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  // -shortest: trim to whichever is shorter (video or audio)
  const cmd = `${FFMPEG} -y -i "${videoPath}" -i "${audioPath}" -map 0:v -map 1:a -c:v copy -c:a aac -shortest "${outputPath}" 2>&1`

  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (err: any) {
    throw new Error(`FFmpeg audio merge failed: ${err.message}`)
  }
}
