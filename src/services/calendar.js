import { meetings } from '../features/meetings/data';

/** Mock boundary for O7 Calendar. */
export const calendarService = {
  async listUpcoming() { return meetings.filter((meeting) => meeting.status === 'scheduled'); },
  async schedule(meeting) { return { ...meeting, id: `meeting-${Date.now()}`, simulated: true }; },
};
