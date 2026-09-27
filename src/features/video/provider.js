import { LiveWebRTCProvider } from './LiveWebRTCProvider';

let provider;

export function getVideoProvider() {
  if (!provider) provider = new LiveWebRTCProvider();
  return provider;
}
