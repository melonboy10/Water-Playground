import { ClientMesasgeType, type User } from '$lib';
import { get, writable, type Writable } from 'svelte/store';
import { Vector3, type Mesh } from 'three';
import { send } from './websocket';

export const socketId: Writable<string> = writable('');
export const username: Writable<string> = writable('');

export const users: Writable<User[]> = writable([]);

export const settingRain: Writable<boolean> = writable(true);
export const raining: Writable<boolean> = writable(false);
raining.subscribe((raining) => {
  if (get(settingRain)) {
    settingRain.set(false);
    return;
  }
  send({ type: ClientMesasgeType.TOGGLE_RAIN, data: { raining } });
});
// listenFor(ServerMessageType.TOGGLE_RAIN, (data) => {
//   settingRain = true;
//   raining.set(data.raining);
// });
export const starterObjects: Writable<number[]> = writable([]);
export const floatingObjects: Writable<Mesh[]> = writable([]);

export function addFloatingObject(object: Mesh, randomPosition: boolean = false) {
  const newObject = object.clone();
  newObject.userData.velocity = new Vector3();
  newObject.userData.angularVelocity = 0;
  newObject.renderOrder = 0;
  if (randomPosition) newObject.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);
  else newObject.position.set(Math.random() / 10, 1, Math.random() / 10);
  // newObject.material = new MeshBasicMaterial();
  floatingObjects.update((objects) => (objects.push(newObject), objects));
}
