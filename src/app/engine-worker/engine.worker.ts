/// <reference lib="webworker" />
import { handleEngineRequest } from './handler';
import type { EngineRequest } from './protocol';

addEventListener('message', (event: MessageEvent<EngineRequest>) => {
  postMessage(handleEngineRequest(event.data));
});
