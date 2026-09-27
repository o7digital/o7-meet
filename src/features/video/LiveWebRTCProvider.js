import { VideoProvider } from './VideoProvider';

export class LiveWebRTCProvider extends VideoProvider {
  constructor() { super(); this.state = { connected: false, microphone: true, camera: true, screenShare: false, localStream: null, remoteStream: null, participantCount: 0 }; this.listeners = new Set(); this.socket = null; this.peer = null; }
  emit() { this.listeners.forEach((listener) => listener(this.state)); }
  subscribe(listener) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async connect(roomId) {
    this.roomId = roomId; this.state.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'; this.iceConfig = await fetch('/config.json').then((response) => response.json()); this.socket = new WebSocket(protocol + '://' + window.location.host + '/ws');
    await new Promise((resolve, reject) => { this.socket.addEventListener('open', () => { this.socket.send(JSON.stringify({ type: 'join', roomId })); resolve(); }, { once: true }); this.socket.addEventListener('error', () => reject(new Error('Signalisation WebSocket indisponible')), { once: true }); });
    this.socket.addEventListener('message', (event) => this.onSignal(JSON.parse(event.data))); this.state.connected = true; this.emit(); return this.state;
  }
  createPeer() { this.peer = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, ...(this.iceConfig?.turnUrls?.length ? [{ urls: this.iceConfig.turnUrls, username: this.iceConfig.turnUsername, credential: this.iceConfig.turnCredential }] : [])] }); this.state.localStream?.getTracks().forEach((track) => this.peer.addTrack(track, this.state.localStream)); this.peer.onicecandidate = ({ candidate }) => candidate && this.send({ type: 'ice-candidate', candidate }); this.peer.ontrack = ({ streams: [stream] }) => { this.state.remoteStream = stream; this.emit(); }; }
  async onSignal(message) {
    if (message.type === 'joined') { this.peerId = message.peerId; this.state.participantCount = message.peers + 1; this.emit(); return; }
    if (message.type === 'peer-joined') { this.state.participantCount = 2; this.createPeer(); const offer = await this.peer.createOffer(); await this.peer.setLocalDescription(offer); this.send({ type: 'offer', offer }); this.emit(); return; }
    if (message.type === 'offer') { this.state.participantCount = 2; this.createPeer(); await this.peer.setRemoteDescription(message.offer); const answer = await this.peer.createAnswer(); await this.peer.setLocalDescription(answer); this.send({ type: 'answer', answer }); this.emit(); return; }
    if (message.type === 'answer' && this.peer) { await this.peer.setRemoteDescription(message.answer); return; }
    if (message.type === 'ice-candidate' && this.peer) { try { await this.peer.addIceCandidate(message.candidate); } catch { /* candidate may precede SDP */ } }
    if (message.type === 'peer-left') { this.state.remoteStream = null; this.state.participantCount = 1; this.peer?.close(); this.peer = null; this.emit(); }
  }
  send(message) { if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message)); }
  async disconnect() { this.send({ type: 'leave' }); this.socket?.close(); this.peer?.close(); this.state.localStream?.getTracks().forEach((track) => track.stop()); this.state = { ...this.state, connected: false, localStream: null, remoteStream: null, participantCount: 0 }; this.emit(); }
  async setMicrophoneEnabled(enabled) { this.state.localStream?.getAudioTracks().forEach((track) => { track.enabled = enabled; }); this.state.microphone = enabled; this.emit(); return enabled; }
  async setCameraEnabled(enabled) { this.state.localStream?.getVideoTracks().forEach((track) => { track.enabled = enabled; }); this.state.camera = enabled; this.emit(); return enabled; }
  async setScreenShareEnabled() { return false; }
  async listDevices() { const devices = await navigator.mediaDevices.enumerateDevices(); return { microphones: devices.filter((device) => device.kind === 'audioinput').map((device) => ({ id: device.deviceId, label: device.label || 'Microphone' })), cameras: devices.filter((device) => device.kind === 'videoinput').map((device) => ({ id: device.deviceId, label: device.label || 'Camera' })), speakers: devices.filter((device) => device.kind === 'audiooutput').map((device) => ({ id: device.deviceId, label: device.label || 'Speaker' })) }; }
}
