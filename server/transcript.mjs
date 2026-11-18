import { ApiError } from './store.mjs';

const decode = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
export function seconds(time) {
  const values = time.replace(',', '.').split(':').map(Number);
  return values.reduce((sum, value) => sum * 60 + value, 0);
}
export function timestamp(value) {
  if (value === null || value === undefined) return '';
  const millis = Math.max(0, Math.round(value * 1000)), total = Math.floor(millis / 1000);
  return [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60].map(x => String(x).padStart(2, '0')).join(':') + '.' + String(millis % 1000).padStart(3, '0');
}
export function parseTranscript(buffer, extension) {
  let text;
  try {
    const encoding = buffer[0] === 0xff && buffer[1] === 0xfe ? 'utf-16le' : buffer[0] === 0xfe && buffer[1] === 0xff ? 'utf-16be' : 'utf-8';
    text = new TextDecoder(encoding, { fatal: true }).decode(buffer).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  } catch { throw new ApiError(422, 'Encodage invalide : utilisez UTF-8 ou UTF-16.', 'INVALID_TRANSCRIPT'); }
  if (!text || text.includes('\0')) throw new ApiError(422, 'La transcription est vide ou contient des données binaires.');
  if (text.length > 220000) throw new ApiError(413, 'Transcription limitée à 220 000 caractères. Divisez cette réunion en plusieurs parties.');
  const segments = [];
  if (['.vtt', '.srt'].includes(extension)) {
    // Cue IDs, timing settings, NOTE/STYLE blocks and multiline Teams voice tags are supported.
    for (const block of text.split(/\n\s*\n/)) {
      const lines = block.split('\n');
      if (/^(NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;
      const timing = lines.findIndex(line => line.includes('-->'));
      if (timing < 0) continue;
      const match = lines[timing].match(/((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})\s*-->\s*((?:\d{2,}:)?\d{2}:\d{2}[.,]\d{3})/);
      if (!match || seconds(match[2]) < seconds(match[1])) throw new ApiError(422, 'Horodatage VTT/SRT invalide.');
      const content = lines.slice(timing + 1).join('\n');
      const voices = [...content.matchAll(/<v(?:\.[^\s>]*)?\s+([^>]+)>([\s\S]*?)(?:<\/v>|(?=<v\s)|$)/g)];
      for (const voice of voices.length ? voices : [[null, '', content]]) {
        let speaker = decode(voice[1]).trim() || null;
        let words = decode(voice[2].replace(/<[^>]*>/g, '')).trim();
        if (!speaker) { const named = words.match(/^([^:\n]{1,80}):\s+([\s\S]+)$/); if (named) { speaker = named[1]; words = named[2]; } }
        if (words) segments.push({ id: segments.length, start: seconds(match[1]), end: seconds(match[2]), speaker, text: words });
      }
    }
    if (!segments.length) throw new ApiError(422, 'Aucun sous-titre valide trouvé dans ce fichier VTT/SRT.');
  } else {
    for (const line of text.split('\n').filter(x => x.trim())) {
      const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.*)$/);
      let words = match ? match[2] : line, speaker = null;
      const named = words.match(/^([^:\n]{1,80}):\s+([\s\S]+)$/);
      if (named) { speaker = named[1]; words = named[2]; }
      // Chunk long plain-text paragraphs without losing any words or inventing timecodes.
      for (const part of words.trim().match(/[\s\S]{1,6000}(?:\s|$)|[\s\S]{1,6000}/g) || []) segments.push({ id: segments.length, start: match ? seconds(match[1]) : null, end: null, speaker, text: part });
    }
  }
  return { segments, text, language: null, engine: 'import' };
}
export function transcriptText(transcript) {
  return transcript.segments.map(s => `${s.start === null ? '' : `[${timestamp(s.start)}${s.end === null ? '' : ` → ${timestamp(s.end)}`}] `}${s.speaker || 'Intervenant non identifié'} : ${s.text}`).join('\n\n');
}
