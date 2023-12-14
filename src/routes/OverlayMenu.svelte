<script lang="ts">
  import { Canvas, T, useFrame, useLoader, useTask, useThrelte } from '@threlte/core';
  import { Matrix4, Vector3, Mesh, Quaternion, Group, Object3D, MeshBasicMaterial, Material } from 'three';
  import { Box, Flex, useDimensions } from '@threlte/flex';
  import Plane from './Plane.svelte';
  import { Align, Text, interactivity, useGltf } from '@threlte/extras';
  import { GLTFLoader } from '$lib/GLTFLoader';
  import { addFloatingObject, floatingObjects, raining, starterObjects } from '$lib/client/scene';
  import { ClientMesasgeType, ServerMessageType } from '$lib';
  import { listenFor, send } from '$lib/client/websocket';
  const { camera, size } = useThrelte();

  import Ducky from '$lib/client/models/ducky.glb?url';
  import Benchy from '$lib/client/models/benchy.glb?url';
  import Whale from '$lib/client/models/whale.glb?url';
  import Submarine from '$lib/client/models/sub.glb?url';
  import Turtle from '$lib/client/models/turtle.glb?url';

  async function createMesh(path: string) {
    const model = await useGltf(path);
    const mesh = model.scene;
    mesh.userData.path = path;

    return model;
  }
  const menuObjects = [Ducky, Benchy, Whale, Submarine, Turtle].map(createMesh);
  $: console.log(starterObjects);
  $: $starterObjects.forEach((id) => {
    menuObjects[id].then((model) => {
      addFloatingObject(model.scene, true);
    });
  });

  listenFor(ServerMessageType.ADD_FLOATING_OBJECT, (data) => {
    const ndata = data as { id: number };
    menuObjects[ndata.id].then((model) => {
      console.log(model);
      addFloatingObject(model.scene);
    });
  });

  let rotation = 0;
  useTask((delta) => {
    rotation += delta;
  });

  $: menuLocation = new Vector3(0, 0, 0).unproject($camera);
  $: menuHeight = $size.height / 40 - 2;
  let menuWidth = 8;
</script>

<T.Group position={[-$size.width / 2 / 40 + menuWidth / 2 + 1, 0, 5]}>
  <Plane width={menuWidth} height={menuHeight}></Plane>
  <Flex width={menuWidth} height={menuHeight} padding={0.2} flexDirection="Column" gap={0.2} justifyContent="FlexStart" alignItems="Stretch" let:width let:height>
    <Box width="auto" height={2} let:width let:height>
      <Plane {width} {height} color={'#000000'}>
        <Text text="Object Picker" color={'white'} fontSize={1} anchorX={'50%'} anchorY={'50%'} />
      </Plane>
    </Box>
    <Box width="auto" height="auto" flexWrap="Wrap" gap={0.2} justifyContent="FlexStart">
      {#each menuObjects as model, i}
        {#await model then model}
          <Box width={3.7} height={4} let:width let:height>
            <Plane
              {width}
              {height}
              color="black"
              click={() => {
                addFloatingObject(model.scene);
                send({ type: ClientMesasgeType.ADD_FLOATING_OBJECT, data: { id: i } });
              }}>
            </Plane>
            <T is={model.scene} position={[0, -1.5, -7]} rotation.y={rotation} />
          </Box>
        {/await}
      {/each}
    </Box>
    <Box width="auto" height={1} let:width let:height>
      <Plane
        {width}
        {height}
        color="#2232dd"
        click={() => {
          $raining = !$raining;
        }}>
        <Text
          text="Toggle Rain"
          color={'black'}
          fontSize={0.5}
          anchorX={'50%'}
          anchorY={'50%'}
          on:click={() => {
            $raining = !$raining;
          }} />
      </Plane>
    </Box>
  </Flex>
</T.Group>

<!-- <Align x={-3} y={showMenu ? 0 : 14} z={false} let:align> -->
<!-- <Align x={menuLocation.x} y={menuLocation.y} z={false} let:align> -->
<!-- <Flex width={8} height={menuHeight} justifyContent="FlexStart" flexDirection="Column" gap={0.2} let:width let:height>
  <Box width="auto" height={1.5} let:height let:width>
    <Plane
      {height}
      {width}
      depth={0}
      click={() => {
        showMenu = !showMenu;
      }}>
      <Text
        text="Object Selector"
        color={'black'}
        fontSize={1}
        anchorX={'50%'}
        anchorY={'50%'}
        on:click={() => {
          showMenu = !showMenu;
        }} />
    </Plane>
  </Box>

  {#if showMenu}
    {#each menuObjects as model}
      {#await model then model}
        <Box width="auto" height={4} let:height let:width>
          <Plane
            {width}
            {height}
            depth={0}
            click={() => {
              addFloatingObject(model.scene);
            }}>
            <Text text={model.scene.userData.path} color={'black'} fontSize={0.4} anchorX={'50%'} anchorY={-1.8} material={new MeshBasicMaterial({ color: 'black', depthWrite: false, depthTest: false })} />
            <T is={model.scene} position={[0, -1.5, 1]} rotation.y={rotation} />
          </Plane>
        </Box>
      {/await}
    {/each}
  {/if}
</Flex> -->
<!-- </Align> -->
