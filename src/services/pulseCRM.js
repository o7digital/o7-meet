const MOCK_DELAY = 500;

function simulatedResult(action, payload) {
  return new Promise((resolve) => window.setTimeout(() => resolve({ ok: true, simulated: true, action, payload }), MOCK_DELAY));
}

/** Mock contract. Replace this implementation with authenticated Pulse CRM API calls. */
export const pulseCRM = {
  sendMeetingSummary: (meetingId, summary) => simulatedResult('sendMeetingSummary', { meetingId, summary }),
  createActivity: (activity) => simulatedResult('createActivity', activity),
  createTask: (task) => simulatedResult('createTask', task),
  createClientNote: (note) => simulatedResult('createClientNote', note),
  createOpportunity: (opportunity) => simulatedResult('createOpportunity', opportunity),
  linkMeetingToClient: (meetingId, clientId) => simulatedResult('linkMeetingToClient', { meetingId, clientId }),
  linkMeetingToDeal: (meetingId, dealId) => simulatedResult('linkMeetingToDeal', { meetingId, dealId }),
};
