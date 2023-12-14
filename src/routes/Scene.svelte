<script lang="ts">
  import { T, useLoader, useTask, useThrelte } from '@threlte/core';
  import { OrbitControls, Sky, interactivity, useCursor, useGltf } from '@threlte/extras';
  import { Layers, Mesh, TextureLoader, MeshStandardMaterial, OrthographicCamera, Raycaster, Vector2, Vector3, RepeatWrapping, CubeReflectionMapping, CubeRefractionMapping, EquirectangularReflectionMapping, CubeUVReflectionMapping, ShaderMaterial } from 'three';
  import { onMount } from 'svelte';
  import FluidSurface from './FluidSurface.svelte';
  import { send } from '$lib/client/websocket';
  import { ClientMesasgeType } from '$lib';
  import { users } from '$lib/client/scene';
  import OverlayMenu from './OverlayMenu.svelte';
  import { tweened } from 'svelte/motion';
  import TileTexture from '$lib/client/textures/pool.png?url';
  import PoolHandles from '$lib/client/models/handles.glb?url';

  const { camera, scene, renderer, autoRender } = useThrelte();
  // $: $camera.layers.enable(2);

  // interactivity();

  const width = 15,
    height = 20;

  const raycaster = new Raycaster();
  let meshRay = new Mesh();

  let sources: [x: number, y: number, z: number][] = [];

  $: $users.forEach((user) => {
    if (user.cursorX != Infinity && user.cursorY != Infinity) {
      sources.push([user.cursorX, user.cursorY, 1]);
      user.cursorX = Infinity;
      user.cursorY = Infinity;
    }
  });

  onMount(() => {
    let timeLastMouse = 0;
    const movemouse = (event: MouseEvent) => {
      if (Date.now() - timeLastMouse < 50) return;
      timeLastMouse = Date.now();
      const source = new Vector2((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
      raycaster.setFromCamera(source, $camera);
      const intersects = raycaster.intersectObject(meshRay);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        sources.push([point.x, point.z, 1]);
        send({ type: ClientMesasgeType.CURSOR_POSITION, data: { x: point.x, y: point.z } });
      }
    };
    addEventListener('mousemove', movemouse);
    return () => {
      removeEventListener('mousemove', movemouse);
    };
  });

  const tileTexture = useLoader(TextureLoader).load(TileTexture);
  // const wallMaterial = new MeshStandardMaterial({ color: 'white' });
  // tileTexture.then((texture) => {
  //   texture.repeat.set(10, 10);
  //   wallMaterial.map = texture;
  //   wallMaterial.map.needsUpdate = true;
  // });

  const wallMaterial = new ShaderMaterial();
  wallMaterial.vertexShader = `
    varying vec3 worldPos;
    varying vec2 vUv;
    varying vec3 vNormal;
    void main() {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      worldPos = position;
      vUv = uv;
      vNormal = normal;
    }
  `;
  wallMaterial.fragmentShader = `
    uniform sampler2D map;
    uniform vec3 boxSize;
    varying vec3 worldPos;
    varying vec2 vUv;
    varying vec3 vNormal;

    void main() {
      if (vNormal.y > 0.5) {
        // Texture based on world position
        gl_FragColor = texture2D(map, vec2(vUv.x * worldPos.x / boxSize.x,vUv.y *  worldPos.z / boxSize.z));
        return;
      }
      if (vNormal.y < -0.5) {
        // Texture based on world position
        gl_FragColor = texture2D(map, vec2(worldPos.x / boxSize.x, worldPos.z / boxSize.z));
        return;
      }
      if (vNormal.x > 0.5) {
        // Texture based on world position
        gl_FragColor = texture2D(map, vec2(worldPos.z / boxSize.z, worldPos.y / boxSize.y));
        return;
      }
      if (vNormal.x < -0.5) {
        // Texture based on world position
        gl_FragColor = texture2D(map, vec2(worldPos.z / boxSize.z, worldPos.y / boxSize.y));
        return;
      }
      if (vNormal.z > 0.5) {
        // Texture based on world position
        gl_FragColor = texture2D(map, vec2(worldPos.x / boxSize.x, worldPos.y / boxSize.y));
        return;
      }
      if (vNormal.z < -0.5) {
        // Texture based on world position
        gl_FragColor = texture2D(map, vec2(worldPos.x / boxSize.x, worldPos.y / boxSize.y));
        return;
      }
    }
  `;
  tileTexture.then((texture) => {
    wallMaterial.uniforms.map = { value: texture };
  });

  const poolHandles = useGltf(PoolHandles).then((model) => model.scene);
</script>

<T.OrthographicCamera
  makeDefault
  zoom={40}
  position={[10, 10, 10]}
  on:create={({ ref }) => {
    ref.lookAt(0, 0, 0);
  }}>
  <OverlayMenu />
  <OrbitControls enablePan={false} enableZoom={false} target={[0, 0, 0]} minPolarAngle={-Math.PI} maxPolarAngle={Math.PI / 2 - Math.PI / 16} />
</T.OrthographicCamera>

<T.DirectionalLight position={[10, 10, 10]} castShadow />

<T.AmbientLight intensity={0.3} />

<Sky elevation={-5} rayleigh={0} turbidity={20} mieCoefficient={0.03} mieDirectionalG={0} />

<FluidSurface {width} {height} bind:sources />
<T is={meshRay} rotation.x={-Math.PI / 2} visible={false}>
  <T.PlaneGeometry args={[width, height, 1, 1]} />
  <!-- <T.MeshBasicMaterial color="red" wireframe /> -->
</T>

<!-- Tank holding water -->
{#await poolHandles then object}
  <T is={object} position={[-height / 2 + 1.5, 1, -width / 2]} rotation.y={Math.PI}></T>
{/await}
<T.Mesh position={[0, -2, height / 2 + 0.5]}>
  <T.BoxGeometry args={[width, 5, 1]} />
  <T
    is={wallMaterial.clone()}
    uniform={{
      boxSize: { value: [width, 5, 1] }
    }} />
</T.Mesh>
<T.Mesh position={[0, -2, -(height / 2) - 0.5]}>
  <T.BoxGeometry args={[width, 5, 1]} />
  <T is={wallMaterial.clone()} />
</T.Mesh>
<T.Mesh position={[width / 2 + 0.5, -2, 0]}>
  <T.BoxGeometry args={[1, 5, height + 2]} />
  <T is={wallMaterial.clone()} />
</T.Mesh>
<T.Mesh position={[-width / 2 - 0.5, -2, 0]}>
  <T.BoxGeometry args={[1, 5, height + 2]} />
  <T is={wallMaterial.clone()} />
</T.Mesh>
<T.Mesh position={[0, -4, 0]}>
  <T.BoxGeometry args={[width, 1, height]} />
  <T is={wallMaterial.clone()} />
</T.Mesh>
