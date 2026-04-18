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

function sanitizeDrawtext(text: string): string {
  return text
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
}

function buildTextOnlyFilter(text: string, isCta: boolean, duration: number): string {
  const safeText = sanitizeDrawtext(text)
  const fontSize = isCta ? 74 : 72
  const textY = isCta ? '(h*0.34)' : '(h*0.18)'
  const fadeOutStart = Math.max(0, duration - 0.35)

  const baseBg = isCta
    ? `color=c=0x120f2a:size=${WIDTH}x${HEIGHT}:rate=${FPS}`
    : `color=c=0x0b1020:size=${WIDTH}x${HEIGHT}:rate=${FPS}`

  const accentBox = isCta
    ? `drawbox=x=120:y=1240:w=840:h=140:color=0x7c3aed@0.95:t=fill`
    : `drawbox=x=80:y=110:w=920:h=16:color=0x7c3aed@0.95:t=fill`

  const subtitle = isCta
    ? `drawtext=fontfile=${FONT}:text='Generate smarter ads faster':fontcolor=0xd1d5db:fontsize=38:x=(w-text_w)/2:y=980`
    : ''

  const ctaText = isCta
    ? `drawtext=fontfile=${FONT}:text='Try it now':fontcolor=white:fontsize=44:x=(w-text_w)/2:y=1278`
    : ''

  const mainText = `drawtext=fontfile=${FONT}:text='${safeText}':fontcolor=white:fontsize=${fontSize}:line_spacing=12:bordercolor=0x000000:borderw=3:x=(w-text_w)/2:y=${textY}`

  const fadeIn = `fade=t=in:st=0:d=0.35`
  const fadeOut = `fade=t=out:st=${fadeOutStart}:d=0.35`

  return `${baseBg},${fadeIn},${fadeOut},${accentBox}${subtitle ? ',' + subtitle : ''},${mainText}${ctaText ? ',' + ctaText : ''}`
}

function buildScreenshotFilter(text: string, isCta: boolean, duration: number): string {
  const safeText = sanitizeDrawtext(text)
  const fontSize = isCta ? 70 : 64
  const textY = isCta ? 250 : 150
  const fadeOutStart = Math.max(0, duration - 0.35)

  // Layout:
  // [0:v] source image
  // blurred full-screen background
  // sharp screenshot card centered
  // top accent bar
  // main text
  // optional CTA pill

  const filter = [
    // Background layer
    `[0:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},gblur=sigma=24,eq=brightness=-0.08[bg]`,

    // Foreground screenshot card
    `[0:v]scale=900:1500:force_original_aspect_ratio=decrease[fg]`,

    // Put screenshot card on blurred background
    `[bg][fg]overlay=(W-w)/2:(H-h)/2-60[tmp1]`,

    // Accent bar
    `[tmp1]drawbox=x=80:y=90:w=920:h=16:color=0x7c3aed@0.95:t=fill[tmp2]`,

    // Main headline
    `[tmp2]drawtext=fontfile=${FONT}:text='${safeText}':fontcolor=white:fontsize=${fontSize}:line_spacing=10:bordercolor=0x000000:borderw=3:x=(w-text_w)/2:y=${textY}[tmp3]`,

    // CTA box for last scene
    isCta
      ? `[tmp3]drawbox=x=250:y=1610:w=580:h=120:color=0x7c3aed@0.95:t=fill,drawtext=fontfile=${FONT}:text='Start now':fontcolor=white:fontsize=42:x=(w-text_w)/2:y=1648[tmp4]`
      : `[tmp3]copy[tmp4]`,

    // Fade in/out
    `[tmp4]fade=t=in:st=0:d=0.3,fade=t=out:st=${fadeOutStart}:d=0.35`
  ].join(';')

  return filter
}

export async function createSceneClip(opts: SceneClipOptions): Promise<void> {
  const { text, duration, outputPath, imagePath, isCta } = opts

  ensureDir(outputPath)

  const safeDuration = Math.max(2, Number(duration) || 3)

  let cmd = ''

  if (imagePath && fs.existsSync(imagePath)) {
    const filterComplex = buildScreenshotFilter(text, !!isCta, safeDuration)

    cmd = `${FFMPEG} -y -loop 1 -t ${safeDuration} -i ${escShellPath(imagePath)} -filter_complex "${filterComplex}" -map "[tmp4]" -c:v libx264 -pix_fmt yuv420p -r ${FPS} ${escShellPath(outputPath)} 2>&1`
  } else {
    const videoFilter = buildTextOnlyFilter(text, !!isCta, safeDuration)

    cmd = `${FFMPEG} -y -f lavfi -t ${safeDuration} -i "${videoFilter}" -c:v libx264 -pix_fmt yuv420p -r ${FPS} ${escShellPath(outputPath)} 2>&1`
  }

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
