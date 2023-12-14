<script lang="ts">
  import { onMount } from 'svelte';
  import { establishWebSocket } from '$lib/client/websocket';
  import '../app.css';

  onMount(() => {
    establishWebSocket();
  });
</script>

<div class="absolute w-screen h-screen overflow-hidden">
  <slot />
</div>
