import { api } from './olivia';
export const authService = {
  getSession: () => api('/session'),
  async joinAsGuest({ name, meetingId }) { return { user: { name, role: 'guest', meetingId } }; },
};
