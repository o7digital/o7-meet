import { Document, Packer, Paragraph, HeadingLevel } from 'docx';
import { ApiError } from './store.mjs';
import { transcriptText } from './transcript.mjs';
import { languages } from './pipeline.mjs';

export const documentKinds = { original: 'Transcription originale', translation: 'Traduction', report: 'Compte rendu', summary: 'Résumé court', all: 'Dossier de réunion' };
export function reportText(report) {
  return `SUJETS\n${report.topics.map(t => `• ${t}`).join('\n') || 'Aucun sujet identifié.'}\n\nDÉCISIONS\n${report.decisions.map(d => `• ${d.text}\n  Source : « ${d.evidence} »`).join('\n') || 'Aucune décision explicitement mentionnée.'}\n\nACTIONS\n${report.actions.map(a => `• ${a.text}\n  Responsable : ${a.owner || 'Non mentionné'}\n  Échéance : ${a.deadline || 'Non mentionnée'}\n  Source : « ${a.evidence} »`).join('\n\n') || 'Aucune action explicitement mentionnée.'}`;
}
export function documentText(meeting, kind) {
  if (!documentKinds[kind]) throw new ApiError(400, 'Type de document invalide.');
  const speakers = [...new Set((meeting.original?.segments || []).map(s => s.speaker).filter(Boolean))];
  const intro = `${meeting.title}\n${documentKinds[kind]}\nDate de réunion : ${meeting.meetingDate || 'Non renseignée'}\nImport : ${meeting.createdAt}\nLangue originale : ${meeting.original?.language || (meeting.originalLanguage === 'auto' ? 'Non déterminée' : languages[meeting.originalLanguage] || meeting.originalLanguage)}\nLangue de traduction et des documents : ${languages[meeting.targetLanguage]}\nIntervenants : ${speakers.join(', ') || 'Identités non disponibles'}\nDocument privé — accès limité aux destinataires choisis.\n`;
  const sections = [];
  if (['original', 'all'].includes(kind)) { if (!meeting.original) throw new ApiError(409, 'La transcription originale n’est pas encore disponible.'); sections.push(`TRANSCRIPTION ORIGINALE\n\n${transcriptText(meeting.original)}`); }
  if (['translation', 'all'].includes(kind)) { if (!meeting.translation) throw new ApiError(409, 'La traduction n’est pas encore disponible.'); sections.push(`TRADUCTION\n\n${transcriptText(meeting.translation)}`); }
  if (['report', 'all'].includes(kind)) { if (!meeting.report) throw new ApiError(409, 'Le compte rendu n’est pas encore disponible.'); sections.push(`COMPTE RENDU\n\n${reportText(meeting.report)}`); }
  if (['summary', 'all'].includes(kind)) { if (!meeting.summary) throw new ApiError(409, 'Le résumé n’est pas encore disponible.'); sections.push(`RÉSUMÉ COURT\n\n${meeting.summary}`); }
  return `${intro}\n${sections.join('\n\n')}\n`;
}
export async function exportDocument(meeting, kind, format) {
  const text = documentText(meeting, kind);
  if (format === 'txt') return { mime: 'text/plain; charset=utf-8', data: Buffer.from(`\uFEFF${text}`, 'utf8') };
  if (format !== 'docx') throw new ApiError(400, 'Format d’export invalide.');
  const paragraphs = text.split('\n').map((line, index) => new Paragraph({ text: line, ...(index === 0 ? { heading: HeadingLevel.TITLE } : {}), spacing: { after: 100 } }));
  return { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: await Packer.toBuffer(new Document({ creator: 'Olivia One Meet', title: meeting.title, description: documentKinds[kind], sections: [{ children: paragraphs }] })) };
}
