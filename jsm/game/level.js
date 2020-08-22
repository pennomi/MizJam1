import * as THREE from "../thirdparty/three.module.js";
import {COLORS} from "./colors.js";
import {CHARACTER_TYPES} from "./characters.js";
import {sleep} from "./utils.js";


const TILE_GEOMETRY = new THREE.BoxGeometry( 1, 1, 1 );


const GAMEMODE = {
	levelIntroduction: 0,
	typingInstructions: 1,
	executingInstructions: 2,
	levelFailure: 3,
	levelSuccess: 4,
}


class Tile {
	constructor(name, blocking, color) {
		this.name = name;
		this.blocking = blocking;
		this.color = color;
	}

	createMesh(x, y) {
		const material = new THREE.MeshStandardMaterial({color: this.color});
		const cube = new THREE.Mesh(TILE_GEOMETRY, material);
		cube.position.set(x, y, this.blocking ? 0 : -1);
		return cube;
	}
}


const TILE_TYPES = {
	// TODO: Gamma correct these colors
	0: new Tile("Air", false, COLORS.darkgray),
	1: new Tile("Ground", true, COLORS.black),
	2: new Tile("Goal", false, COLORS.darkpink),
	3: new Tile("Ladder", false, COLORS.darkbrown),
	4: new Tile("Blue", true, COLORS.darkblue),
	5: new Tile("Yellow", true, COLORS.yellow),
}


export class Level {
	constructor() {
		this._tiles = [];
		this._characters = [];
		this.scene = new THREE.Scene();
		this.gameMode = GAMEMODE.levelIntroduction;
		this.instructions = [];
		this.running = true;
	}

	async load(url) {
		console.log("Loading level: "+ url);

		// Load in tile data
		let response = await fetch(url);
		let data = await response.json();

		this.scene.name = data.name;

		let i = 0;
		for (let row of data.tiles.split("\n")) {
			let rowData = [];
			let j = 0;
			this._tiles.push(rowData)
			for (let col of row) {
				const tile = TILE_TYPES[col];
				this.scene.add(tile.createMesh(j, -i));
				rowData.push(tile);
				j += 1;
			}
			i += 1;
		}

		// Load in entity data
		for (let characterData of data.characters) {
			let character = new CHARACTER_TYPES[characterData.type]();
			this._characters.push(character);
			let charScene = await character.load(...characterData.position);
			this.scene.add(charScene);
		}

		return this.scene;
	}

	setUpCamera(camera, offset = 1.0) {
		const box = new THREE.BoxHelper(this.scene);
		box.geometry.computeBoundingSphere();
		const sphere = box.geometry.boundingSphere;
		const center = box.geometry.boundingSphere.center;
		// Diagram: https://aws1.discourse-cdn.com/standard17/uploads/threejs/original/1X/38225043b6bc3df33ebc5aa8a5e11ed73ab9efc3.png
		const fov = camera.fov * (Math.PI / 180);  // Convert to radians
		let cameraZ = sphere.radius / Math.tan(fov / 2);
		camera.position.copy(center);
		camera.position.z += cameraZ * offset;  // Multiply offset to give padding
		camera.lookAt(center);
		camera.updateProjectionMatrix();
		camera.near = cameraZ / 100;
		camera.far = cameraZ * 100;
	}

	blocked(position, thisCharacter) {
		// TODO: Is there a character in the way?
		for (let c of this._characters) {
			if (c === thisCharacter) {
				continue;
			}
			if (c.targetPosition.equals(position)) {
				return true;
			}
		}

		// Is there a tile in the way?
		const x = Math.round(position.x);
		const y = Math.round(-position.y - 0.5);
		if (x < 0 || x >= this._tiles[0].length) {
			return true;
		}
		if (y < 0 || y >= this._tiles.length) {
			return true;
		}
		let tile = this._tiles[y][x];
		return tile.blocking;
	}

	isClimbable(position) {
		const x = Math.round(position.x);
		const y = Math.round(-position.y - 0.5);
		if (x < 0 || x >= this._tiles[0].length) {
			return false;
		}
		if (y < 0 || y >= this._tiles.length) {
			return false;
		}
		let tile = this._tiles[y][x];
		return tile.name === "Ladder";
	}

	update(dt) {
		// Make the characters do their thing
		for (const char of this._characters) {
			char.update(dt, this);
		}
	}

	async runLevelRoutine() {
		this.running = true;
		while (this.running) {
			await this.handleIntroductionMode();
			await this.handleTypingMode();
			let succeeded = await this.handleExecutionMode();
			if (succeeded) {
				await this.handleSuccess();
			} else {
				await this.handleFailure();
			}
		}
	}

	async handleIntroductionMode() {
		console.log("TODO: Show level introduction");
		await sleep(1.0);
	}

	async handleTypingMode() {
		console.log("TODO: Should be collecting instructions now");
		await sleep(1.0);
		this.instructions = "→→↓→←←↑↓".split("");
	}

	async handleExecutionMode() {
		for (const next of this.instructions) {
			console.log("Executing instruction: " + next);

			// Wait for all the characters to finish their moves
			this.sortCharacters(next);
			let promises = [];
			for (const char of this._characters) {
				promises.push(char.execute(next, this));
			}
			await Promise.all(promises);

			// TODO: Check for failure conditions and win conditions

		}

		// There are no more instructions, therefore we've failed.
		console.log("Ran out of instructions; level failed.");
		return false;
	}

	// Sort the characters so they execute in an order where they don't interact incorrectly
	sortCharacters(next) {
		this._characters = this._characters.sort((a, b)=>{return a.getSortValue(next) - b.getSortValue(next);});
	}

	async handleFailure() {
		console.log("You lose the level apparently");
		await sleep(1.0);
	}

	async handleSuccess() {
		console.log("I guess you win or something");
		await sleep(1.0);
	}
}