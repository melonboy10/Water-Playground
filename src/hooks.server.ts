import type { Handle } from '@sveltejs/kit';
import { building } from '$app/environment';
import { GlobalThisWSS } from '$lib/server/websocket';
import type { ExtendedGlobal } from '$lib/server/websocket';

// This can be extracted into a separate file
// let wssInitialized = false;
// function startupWebsocketServer() {
//   if (wssInitialized) return;
//   console.log('[wss:kit] setup');
//   const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
//   if (wss !== undefined) {
//     wss.on('connection', (ws) => {
//       console.log(`[wss:kit] client connected (${ws.socketId})`);
//       ws.send(`Hello from SvelteKit ${new Date().toLocaleString()} (${ws.socketId})]`);

//       ws.on('close', () => {
//         console.log(`[wss:kit] client disconnected (${ws.socketId})`);
//       });
//     });
//     wssInitialized = true;
//   }
// }

export const handle: Handle = async ({ event, resolve }) => {
  // startupWebsocketServer();
  // Skip WebSocket server when pre-rendering pages
  if (!building) {
    const wss = (globalThis as ExtendedGlobal)[GlobalThisWSS];
    if (wss !== undefined) event.locals.wss = wss;
  }
  const response = await resolve(event, {
    filterSerializedResponseHeaders: (name) => name === 'content-type'
  });
  return response;
};
