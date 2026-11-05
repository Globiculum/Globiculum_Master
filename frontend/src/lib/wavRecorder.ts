/**
 * Microphone recording for voice typing (VoiceInputButton), returned as a
 * 16 kHz mono WAV: a format Gemini accepts whichever browser recorded it
 * (MediaRecorder itself gives WebM in Chrome, MP4 in Safari, Ogg in Firefox).
 * 16 kHz is what speech recognition uses, and keeps a minute under 2 MB.
 */

const TARGET_SAMPLE_RATE = 16_000;

export interface WavRecording {
  /** Base64 WAV data (no data: prefix). */
  base64: string;
  mimeType: "audio/wav";
  durationSeconds: number;
}

export interface WavRecorder {
  /** Stops and returns the recording, or null if nothing was captured. */
  stop: () => Promise<WavRecording | null>;
  /** Stops and throws the recording away (e.g. the form closed). */
  cancel: () => void;
}

export const canRecordAudio = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  (typeof window.AudioContext !== "undefined" || typeof (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext !== "undefined");

/**
 * Asks for the microphone and starts recording. Rejects if access is refused.
 * `onLimit` fires once `maxSeconds` is reached; the caller then calls stop().
 */
export async function startWavRecording(maxSeconds: number, onLimit: () => void): Promise<WavRecorder> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  });
  const recorder = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const limitTimer = window.setTimeout(onLimit, maxSeconds * 1000);
  recorder.start();

  const release = () => {
    window.clearTimeout(limitTimer);
    stream.getTracks().forEach((t) => t.stop());
  };

  const stopped = () =>
    new Promise<void>((resolve) => {
      if (recorder.state === "inactive") return resolve();
      recorder.addEventListener("stop", () => resolve(), { once: true });
      recorder.stop();
    });

  return {
    stop: async () => {
      await stopped();
      release();
      if (chunks.length === 0) return null;
      const blob = new Blob(chunks, { type: recorder.mimeType || chunks[0].type });
      return toWav(blob);
    },
    cancel: () => {
      recorder.ondataavailable = null;
      if (recorder.state !== "inactive") recorder.stop();
      release();
    },
  };
}

async function toWav(blob: Blob): Promise<WavRecording | null> {
  const AudioCtx =
    window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  } finally {
    void ctx.close();
  }
  if (decoded.duration < 0.3) return null;

  // Resample to 16 kHz mono; a mono destination mixes the channels down.
  const frames = Math.ceil(decoded.duration * TARGET_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const wav = encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
  return { base64: await blobToBase64(wav), mimeType: "audio/wav", durationSeconds: decoded.duration };
}

/** 16-bit PCM WAV. */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
