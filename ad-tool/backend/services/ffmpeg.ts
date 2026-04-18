import { execSync } from 'child_process'
import path from 'path'
import fs from 'fs'
import { v4 as uuid } from 'uuid'

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
  jobId?: string
}

function ensureDir(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
}

function ffmpegEscapePath(p: string): string {
  return p.replace(/'/g, "'\\''")
}

function writeTextFile(text: string, jobId = 'job'): string {
  const dir = path.join(__dirname, '../tmp/text')
  fs.mkdirSync(dir, { recursive: true })

  const filePath = path.join(dir, `${jobId}-${uuid()}.txt`)
  fs.writeFileSync(filePath, text, 'utf8')
  return filePath
}

export async function createSceneClip(opts: SceneClipOptions): Promise<void> {
  const { text, duration, outputPath, imagePath, isCta, jobId } = opts

  ensureDir(outputPath)

  const safeDuration = Math.max(1, Number(duration) || 3)
  const bgColor = isCta ? '0x1a1a2e' : '0x0d0d0d'
  const fontSize = isCta ? 72 : 64
  const textY = isCta ? '(h-text_h)/2' : '(h*0.65)'
  const textFile = writeTextFile(text, jobId)

  const escapedFont = ffmpegEscapePath(FONT)
  const escapedTextFile = ffmpegEscapePath(textFile)

  let inputArgs = ''
  let videoFilter = ''

  if (imagePath && fs.existsSync(imagePath)) {
    const escapedImagePath = ffmpegEscapePath(imagePath)

    inputArgs = `-loop 1 -t ${safeDuration} -i '${escapedImagePath}'`
    videoFilter = [
      `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease`,
      `pad=${WIDTH}:${HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=${bgColor}`,
      `drawtext=fontfile='${escapedFont}':textfile='${escapedTextFile}':fontcolor=white:fontsize=${fontSize}:bordercolor=black:borderw=4:x=(w-text_w)/2:y=${textY}:line_spacing=10`
    ].join(',')
  } else {
    inputArgs = `-f lavfi -t ${safeDuration} -i color=c=${bgColor}:size=${WIDTH}x${HEIGHT}:rate=${FPS}`
    videoFilter = `drawtext=fontfile='${escapedFont}':textfile='${escapedTextFile}':fontcolor=white:fontsize=${fontSize}:bordercolor=black:borderw=4:x=(w-text_w)/2:y=${textY}:line_spacing=10`
  }

  const escapedOutput = ffmpegEscapePath(outputPath)
  const cmd = `${FFMPEG} -y ${inputArgs} -vf "${videoFilter}" -c:v libx264 -pix_fmt yuv420p -r ${FPS} '${escapedOutput}' 2>&1`

  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (err: any) {
    throw new Error(`FFmpeg scene clip failed: ${err.message}\nCommand: ${cmd}`)
  } finally {
    if (fs.existsSync(textFile)) {
      fs.unlinkSync(textFile)
    }
  }
}

export async function concatClips(clipPaths: string[], outputPath: string): Promise<void> {
  ensureDir(outputPath)

  const concatFile = outputPath.replace('.mp4', '-concat.txt')

  const content = clipPaths
    .map(p => `file '${p.replace(/'/g, "'\\''")}'`)
    .join('\n')

  fs.writeFileSync(concatFile, content, 'utf8')

  const escapedConcat = ffmpegEscapePath(concatFile)
  const escapedOutput = ffmpegEscapePath(outputPath)

  const cmd = `${FFMPEG} -y -f concat -safe 0 -i '${escapedConcat}' -c copy '${escapedOutput}' 2>&1`

  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (err: any) {
    throw new Error(`FFmpeg concat failed: ${err.message}\nCommand: ${cmd}`)
  } finally {
    if (fs.existsSync(concatFile)) {
      fs.unlinkSync(concatFile)
    }
  }
}

export async function addAudio(videoPath: string, audioPath: string, outputPath: string): Promise<void> {
  ensureDir(outputPath)

  const escapedVideo = ffmpegEscapePath(videoPath)
  const escapedAudio = ffmpegEscapePath(audioPath)
  const escapedOutput = ffmpegEscapePath(outputPath)

  const cmd = `${FFMPEG} -y -i '${escapedVideo}' -i '${escapedAudio}' -map 0:v -map 1:a -c:v copy -c:a aac -shortest '${escapedOutput}' 2>&1`

  try {
    execSync(cmd, { stdio: 'pipe' })
  } catch (err: any) {
    throw new Error(`FFmpeg audio merge failed: ${err.message}\nCommand: ${cmd}`)
  }
}
