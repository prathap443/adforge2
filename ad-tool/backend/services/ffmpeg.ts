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

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function escShellPath(p: string): string {
  return `"${p.replace(/"/g, '\\"')}"`
}

export async function createSceneClip(opts: SceneClipOptions): Promise<void> {
  const { text, duration, outputPath, imagePath, isCta } = opts

  ensureDir(outputPath)

  const safeDuration = Math.max(1, Number(duration) || 3)
  const bgColor = isCta ? '0x1a1a2e' : '0x0d0d0d'
  const fontSize = isCta ? 72 : 64
  const textY = isCta ? '(h-text_h)/2' : '(h*0.65)'

  const safeText = text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\\\'")
    .replace(/\$/g, 'S')
    .replace(/%/g, ' percent')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/,/g, '\\,')
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .trim()

  let inputArgs = ''
  let videoFilter = ''

  if (imagePath && fs.existsSync(imagePath)) {
    inputArgs = `-loop 1 -t ${safeDuration} -i ${escShellPath(imagePath)}`
    videoFilter = [
      `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease`,
      `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`,
      `drawtext=fontfile=${FONT}:text='${safeText}':fontcolor=white:fontsize=${fontSize}:bordercolor=black:borderw=4:x=(w-text_w)/2:y=${textY}`
    ].join(',')
  } else {
    inputArgs = `-f lavfi -t ${safeDuration} -i color=c=${bgColor}:size=${WIDTH}x${HEIGHT}:rate=${FPS}`
    videoFilter = `drawtext=fontfile=${FONT}:text='${safeText}':fontcolor=white:fontsize=${fontSize}:bordercolor=black:borderw=4:x=(w-text_w)/2:y=${textY}`
  }

  const cmd = `${FFMPEG} -y ${inputArgs} -vf "${videoFilter}" -c:v libx264 -pix_fmt yuv420p -r ${FPS} ${escShellPath(outputPath)} 2>&1`

  try {
    const out = execSync(cmd, { encoding: 'utf8' })
    if (out?.trim()) {
      console.log('[FFmpeg createSceneClip]', out)
    }
  } catch (err: any) {
    const stderr =
      err?.stdout?.toString?.() ||
      err?.stderr?.toString?.() ||
      err?.message ||
      'Unknown ffmpeg error'

    throw new Error(`FFmpeg scene clip failed:\n${stderr}\nCommand: ${cmd}`)
  }
}

export async function concatClips(clipPaths: string[], outputPath: string): Promise<void> {
  ensureDir(outputPath)

  const concatFile = outputPath.replace('.mp4', '-concat.txt')
  const content = clipPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')
  fs.writeFileSync(concatFile, content, 'utf8')

  const cmd = `${FFMPEG} -y -f concat -safe 0 -i ${escShellPath(concatFile)} -c copy ${escShellPath(outputPath)} 2>&1`

  try {
    const out = execSync(cmd, { encoding: 'utf8' })
    if (out?.trim()) {
      console.log('[FFmpeg concatClips]', out)
    }
  } catch (err: any) {
    const stderr =
      err?.stdout?.toString?.() ||
      err?.stderr?.toString?.() ||
      err?.message ||
      'Unknown ffmpeg error'

    throw new Error(`FFmpeg concat failed:\n${stderr}\nCommand: ${cmd}`)
  } finally {
    if (fs.existsSync(concatFile)) {
      fs.unlinkSync(concatFile)
    }
  }
}

export async function addAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  ensureDir(outputPath)

  const cmd = `${FFMPEG} -y -i ${escShellPath(videoPath)} -i ${escShellPath(audioPath)} -map 0:v -map 1:a -c:v copy -c:a aac -shortest ${escShellPath(outputPath)} 2>&1`

  try {
    const out = execSync(cmd, { encoding: 'utf8' })
    if (out?.trim()) {
      console.log('[FFmpeg addAudio]', out)
    }
  } catch (err: any) {
    const stderr =
      err?.stdout?.toString?.() ||
      err?.stderr?.toString?.() ||
      err?.message ||
      'Unknown ffmpeg error'

    throw new Error(`FFmpeg audio merge failed:\n${stderr}\nCommand: ${cmd}`)
  }
}
