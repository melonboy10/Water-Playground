<script lang="ts">
  import heightmapFragmentShader from '$lib/client/shaders/heightMapFragmentShader.glsl?raw';
  import readWaterLevelFragmentShader from '$lib/client/shaders/readWaterLevelFragmentShader.glsl?raw';
  import waterVertexShader from '$lib/client/shaders/waterVertexShader.glsl?raw';
  import waterFragmentShader from '$lib/client/shaders/waterFragmentShader.glsl?raw';

  import { GPUComputationRenderer } from '$lib/GPUComputationRenderer';
  import { T, useTask, useThrelte } from '@threlte/core';
  import { BoxGeometry, BufferAttribute, BufferGeometry, Camera, ClampToEdgeWrapping, Color, HalfFloatType, Matrix4, Mesh, MeshPhongMaterial, NearestFilter, PerspectiveCamera, Points, PointsMaterial, RGBAFormat, Raycaster, ShaderChunk, ShaderLib, SphereGeometry, UniformsLib, UniformsUtils, UnsignedByteType, Vector2, Vector3, WebGLRenderTarget } from 'three';
  import { onMount } from 'svelte';
  import { text } from '@sveltejs/kit';
  import { addFloatingObject, floatingObjects, raining } from '$lib/client/scene';
  import { InstancedMesh } from '@threlte/extras';

  const { camera, renderer } = useThrelte();

  export let width: number;
  export let height: number;
  let widthHalf: number = width / 2;
  let heightHalf: number = height / 2;
  export let meshWidth: number = width * 10;
  export let meshHeight: number = height * 10;

  let rainCount = 20;

  const waterNormal = new Vector3();
  const waterUniforms = UniformsUtils.merge([
    ShaderLib.phong.uniforms,
    {
      heightmap: { value: null },
      diffuse: { value: new Vector3(70 / 255, 157 / 255, 230 / 255) },
      specular: { value: new Vector3(0.2, 0.2, 0.2) },
      shininess: { value: 50 },
      opacity: { value: 0.3 }
    }
  ]);

  export let sources: [x: number, y: number, z: number][] = [];
  // const raycaster = new Raycaster();

  // let meshRay = new Mesh();
  let gpuCompute = new GPUComputationRenderer(meshWidth, meshHeight, renderer);
  const heightmap0 = gpuCompute.createTexture();
  let heightmapVariable = gpuCompute.addVariable('heightmap', heightmapFragmentShader, heightmap0);

  if (renderer.capabilities.isWebGL2 === false) {
    gpuCompute.setDataType(HalfFloatType);
  }

  const pixels = heightmap0.image.data;
  let p = -1;
  for (let j = 0; j < meshWidth; j++) {
    for (let i = 0; i < meshHeight; i++) {
      pixels[p++] = 0;
      pixels[p++] = 0;
      pixels[p++] = 0;
      pixels[p++] = 1;
    }
  }

  gpuCompute.setVariableDependencies(heightmapVariable, [heightmapVariable]);

  heightmapVariable.material.uniforms.sourceLocations = { value: new Array(100).fill(0).map((_) => new Vector3()) };
  heightmapVariable.material.uniforms.numPositions = { value: 0 };
  heightmapVariable.material.uniforms.mouseSize = { value: 8.0 };
  heightmapVariable.material.uniforms.viscosityConstant = { value: 0.99 };
  heightmapVariable.material.uniforms.heightCompensation = { value: 0 };
  heightmapVariable.material.defines.WIDTH = width.toFixed(1);
  heightmapVariable.material.defines.HEIGHT = height.toFixed(1);
  heightmapVariable.material.defines.MESH_WIDTH = meshWidth.toFixed(1);
  heightmapVariable.material.defines.MESH_HEIGHT = meshHeight.toFixed(1);

  const error = gpuCompute.init();
  if (error !== null) {
    console.error(error);
  }

  const readWaterLevelShader = gpuCompute.createShaderMaterial(readWaterLevelFragmentShader, {
    point1: { value: new Vector2() },
    levelTexture: { value: null }
  });
  readWaterLevelShader.defines.WIDTH = width.toFixed(1);
  readWaterLevelShader.defines.HEIGHT = height.toFixed(1);
  readWaterLevelShader.defines.MESH_WIDTH = meshWidth.toFixed(1);
  readWaterLevelShader.defines.MESH_HEIGHT = meshHeight.toFixed(1);

  // Create a 4x1 pixel image and a render target (Uint8, 4 channels, 1 byte per channel) to read water height and orientation
  let readWaterLevelImage = new Uint8Array(4 * 1 * 4);

  let readWaterLevelRenderTarget = new WebGLRenderTarget(4, 1, {
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    format: RGBAFormat,
    type: UnsignedByteType,
    depthBuffer: false
  });

  const rainGeometry = new BufferGeometry();
  const rainPositions: Vector3[] = [];
  for (let i = 0; i < rainCount; i++) {
    rainPositions.push(new Vector3(Math.random() * width - width / 2, Math.random() * 10 + 15, Math.random() * height - height / 2));
  }
  rainGeometry.setFromPoints(rainPositions);
  const rainParticles = new Points(rainGeometry, new PointsMaterial({ color: 'skyblue', size: 5 }));

  useTask((delta) => {
    const uniforms = heightmapVariable.material.uniforms;
    uniforms.numPositions.value = 0;

    if (sources.length) {
      for (let i = 0; i < Math.min(sources.length, $raining ? 100 - rainCount : 100); i++) {
        const source = sources[i];
        // raycaster.setFromCamera(source, $camera);
        // raycaster.setFromCamera(source, new PerspectiveCamera(50, width / height, 0.1, 1000));
        // const intersects = raycaster.intersectObject(meshRay);

        // if (intersects.length > 0) {
        //   const point = intersects[0].point;
        uniforms.sourceLocations.value[i].x = source[0] * (meshWidth / width);
        uniforms.sourceLocations.value[i].y = source[1] * (meshHeight / height);
        uniforms.sourceLocations.value[i].z = source[2];
        uniforms.numPositions.value++;
        //   }
      }
    }
    sources = [];
    // console.log(uniforms.numPositions.value);
    // console.log(uniforms.numPositions.value, uniforms.sourceLocations.value);
    if ($raining) {
      let startingValue = uniforms.numPositions.value;
      let intersectCount = 0;
      rainGeometry.attributes.position.array.forEach((_, i) => {
        if (i % 3 == 1) {
          rainGeometry.attributes.position.array[i] -= delta * 35;
          if (rainGeometry.attributes.position.array[i] < 0) {
            uniforms.sourceLocations.value[startingValue + intersectCount].x = rainGeometry.attributes.position.array[i - 1] * (meshWidth / width);
            uniforms.sourceLocations.value[startingValue + intersectCount].y = rainGeometry.attributes.position.array[i + 1] * (meshHeight / height);
            uniforms.sourceLocations.value[startingValue + intersectCount].z = Math.random() * 0.5;
            intersectCount++;
            uniforms.numPositions.value++;

            rainGeometry.attributes.position.array[i] = Math.random() * 10 + 15;
            rainGeometry.attributes.position.array[i - 1] = Math.random() * width - widthHalf;
            rainGeometry.attributes.position.array[i + 1] = Math.random() * height - heightHalf;
          }
        }
      });

      rainGeometry.attributes.position.needsUpdate = true;
    }

    gpuCompute.compute();
    const texture = gpuCompute.getCurrentRenderTarget(heightmapVariable).texture;
    waterUniforms.heightmap.value = texture;

    readWaterLevelShader.uniforms['levelTexture'].value = texture;

    $floatingObjects.forEach((object, i) => {
      if (object) {
        // Read water level and orientation
        const u = (0.5 * object.position.x) / widthHalf + 0.5;
        const v = 1 - ((0.5 * object.position.z) / heightHalf + 0.5);
        readWaterLevelShader.uniforms.point1.value.set(u, v);
        gpuCompute.doRenderTarget(readWaterLevelShader, readWaterLevelRenderTarget);

        renderer.readRenderTargetPixels(readWaterLevelRenderTarget, 0, 0, 4, 1, readWaterLevelImage);
        const pixels = new Float32Array(readWaterLevelImage.buffer);

        // Get orientation
        waterNormal.set(pixels[1], 0, -pixels[2]);

        const pos = object.position;

        // Set height
        pos.y = pixels[0];

        // Move sphere

        waterNormal.multiplyScalar(0.003);
        object.userData.velocity.add(waterNormal);

        const closest = new Vector3();
        let closestDistance = 1000;
        $floatingObjects.forEach((otherObject) => {
          if (otherObject && otherObject !== object) {
            const distance = otherObject.position.distanceToSquared(object.position);
            if (distance < closestDistance) {
              closestDistance = distance;
              closest.copy(otherObject.position);
            }
          }
        });
        if (closestDistance < 1) {
          const direction = new Vector3().subVectors(object.position, closest).normalize();
          object.userData.velocity.add(direction.multiplyScalar(0.01));
        }

        object.userData.velocity.multiplyScalar(0.998);

        object.userData.angularVelocity += waterNormal.x;
        object.userData.angularVelocity *= 0.998;

        const y = object.rotation.y;
        object.lookAt(pos.x + waterNormal.x, pos.y + waterNormal.z, pos.z + 0.005);
        object.rotation.y = y + object.userData.angularVelocity;
        // const rotationVelocity = object.rotation;
        // object.rotation.set(rotations.x + rotationVelocity.x, rotations.y + rotationVelocity.y, rotations.z + rotationVelocity.z);
        pos.add(object.userData.velocity);

        // waterNormal.multiplyScalar(0.003);
        // object.userData.velocity.add(waterNormal);
        // object.userData.velocity.multiplyScalar(0.998);

        // object.userData.angularVelocity += waterNormal.x;
        // object.userData.angularVelocity *= 0.998;

        // pos.add(object.userData.velocity);
        // const y = object.rotation.y + 0.1;
        // object.lookAt(pos.x + waterNormal.x * 2, pos.y + waterNormal.z * 2, pos.z + 1);
        // object.rotation.y = y;
        // object.rotateY(y + object.userData.angularVelocity);

        if (pos.x < -widthHalf) {
          pos.x = -widthHalf + 0.001;
          object.userData.velocity.x *= -0.3;
        } else if (pos.x > widthHalf) {
          pos.x = widthHalf - 0.001;
          object.userData.velocity.x *= -0.3;
        }

        if (pos.z < -heightHalf) {
          pos.z = -heightHalf + 0.001;
          object.userData.velocity.z *= -0.3;
        } else if (pos.z > heightHalf) {
          pos.z = heightHalf - 0.001;
          object.userData.velocity.z *= -0.3;
        }
      }
    });
  });

  const sphereTemplate = new Mesh(new SphereGeometry(0.5, 5, 5), new MeshPhongMaterial({ color: 0xffff00 }));

  addFloatingObject(sphereTemplate);
</script>

<T.Mesh rotation.x={-Math.PI / 2}>
  <T.PlaneGeometry args={[width, height, meshWidth - 1, meshHeight - 1]} />
  <T.ShaderMaterial
    lights
    fog
    uniforms={waterUniforms}
    vertexShader={waterVertexShader}
    defines={{
      WIDTH: width.toFixed(1),
      HEIGHT: height.toFixed(1),
      MESH_WIDTH: meshWidth.toFixed(1),
      MESH_HEIGHT: meshHeight.toFixed(1)
    }}
    fragmentShader={ShaderChunk.meshphong_frag} />
</T.Mesh>

{#each $floatingObjects as object}
  <T is={object} />
{/each}

<!-- Rain -->

<T.Group position={[0, $raining ? 0 : 100, 0]}>
  <T is={rainParticles} />
</T.Group>
