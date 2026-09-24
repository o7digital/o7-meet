/**
 * Vendor-neutral video contract. A future LiveKit adapter should implement this API.
 */
export class VideoProvider {
  async connect() { throw new Error('VideoProvider.connect must be implemented'); }
  async disconnect() { throw new Error('VideoProvider.disconnect must be implemented'); }
  async setMicrophoneEnabled() { throw new Error('VideoProvider.setMicrophoneEnabled must be implemented'); }
  async setCameraEnabled() { throw new Error('VideoProvider.setCameraEnabled must be implemented'); }
  async setScreenShareEnabled() { throw new Error('VideoProvider.setScreenShareEnabled must be implemented'); }
  async listDevices() { return { microphones: [], cameras: [], speakers: [] }; }
}
