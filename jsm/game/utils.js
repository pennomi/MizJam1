import {GLTFLoader} from "../thirdparty/GLTFLoader.js";
import * as THREE from "../thirdparty/three.module.js";


export async function loadGLTF(url, overrideTexture=null) {
	return new Promise((resolve, reject) => {
		let loader = new GLTFLoader();
		loader.load(url, gltf => {
			if (overrideTexture !== null) {
				gltf.scene.traverse(node=>{
					if (node instanceof THREE.Mesh) {
						node.material.map = overrideTexture;
					}
				});
			}

			resolve(gltf);
		}, null, reject);
	});
}


export async function sleep(seconds) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(seconds * 1000)));
}


// Linear interpolator for Vector3s
export function lerp(start=new THREE.Vector3(), target=new THREE.Vector3(), percent) {
	start = start.clone();
	target = target.clone();
	if (percent >= 1) {
		return target;
	}
	percent = Math.max(percent, 0);
	return start.add(target.sub(start).multiplyScalar(percent));
}


// Jump interpolators for Vector3s
export function jerp1(start=new THREE.Vector3(), target=new THREE.Vector3(), percent) {
	start = start.clone();
	target = target.clone();
	if (percent >= 1) {
		return target;
	}
	percent = Math.max(percent, 0);

	let offset = target.sub(start);
	offset.x = offset.x * (1-Math.cos(Math.PI/2 * percent));
	offset.y = offset.y * Math.sin(Math.PI/2 * percent);
	return start.add(offset);
}

export function jerp2(start=new THREE.Vector3(), target=new THREE.Vector3(), percent) {
	start = start.clone();
	target = target.clone();
	if (percent >= 1) {
		return target;
	}
	percent = Math.max(percent, 0);

	let offset = target.sub(start);
	offset.x = offset.x * Math.sin(Math.PI/2 * percent);
	offset.y = offset.y * (1-Math.cos(Math.PI/2 * percent));
	return start.add(offset);
}