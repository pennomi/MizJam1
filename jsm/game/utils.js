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
