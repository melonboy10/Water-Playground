<script lang="ts">
  import { T } from '@threlte/core';
  import { interactivity, useCursor } from '@threlte/extras';
  export let color: string = 'white';
  export let height = 1;
  export let width = 1;
  export let depth = 0;
  export let opacity = 1;

  const { onPointerEnter, onPointerLeave } = useCursor('pointer', 'crosshair');
  export let click: (() => void) | undefined = undefined;

  interactivity();
</script>

<T.Mesh interactive position.z={-10} renderOrder={depth} on:click={click} on:pointerenter={click ? onPointerEnter : undefined} on:pointerleave={click ? onPointerLeave : undefined}>
  <T.PlaneGeometry args={[width, height]} />
  {#if $$slots.default}
    <slot />
  {/if}
  <T.MeshBasicMaterial {color} {opacity} depthWrite={false} transparent={opacity != 1} />
</T.Mesh>
