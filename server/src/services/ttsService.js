/**
 * PrepAI Neural TTS Service
 * Powered by Microsoft Edge Neural Speech Engine (Zero API Keys, Free, Ultra-Realistic Human Speech)
 */
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const NEURAL_VOICES = {
  'christopher': 'en-US-ChristopherNeural', // Deep, authoritative Staff SDE / Bar Raiser (Default)
  'guy': 'en-US-GuyNeural',                 // Confident Tech Lead
  'jenny': 'en-US-JennyNeural',             // Clear, natural Principal Engineer
  'eric': 'en-US-EricNeural',               // Energetic SDE
  'prabhat': 'en-IN-PrabhatNeural',         // Clear Indian English Male
  'neerja': 'en-IN-NeerjaNeural'            // Clear Indian English Female
};

const DEFAULT_VOICE = 'en-US-ChristopherNeural';

// Only known short names or well-formed Azure neural voice names reach the SSML request
const VOICE_NAME = /^[a-z]{2,3}-[A-Z]{2}-[A-Za-z]{2,40}Neural$/;
function resolveVoice(voiceKey) {
  const key = typeof voiceKey === 'string' ? voiceKey.trim() : '';
  if (NEURAL_VOICES[key.toLowerCase()]) return NEURAL_VOICES[key.toLowerCase()];
  return VOICE_NAME.test(key) ? key : DEFAULT_VOICE;
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Clean text for natural human pronunciation
 */
function sanitizeTextForSpeech(text) {
  if (!text) return '';
  return text
    .replace(/```[\s\S]*?```/g, '') // remove code blocks
    .replace(/`([^`]+)`/g, '$1')     // remove inline code ticks
    .replace(/[*_~#]/g, '')          // remove markdown formatting symbols
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove links, keep text
    .replace(/\s+/g, ' ')            // collapse whitespace
    .trim();
}

/**
 * Synthesize speech as a readable MP3 stream
 * @param {string} text - The text to speak
 * @param {string} voiceKey - Key or full voice identifier
 * @returns {Promise<Readable>} - Stream of MP3 audio bytes
 */
async function synthesizeSpeechStream(text, voiceKey = 'christopher') {
  const cleanText = sanitizeTextForSpeech(text);
  if (!cleanText) {
    throw new Error('Text is empty after sanitization');
  }

  const selectedVoice = resolveVoice(voiceKey);

  const tts = new MsEdgeTTS();
  await tts.setMetadata(selectedVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);

  // msedge-tts pastes text into SSML unescaped: escape it so "a < b" or "R&D" cannot break
  // (or inject into) the speech request
  const { audioStream } = tts.toStream(escapeXml(cleanText));
  // Each instance opens its own WebSocket to Edge; close it when the audio is done (or fails)
  let closed = false;
  const closeSocket = () => {
    if (closed) return;
    closed = true;
    try { tts.close(); } catch { /* already closed */ }
  };
  audioStream.once('end', closeSocket);
  audioStream.once('close', closeSocket);
  audioStream.once('error', closeSocket);
  return audioStream;
}

const SYNTHESIS_TIMEOUT_MS = 30000;

/**
 * Synthesize speech to Buffer (useful for caching or direct transmission)
 * @param {string} text
 * @param {string} voiceKey
 * @returns {Promise<Buffer>}
 */
async function synthesizeSpeechBuffer(text, voiceKey = 'christopher') {
  const stream = await synthesizeSpeechStream(text, voiceKey);
  return new Promise((resolve, reject) => {
    const chunks = [];
    // Never leave the HTTP request hanging if Edge stops responding mid-stream
    const timer = setTimeout(() => {
      stream.destroy(new Error('Speech synthesis timed out'));
    }, SYNTHESIS_TIMEOUT_MS);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    stream.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
}

module.exports = {
  NEURAL_VOICES,
  synthesizeSpeechStream,
  synthesizeSpeechBuffer,
  sanitizeTextForSpeech,
  resolveVoice,
  escapeXml
};
