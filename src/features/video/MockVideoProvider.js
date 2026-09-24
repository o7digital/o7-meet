import { VideoProvider } from './VideoProvider';

export class MockVideoProvider extends VideoProvider {
  state = { connected: false, microphone: true, camera: true, screenShare: false };
  async connect(roomId) { this.state = { ...this.state, connected: true, roomId }; return this.state; }
  async disconnect() { this.state = { ...this.state, connected: false }; return this.state; }
  async setMicrophoneEnabled(enabled) { this.state.microphone = enabled; return enabled; }
  async setCameraEnabled(enabled) { this.state.camera = enabled; return enabled; }
  async setScreenShareEnabled(enabled) { this.state.screenShare = enabled; return enabled; }
  async listDevices() {
    return {
      microphones: [{ id: 'mock-mic', label: 'MacBook Microphone (demo)' }],
      cameras: [{ id: 'mock-camera', label: 'FaceTime Camera (demo)' }],
      speakers: [{ id: 'mock-speaker', label: 'MacBook Speakers (demo)' }],
    };
  }
}
