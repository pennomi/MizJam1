import * as THREE from "../thirdparty/three.module.js";
import {loadGLTF} from "./utils.js";


const COMMANDS = {
	moveLeft: "←",
	moveRight: "→",
	moveUp: "↑",
	moveDown: "↓",
	jumpLeft: "⇧",
	jumpRight: "⇧",
}


const CHARACTER_SPEED = 2;


export class Character {
	gltfUrl = null;

	constructor () {
		this.scene = new THREE.Scene();
		this.mixer = undefined;
		this.isMoving = false;
		this.targetPosition = new THREE.Vector3();
	}

	async load (x, y) {
		if (this.gltfUrl === null) {
			throw Error("Set the GLTF url for this Character!");
		}

		const gltf = await loadGLTF(this.gltfUrl);
		this.scene = gltf.scene;
		this.scene.position.set(x, -y + 0.5, 0);
		this.targetPosition = this.scene.position.clone();

		// Set up the animation mixer to play the first animation in the GLTF if it exists
		this.mixer = new THREE.AnimationMixer(gltf.scene);
		if (gltf.animations.length) {
			this.mixer.clipAction(gltf.animations[0]).play();
		}

		// Return it
		return this.scene;
	}

	update(dt) {
		// Update the position of the model if necessary
		if (this.scene.position.equals(this.targetPosition)) {
			this.isMoving = false;
		} else {
			this.isMoving = true;
			const direction = this.targetPosition.clone().sub(this.scene.position);
			let magnitude = direction.length();
			const maxMovement = CHARACTER_SPEED * dt;
			if (magnitude > maxMovement) {
				direction.normalize();
				direction.multiplyScalar(maxMovement);
				this.scene.position.add(direction);
			} else {
				this.scene.position.copy(this.targetPosition);
			}
		}

		// Update the model animations
		if (this.mixer !== undefined) {
			this.mixer.update(dt);
		}
	}

	execute (command, level) {
		this.isMoving = true;
		if (command === COMMANDS.moveLeft) {
			this.moveLeft(level);
		} else if (command === COMMANDS.moveRight) {
			this.moveRight(level);
		} else if (command === COMMANDS.moveUp) {
			this.moveUp(level);
		} else if (command === COMMANDS.moveDown) {
			this.moveDown(level);
		} else if (command === COMMANDS.jumpLeft) {
			this.jumpLeft(level);
		} else if (command === COMMANDS.jumpRight) {
			this.jumpRight(level);
		} else {
			throw Error("Invalid command given: `" + command + "`");
		}
		return this.targetPosition;
	}

	moveLeft (level) {
		const target = this.scene.position.clone().add(new THREE.Vector3(-1, 0, 0));
		if (level.blocked(target)) {
			this.targetPosition = this.scene.position.clone();
			return;
		}
		this.targetPosition = target;
	}

	moveRight (level) {
		const target = this.scene.position.clone().add(new THREE.Vector3(1, 0, 0));
		if (level.blocked(target)) {
			this.targetPosition = this.scene.position.clone();
			return;
		}
		this.targetPosition = target;
	}

	moveUp (level) {
		const target = this.scene.position.clone().add(new THREE.Vector3(0, 1, 0));
		if (level.blocked(target)) {
			this.targetPosition = this.scene.position.clone();
			return;
		}
		this.targetPosition = target;
	}

	moveDown (level) {
		const target = this.scene.position.clone().add(new THREE.Vector3(0, -1, 0));
		if (level.blocked(target)) {
			this.targetPosition = this.scene.position.clone();
			return;
		}
		this.targetPosition = target;
	}

	jumpLeft (level) {

	}

	jumpRight (level) {

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
