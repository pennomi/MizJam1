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


const TILE_POSITIONING = {
	out: 0,
	in: -1,
}


class Tile {
	constructor(name, options) {
		this.name = name;

		this.blocking = options.blocking || false;
		this.climbable = options.climbable || false;
		this.deadly = options.deadly || false;
		this.positioning = options.blocking ? TILE_POSITIONING.out : TILE_POSITIONING.in;
		if (options.position !== undefined) {
			this.positioning = options.position;
		}

		this.color = options.color || COLORS.black;
	}

	createMesh(x, y) {
		const material = new THREE.MeshStandardMaterial({color: this.color});
		const cube = new THREE.Mesh(TILE_GEOMETRY, material);
		cube.position.set(x, y, this.positioning);
		return cube;
	}
}


const TILE_TYPES = {
	// TODO: Gamma correct these colors
	0: new Tile("Air", {
		color: COLORS.darkgray,
	}),
	1: new Tile("Ground", {
		blocking: true,
		color: COLORS.black,
	}),
	2: new Tile("Goal", {
		color: COLORS.darkpink,
	}),
	3: new Tile("Ladder", {
		climbable: true,
		color: COLORS.darkbrown,
	}),
	4: new Tile("Water", {
		deadly: true,
		position: TILE_POSITIONING.out,
		color: COLORS.mediumblue,
	}),
	5: new Tile("Destructable", {
		blocking: true,
		color: COLORS.yellow,
	}),
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
		if (this.isCharacter(position, thisCharacter)) {
			return true;
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

	isCharacter(position, ignoreCharacter) {
		for (let c of this._characters) {
			if (c === ignoreCharacter) {
				continue;
			}
			if (c.targetPosition.equals(position)) {
				return true;
			}
		}
	}

	update(dt) {
		// Make the characters do their thing
		for (const char of this._characters) {
			char.update(dt, this);
		}
	}

	async runLevelRoutine(ui) {
		this.running = true;
		while (this.running) {
			await this.handleIntroductionMode();
			await this.handleTypingMode(ui);
			let succeeded = await this.handleExecutionMode(ui);
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

	async handleTypingMode(ui) {
		ui.commands = [];
		ui.write();
		ui.mode = ui.INPUT_MODES.inputting;
		while (ui.mode !== ui.INPUT_MODES.replaying) {
			await sleep(1.0);
		}
		this.instructions = ui.commands.slice();
	}

	async handleExecutionMode(ui) {
		let instructionIndex = 0;
		for (const next of this.instructions) {
			ui.commands[instructionIndex++] = ui.mapExecutedCommand(next);
			ui.write();
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