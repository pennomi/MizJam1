import * as THREE from "../thirdparty/three.module.js";
import {GLTFLoader} from "../thirdparty/GLTFLoader.js";

const COMMANDS = {
	moveLeft: 0,
	moveRight: 1,
	moveUp: 2,
	moveDown: 3,
	jumpLeft: 4,
	jumpRight: 5,
}


export class Character {
	gltfUrl = null;

	constructor () {
		this.scene = new THREE.Scene();
		this.mixer = undefined;
	}

	async load (x, y) {
		if (this.gltfUrl === null) {
			throw Error("Set the GLTF url for this Character!");
		}

		return new Promise((resolve, reject) => {
			let loader = new GLTFLoader();
			loader.load(this.gltfUrl, gltf => {
				// Add it to the scene
				this.scene = gltf.scene;
				this.scene.position.set(x, -y + 0.5, 0);

				// Set up the animation mixer to play the first animation in the GLTF if it exists
				this.mixer = new THREE.AnimationMixer(gltf.scene);
				if (gltf.animations.length) {
					this.mixer.clipAction(gltf.animations[0]).play();
				}

				// Return it
				resolve(this.scene);
			}, null, reject);
		});
	}

	update(dt) {
		// Update the model animations
		if (this.mixer !== undefined) {
			this.mixer.update(dt);
		}
	}

	execute (command) {
		if (command === COMMANDS.moveLeft) {
			this.moveLeft();
		} else if (command === COMMANDS.moveRight) {
			this.moveRight();
		} else if (command === COMMANDS.moveUp) {
			this.moveUp();
		} else if (command === COMMANDS.moveDown) {
			this.moveDown();
		} else if (command === COMMANDS.jumpLeft) {
			this.jumpLeft();
		} else if (command === COMMANDS.jumpRight) {
			this.jumpRight();
		}
	}

	moveLeft () {

	}

	moveRight () {

	}

	moveUp () {

	}

	moveDown () {

	}

	jumpLeft () {

	}

	jumpRight () {

	}
}

class Prophet extends Character {
	gltfUrl = "../data/models/characters/prophet.glb";
}

class Pride extends Character {
	gltfUrl = "../data/models/characters/pride.glb";
}


export const CHARACTER_TYPES = {
	prophet: Prophet,
	pride: Pride
};
