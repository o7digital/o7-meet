const demoSession = {
  user: { id: 'user-os', tenantId: 'tenant-o7', name: 'Olivier Steineur', email: 'olivier@o7digital.com', role: 'admin', permissions: ['meeting:create', 'meeting:end', 'crm:push'] },
  organization: { id: 'tenant-o7', name: 'O7 Digital', slug: 'o7digital' },
};

/** Boundary for the future Olivia One SSO exchange. */
export const authService = {
  async getSession() { return demoSession; },
  async exchangeOliviaOneSession(payload) {
    if (!payload?.userId || !payload?.tenantId || !payload?.session) throw new Error('Invalid Olivia One session payload');
    return { user: { id: payload.userId, tenantId: payload.tenantId, role: payload.role || 'member', permissions: payload.permissions || [] }, organization: payload.organization };
  },
  async joinAsGuest({ name, meetingId }) { return { user: { id: `guest-${Date.now()}`, name, role: 'guest', permissions: ['meeting:join'], meetingId }, organization: null }; },
};
