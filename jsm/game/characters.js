import * as THREE from "../thirdparty/three.module.js";
import {loadGLTF, sleep} from "./utils.js";


const COMMANDS = {
	moveLeft: "←",
	moveRight: "→",
	moveUp: "↑",
	moveDown: "↓",
}


const FACING = {
	right: 1,
	left: -1,
}


const CHARACTER_SPEED = 2;
const CHARACTER_ROTATION_SPEED = Math.PI * 2;


export class Character {
	gltfUrl = null;

	constructor () {
		this.scene = new THREE.Scene();
		this.mixer = undefined;
		this.targetPosition = new THREE.Vector3();
		this.faceDirection = FACING.right;
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
		let moved = false;
		if (command === COMMANDS.moveLeft) {
			moved = await this.moveLeft(level);
		} else if (command === COMMANDS.moveRight) {
			moved = await this.moveRight(level);
		} else if (command === COMMANDS.moveUp) {
			moved = await this.moveUp(level);
		} else if (command === COMMANDS.moveDown) {
			moved = await this.moveDown(level);
		} else if (command === COMMANDS.jumpLeft) {
			moved = await this.jumpLeft(level);
		} else if (command === COMMANDS.jumpRight) {
			moved = await this.jumpRight(level);
		} else if (command === COMMANDS.moveGravity) {
			moved = await this.moveGravity(level);
		} else {
			throw Error("Invalid command given: `" + command + "`");
		}
		await this.moveGravity(level);
		return moved;
	}

	async _move(direction, level, speed=null) {
		if (speed === null) {
			speed = CHARACTER_SPEED;
		}

		const target = this.scene.position.clone().add(direction);
		this.targetPosition = target;
		if (level.blocked(target, this)) {
			this.targetPosition = this.scene.position;
			return false;
		}

		while (!this.scene.position.equals(target)) {
			let dt = await this.waitForNextFrame();
			const direction = target.clone().sub(this.scene.position);
			let magnitude = direction.length();
			const maxMovement = speed * dt;
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
		await this.faceLeft();
		return await this._move(new THREE.Vector3(-1, 0, 0), level);
	}

	async moveRight (level) {
		await this.faceRight();
		return await this._move(new THREE.Vector3(1, 0, 0), level);
	}

	async moveUp (level) {
		// If we are on a ladder, climb up.
		if (level.isClimbable(this.scene.position)) {
			return await this._move(new THREE.Vector3(0, 1, 0), level);
		}

		// Otherwise, jump the direction we are facing
		return await this.jump(level);
	}

	async moveDown (level) {
		return await this._move(new THREE.Vector3(0, -1, 0), level);
	}

	async jump (level) {
		// Don't jump if blocked directly above
		const directlyAbove = this.scene.position.clone().add(new THREE.Vector3(0, 1, 0))
		if (level.blocked(directlyAbove)) {
			return false;
		}

		// First half of the jump
		await this._move(new THREE.Vector3(this.faceDirection, 1, 0), level);

		// If we landed on a block, don't finish the jump
		const directlyBelow = this.scene.position.clone().add(new THREE.Vector3(0, -1, 0))
		if (level.blocked(directlyBelow)) {
			return false;
		}

		// Second half of the jump
		await this._move(new THREE.Vector3(this.faceDirection, -1, 0), level);
	}

	async moveGravity (level) {
		// If currently on or directly above a ladder square, don't fall
		if (level.isClimbable(this.scene.position.clone())) {
			return false;
		}
		if (level.isClimbable(this.scene.position.clone().add(new THREE.Vector3(0, -1, 0)))) {
			return false;
		}

		// Try falling due to gravity
		while (true) {
			let gravityTarget = this.scene.position.clone().add(new THREE.Vector3(0, -1, 0));
			if (level.blocked(gravityTarget) || level.isClimbable(gravityTarget)) {
				break;
			}
			await this._move(new THREE.Vector3(0, -1, 0), level, 4.0);
		}
	}

	async faceLeft() {
		this.faceDirection = FACING.left;
		await this._waitForRotation(Math.PI, CHARACTER_ROTATION_SPEED)
	}

	async faceRight() {
		this.faceDirection = FACING.right;
		await this._waitForRotation(0, -CHARACTER_ROTATION_SPEED);
	}

	async _waitForRotation(targetRotation, speed) {
		while (this.scene.rotation.y !== targetRotation) {
			let dt = await this.waitForNextFrame();
			let localSpeed = speed * dt;
			const distance = targetRotation - this.scene.rotation.y;
			if (Math.abs(localSpeed) < Math.abs(distance)) {
				this.scene.rotation.set(0, this.scene.rotation.y + localSpeed, 0);
			} else {
				this.scene.rotation.set(0, targetRotation, 0);
			}
		}
	}
}

class Prophet extends Character {
	gltfUrl = "../data/models/characters/prophet.glb";
}

class Pride extends Character {
	gltfUrl = "../data/models/characters/pride.glb";

	constructor() {
		super();
		this.faceDirection = FACING.left;
	}

	async moveLeft (level) {
		await this.faceRight();
		return await this._move(new THREE.Vector3(1, 0, 0), level);
	}

	async moveRight (level) {
		await this.faceLeft();
		return await this._move(new THREE.Vector3(-1, 0, 0), level);
	}

	async moveUp (level) {
		return await this._move(new THREE.Vector3(0, -1, 0), level);
	}

	async moveDown (level) {
		// If we are on a ladder, climb up.
		if (level.isClimbable(this.scene.position)) {
			return await this._move(new THREE.Vector3(0, 1, 0), level);
		}

		// Otherwise, jump the direction we are facing
		return await this.jump(level);
	}
}


export const CHARACTER_TYPES = {
	prophet: Prophet,
	pride: Pride
};
