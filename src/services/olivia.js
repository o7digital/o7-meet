import { tasks, transcript } from '../features/meetings/data';

const mockSummary = {
  summary: 'The team aligned on prioritizing the e-commerce workflow before the seasonal peak, with backend catalog synchronization and R365 integration identified as the critical delivery path.',
  topics: ['e-commerce', 'R365', 'catalog', 'delivery'],
  decisions: ['Prioritize online ordering.', 'Use the backend catalog as the product source of truth.', 'Prepare R365 integration scope before implementation.'],
  commitments: ['Olivier will prepare the technical scope.', 'Artimex will validate the catalog structure before Friday.'],
  nextSteps: ['Share the technical scope', 'Validate catalog fields', 'Schedule integration review'],
  tasks,
  transcript,
};

/** Mock-only Olivia boundary. No real AI request is represented as completed. */
export const oliviaService = {
  async getMeetingSummary() { return { ...mockSummary, simulated: true }; },
  async ask(question) {
    const normalized = question.toLowerCase();
    let answer = 'This is a mocked Olivia answer based on the demo transcript.';
    if (normalized.includes('decid')) answer = mockSummary.decisions.join(' ');
    if (normalized.includes('action') || normalized.includes('tarea')) answer = `There are ${tasks.length} action items. Olivier owns the technical integration scope.`;
    if (normalized.includes('résum') || normalized.includes('resum')) answer = mockSummary.summary;
    return { answer, simulated: true };
  },
};

export { mockSummary };
