import * as THREE from "../thirdparty/three.module.js";
import {jerp1, jerp2, lerp, loadGLTF, sleep} from "./utils.js";
import {Vector3} from "../thirdparty/three.module.js";


const COMMANDS = {
	moveLeft: "←",
	moveRight: "→",
	moveUp: "↑",
	moveDown: "↓",
}


export const FACING = {
	right: 1,
	left: -1,
}


const DEFAULT_MOVE_TIME = 0.5;
const CHARACTER_ROTATION_SPEED = Math.PI * 2;


export class Character {
	gltfUrl = null;
	size = 1;

	constructor () {
		this.name = this.constructor.name;
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
		this.scene.add(gltf.scene);
		this.internalScene = gltf.scene;
		this.scene.position.set(x, -y + 0.5, 0);
		this.targetPosition = this.scene.position;
		this.setScale(this.size);

		// Set up the animation mixer to play the first animation in the GLTF if it exists
		this.mixer = new THREE.AnimationMixer(gltf.scene);
		if (gltf.animations.length) {
			this.mixer.clipAction(gltf.animations[0]).play();
		}

		// Return it
		return this.scene;
	}

	setScale(scale) {
		this.internalScene.position.set((scale - 1) * 0.5/scale, 0, 0);
		this.scene.scale.set(scale, scale, scale);
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
		await this.moveGravity(level);
		await this.moveGravity(level);
		await this.moveGravity(level);
		await this.moveGravity(level);
		return moved;
	}

	getSelfSpaces() {
		let spaces = [];
		for (let x = 0; x < this.size; x++) {
			for (let y = 0; y < this.size; y++) {
				const offset = new Vector3(x, y, 0);
				spaces.push(this.scene.position.clone().add(offset));
			}
		}
		return spaces;
	}

	async _move(direction, level, duration=null, interpolator=null) {
		if (duration === null) {
			duration = DEFAULT_MOVE_TIME;
		}
		if (interpolator === null) {
			interpolator = lerp;
		}

		const target = this.scene.position.clone().add(direction);
		this.targetPosition = target;

		// Check if any of our spaces will be blocked
		for (let space of this.getSelfSpaces()) {
			if (level.blocked(space.add(direction), this)) {
				this.targetPosition = this.scene.position;
				return false;
			}
		}

		// Run the interpolation
		let currentTime = 0;
		const startPosition = this.scene.position.clone();
		while (currentTime < duration) {
			currentTime += await this.waitForNextFrame();
			let percentComplete = currentTime / duration;
			let currentPosition = interpolator(startPosition, target, percentComplete);
			this.scene.position.copy(currentPosition);
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
		const directlyAbove = this.scene.position.clone().add(new THREE.Vector3(0, this.size, 0));
		if (level.blocked(directlyAbove, this)) {
			return false;
		}

		// First half of the jump
		await this._move(new THREE.Vector3(this.faceDirection, 1, 0), level, DEFAULT_MOVE_TIME, jerp1);

		// If we landed on a block, don't finish the jump
		const directlyBelow = this.scene.position.clone().add(new THREE.Vector3(0, -1, 0))
		if (level.blocked(directlyBelow)) {
			return false;
		}

		// Second half of the jump
		await this._move(new THREE.Vector3(this.faceDirection, -1, 0), level, DEFAULT_MOVE_TIME, jerp2);
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
			if (level.isClimbable(gravityTarget)) {
				break;
			}
			if (level.isCharacter(gravityTarget)) {
				gravityTarget = gravityTarget.add(new THREE.Vector3(0, -1, 0));
				if (level.isCharacter(gravityTarget)) {
					gravityTarget = gravityTarget.add(new THREE.Vector3(0, -1, 0));
					if (level.isCharacter(gravityTarget)) {
						gravityTarget = gravityTarget.add(new THREE.Vector3(0, -1, 0));
					}
				}
			}

			let moved = await this._move(new THREE.Vector3(0, -1, 0), level, 0.25);
			if (!moved) {
				break;
			}
			await sleep(0.01); // things get locked if this isn't here for some reason
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
		while (this.internalScene.rotation.y !== targetRotation) {
			let dt = await this.waitForNextFrame();
			let localSpeed = speed * dt;
			const distance = targetRotation - this.internalScene.rotation.y;
			if (Math.abs(localSpeed) < Math.abs(distance)) {
				this.internalScene.rotation.set(0, this.internalScene.rotation.y + localSpeed, 0);
			} else {
				this.internalScene.rotation.set(0, targetRotation, 0);
			}
		}
	}
}
