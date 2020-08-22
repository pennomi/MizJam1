import * as THREE from "../thirdparty/three.module.js";
import {loadGLTF, sleep} from "./utils.js";


const COMMANDS = {
	moveLeft: "←",
	moveRight: "→",
	moveUp: "↑",
	moveDown: "↓",
	jumpLeft: "⇧",
	jumpRight: "⇧",
	moveGravity: ".",
}


const CHARACTER_SPEED = 2;


export class Character {
	gltfUrl = null;

	constructor () {
		this.scene = new THREE.Scene();
		this.mixer = undefined;
		this.targetPosition = new THREE.Vector3();
	}

	async load (x, y) {
		if (this.gltfUrl === null) {
			throw Error("Set the GLTF url for this Character!");
		}

		const gltf = await loadGLTF(this.gltfUrl);
		this.scene = gltf.scene;
		this.scene.position.set(x, -y + 0.5, 0);
		this.targetPosition = this.scene.position;

		// Set up the animation mixer to play the first animation in the GLTF if it exists
		this.mixer = new THREE.AnimationMixer(gltf.scene);
		if (gltf.animations.length) {
			this.mixer.clipAction(gltf.animations[0]).play();
		}

		// Return it
		return this.scene;
	}

	update(dt) {
		this.dt = dt;

		// Update the model animations
		if (this.mixer !== undefined) {
			this.mixer.update(dt);
		}
	}

	async waitForNextFrame() {
		// Wait for there to be a dt
		while (this.dt === 0) {
			await sleep(0.01);
		}

		// Then reset it and return the value
		let dt = this.dt;
		this.dt = 0;
		return dt;
	}

	getSortValue(command) {
		if (command === COMMANDS.moveLeft) {
			return this.scene.position.x;
		} else if (command === COMMANDS.moveRight) {
			return -this.scene.position.x;
		} else if (command === COMMANDS.moveDown) {
			return this.scene.position.y;
		} else if (command === COMMANDS.moveUp) {
			return -this.scene.position.y;

		// For jumps, always handle the highest characters first? TODO: Check this
		} else if (command === COMMANDS.jumpLeft) {
			return this.scene.position.y;
		} else if (command === COMMANDS.jumpRight) {
			return this.scene.position.y;

		// Handle the gravity sorter
		} else if (command === COMMANDS.moveGravity) {
			return this.scene.position.y;
		}
	}

	async execute (command, level) {
		if (command === COMMANDS.moveLeft) {
			return await this.moveLeft(level);
		} else if (command === COMMANDS.moveRight) {
			return await this.moveRight(level);
		} else if (command === COMMANDS.moveUp) {
			return await this.moveUp(level);
		} else if (command === COMMANDS.moveDown) {
			return await this.moveDown(level);
		} else if (command === COMMANDS.jumpLeft) {
			return await this.jumpLeft(level);
		} else if (command === COMMANDS.jumpRight) {
			return await this.jumpRight(level);
		} else if (command === COMMANDS.moveGravity) {
			return await this.moveGravity(level);
		} else {
			throw Error("Invalid command given: `" + command + "`");
		}
	}

	async _move(direction, level) {
		const target = this.scene.position.clone().add(direction);
		this.targetPosition = target;
		if (level.blocked(target, this)) {
			this.targetPosition = this.scene.position;
			return false;
		}

		console.log("Trying to move");


		while (!this.scene.position.equals(target)) {
			console.log("Trying to move");
			let dt = await this.waitForNextFrame();
			const direction = target.clone().sub(this.scene.position);
			let magnitude = direction.length();
			const maxMovement = CHARACTER_SPEED * dt;
			if (magnitude > maxMovement) {
				direction.normalize();
				direction.multiplyScalar(maxMovement);
				this.scene.position.add(direction);
			} else {
				this.scene.position.copy(target);
			}
		}

		// Tell the output that we did move
		return true;
	}

	async moveLeft (level) {
		return await this._move(new THREE.Vector3(-1, 0, 0), level);
	}

	async moveRight (level) {
		return await this._move(new THREE.Vector3(1, 0, 0), level);
	}

	async moveUp (level) {
		return await this._move(new THREE.Vector3(0, 1, 0), level);
	}

	async moveDown (level) {
		return await this._move(new THREE.Vector3(0, -1, 0), level);
	}

	async jumpLeft (level) {
		return false;
	}

	async jumpRight (level) {
		return false;
	}

	async moveGravity (level) {
		// If currently on a ladder square, don't fall
		if (level.isClimbable(this.scene.position.clone())) {
			return false;
		}
		return await this._move(new THREE.Vector3(0, -1, 0), level);
	}
}

class Prophet extends Character {
	gltfUrl = "../data/models/characters/prophet.glb";
}

class Pride extends Character {
	gltfUrl = "../data/models/characters/pride.glb";

	async moveLeft (level) {
		return await this._move(new THREE.Vector3(1, 0, 0), level);
	}

	async moveRight (level) {
		return await this._move(new THREE.Vector3(-1, 0, 0), level);
	}

	async moveUp (level) {
		return await this._move(new THREE.Vector3(0, -1, 0), level);
	}

	async moveDown (level) {
		return await this._move(new THREE.Vector3(0, 1, 0), level);
	}
}


export const CHARACTER_TYPES = {
	prophet: Prophet,
	pride: Pride
};
