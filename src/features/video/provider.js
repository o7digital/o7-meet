import { MockVideoProvider } from './MockVideoProvider';

let provider;

export function getVideoProvider() {
  if (!provider) provider = new MockVideoProvider();
  return provider;
}
