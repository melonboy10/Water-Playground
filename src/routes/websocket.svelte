<script lang="ts">
  import { ClientMesasgeType, ServerMessageType } from '$lib';
  import { onMount } from 'svelte';

  let webSocketEstablished = false;
  let ws: WebSocket;
  let log: string[] = [];

  const logEvent = (str: string) => {
    log = [...log, str];
  };

  function establishWebSocket() {
    if (webSocketEstablished) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/websocket`);
    ws.addEventListener('open', (event) => {
      webSocketEstablished = true;
      console.log('[websocket] connection open', event);
      logEvent('[websocket] connection open');
    });
    ws.addEventListener('close', (event) => {
      console.log('[websocket] connection closed', event);
      logEvent('[websocket] connection closed');
      users = [];
    });
    ws.addEventListener('message', (event) => {
      // console.log('[websocket] message received', event);
      // logEvent(`[websocket] message received: ${event.data}`);

      const message = JSON.parse(event.data);
      switch (message.type) {
        case ServerMessageType.HELLO:
          logEvent(`[websocket] received "Hello"`);
          break;
        case ServerMessageType.CURSOR_POSITION: {
          const { socketId, x, y } = message.data;
          const user = users.find((user) => user.socketId === socketId);
          // console.log(user);
          if (user) {
            user.x = x;
            user.y = y;
          }
          users = users;
          break;
        }
        case ServerMessageType.ADD_USER: {
          const { socketId, username } = message.data;
          users = [...users, { socketId, x: 0, y: 0, color: `#${Math.floor(Math.random() * 16777215).toString(16)}` }];
          break;
        }
        case ServerMessageType.REMOVE_USER: {
          const { socketId } = message.data;
          users = users.filter((user) => user.socketId !== socketId);
          break;
        }
      }
    });
  }

  let users: { socketId: string; x: number; y: number; color: string }[] = [];

  onMount(() => {
    let listener = (event: MouseEvent) => {
      if (!webSocketEstablished) return;
      ws.send(JSON.stringify({ type: ClientMesasgeType.CURSOR_POSITION, data: { x: event.clientX, y: event.clientY } }));
    };
    addEventListener('mousemove', listener);

    return () => {
      removeEventListener('mousemove', listener);
    };
  });

  async function sendHello() {
    if (!webSocketEstablished) return;

    ws.send(JSON.stringify({ type: ClientMesasgeType.HELLO, data: {} }));
  }
</script>

<h1>SvelteKit with WebSocket Integration</h1>

<button
  disabled={webSocketEstablished}
  on:click={() => {
    establishWebSocket();
  }}
  class="border-2 border-gray-500 py-2 px-4 rounded">
  Establish WebSocket connection
</button>

<button
  on:click={() => {
    sendHello();
  }}
  class="border-2 border-gray-500 py-2 px-4 rounded">
  Send "Hello" to WebSocket
</button>

{#each users as user}
  <div class="absolute w-4 h-4 rounded-full" style={`top: ${user.y}px; left: ${user.x}px; background-color: ${user.color};`}>
    <span class="sr-only">Cursor</span>
  </div>
{/each}

<ul>
  {#each log as event}
    <li>{event}</li>
  {/each}
</ul>
