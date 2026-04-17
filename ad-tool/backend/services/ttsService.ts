import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const AUDIO_DIR = path.join(__dirname, '../tmp/audio')

export async function generateVoiceover(text: string, fileId: string): Promise<string> {
  const outputPath = path.join(AUDIO_DIR, `${fileId}.mp3`)

  const mp3 = await openai.audio.speech.create({
    model: 'tts-1',
    voice: 'alloy',        // Options: alloy, echo, fable, onyx, nova, shimmer
    input: text,
    speed: 1.0
  })

  const buffer = Buffer.from(await mp3.arrayBuffer())
  fs.writeFileSync(outputPath, buffer)

  console.log(`[TTS] Generated: ${outputPath}`)
  return outputPath
}

// Get actual audio duration using ffprobe
export async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process')
    const cmd = `ffprobe -v error -show_entries format=duration -of csv=p=0 "${audioPath}"`
    exec(cmd, (err: any, stdout: string) => {
      if (err) reject(err)
      else resolve(parseFloat(stdout.trim()))
    })
  })
}
