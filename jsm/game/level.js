import * as THREE from "../thirdparty/three.module.js";
import {COLORS} from "./colors.js";
import {CHARACTER_TYPES} from "./characters.js";


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
	3: new Tile("Green", true, COLORS.darkgreen),
	4: new Tile("Blue", true, COLORS.darkblue),
	5: new Tile("Yellow", true, COLORS.yellow),
}


export class Level {
	constructor() {
		this._tiles = [];
		this._characters = [];
		this.scene = new THREE.Scene();
		this.gameMode = GAMEMODE.levelIntroduction;
		this.timeSinceGameModeChange = 0;
		this.instructions = [];
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

	blocked(position) {
		// Is there a character in the way?
		for (let c of this._characters) {
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

	changeMode(newMode) {
		console.log("Changing to gameMode: " + newMode);
		this.gameMode = newMode;
		this.timeSinceGameModeChange = 0;
	}

	update(dt) {
		this.timeSinceGameModeChange += dt;

		if (this.gameMode === GAMEMODE.levelIntroduction) {
			this.handleIntroductionMode();
		} else if (this.gameMode === GAMEMODE.typingInstructions) {
			this.handleTypingMode();
		} else if (this.gameMode === GAMEMODE.executingInstructions) {
			this.handleExecutionMode();
		} else if (this.gameMode === GAMEMODE.levelFailure) {
			this.handleFailure();
		} else if (this.gameMode === GAMEMODE.levelSuccess) {
			this.handleSuccess();
		}

		// Make the characters do their thing
		for (const char of this._characters) {
			char.update(dt, this);
		}
	}

	handleIntroductionMode() {
		// console.log("We're showing a beautiful cutscene here, probably.");
		if (this.timeSinceGameModeChange > 1.0) {
			this.changeMode(GAMEMODE.typingInstructions);
		}
	}

	handleTypingMode() {
		if (this.timeSinceGameModeChange > 1.0) {
			this.instructions = "→→←←↑↓".split("");
			this.changeMode(GAMEMODE.executingInstructions);
		}
	}

	handleExecutionMode() {
		// Check for failure condition and win condition

		// If any character is moving, cancel out immediately
		for (const char of this._characters) {
			if (char.isMoving) {
				return;
			}
		}

		// Otherwise, tell every character to execute the next instruction
		const next = this.instructions.shift();

		// If there's not another instruction, you failed.
		if (next === undefined) {
			// There are no more instructions, therefore we've failed.
			console.log("Ran out of instructions; level failed.");
			this.changeMode(GAMEMODE.levelFailure);
			return;
		}

		console.log("Executing instruction: " + next);
		this.sortCharacters(next);
		for (const char of this._characters) {
			char.execute(next, this);
		}
	}

	// Sort the characters so they execute in an order where they don't interact incorrectly
	sortCharacters(next) {
		this._characters = this._characters.sort((a, b)=>{return a.getSortValue(next) - b.getSortValue(next);});
	}

	handleFailure() {
		console.log("You lose the level apparently");
		if (this.timeSinceGameModeChange > 1.0) {
			// TODO: Reload the level
			this.changeMode(GAMEMODE.levelIntroduction);
		}
	}

	handleSuccess() {
		console.log("I guess you win or something");
		if (this.timeSinceGameModeChange > 1.0) {
			console.log("I really should send you to the next level");
		}
	}
}