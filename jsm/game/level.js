import * as THREE from "../thirdparty/three.module.js";
import {CHARACTER_TYPES} from "./characters.js";
import {sleep} from "./utils.js";
import {TILE_TYPES} from "./tile.js";


const GAMEMODE = {
	levelIntroduction: 0,
	typingInstructions: 1,
	executingInstructions: 2,
	levelFailure: 3,
	levelSuccess: 4,
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
		console.log("Loading level: " + url);

		// Load in tile data
		let response = await fetch(url);
		let data = await response.json();
		this.nextLevelId = data.nextLevel;
		this.name = data.name;
		this.startText = data.startText;
		this.completeText = data.completeText;

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
			if (characterData.name !== undefined) {
				character.name = characterData.name;
			}
			this._characters.push(character);
			let charScene = await character.load(...characterData.position);
			this.scene.add(charScene);
		}

		return this.scene;
	}

	setUpCamera(camera, offset = 0.8) {
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

	getTileFromCharacterPosition(position) {
		const x = Math.round(position.x);
		const y = Math.round(-position.y - 0.5);
		if (x < 0 || x >= this._tiles[0].length) {
			return null;
		}
		if (y < 0 || y >= this._tiles.length) {
			return null;
		}
		return this._tiles[y][x];
	}

	blocked(position, thisCharacter) {
		// TODO: Is there a character in the way?
		if (this.isCharacter(position, thisCharacter)) {
			return true;
		}

		// Is there a tile in the way?
		let tile = this.getTileFromCharacterPosition(position);
		if (tile === null || tile === undefined) {
			return true;
		}
		return tile.blocking;
	}

	isClimbable(position) {
		let tile = this.getTileFromCharacterPosition(position);
		if (tile === null) {
			return false;
		}
		return tile.climbable;
	}

	// Sort the characters so they execute in an order where they don't interact incorrectly
	sortCharacters(next) {
		this._characters = this._characters.sort((a, b)=>{return a.getSortValue(next) - b.getSortValue(next);});
	}

	checkFailureStates() {
		for (let c of this._characters) {
			let tile = this.getTileFromCharacterPosition(c.scene.position);
			if (tile === null) {
				return c.name + " fell into the void.";
			} else if (tile.deadly) {
				return c.name + " " + tile.deathMessage + ".";
			}
		}

		return "";  // Empty string means all is well
	}

	checkWinState() {
		for (let c of this._characters) {
			let tile = this.getTileFromCharacterPosition(c.scene.position);
			if (tile.name === "Goal") {
				return true;
			}
		}
	}

	isCharacter(position, ignoreCharacter) {
		for (let c of this._characters) {
			if (c === ignoreCharacter) {
				continue;
			}

			let movementDirection = c.targetPosition.clone().sub(c.scene.position);
			for (let space of c.getSelfSpaces()) {
				if (space.add(movementDirection).equals(position)) {
					return true;
				}
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
		let proceed = false;
		while (this.running) {
			await this.handleIntroductionMode(ui);
			await this.handleTypingMode(ui);
			let succeeded = await this.handleExecutionMode(ui);
			if (succeeded) {
				proceed = await this.handleSuccess(ui);
			} else {
				await this.handleFailure(ui, this.failureMessage);
			}
		}
		return proceed;
	}

	async handleIntroductionMode(ui) {
		await ui.showBillboard(this.name, this.startText);
		await sleep(3.0);
		await ui.hideBillboard();
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

			let failureMessage = this.checkFailureStates();
			if (failureMessage !== "") {
				this.failureMessage = failureMessage;
				return false;
			}

			if (this.checkWinState()) {
				return true;
			}
		}

		// There are no more instructions, therefore we've failed.
		this.failureMessage = "Your disciples ran out of commandments. Aimless, they fall away."
		return false;
	}

	async handleFailure(ui, failureMessage) {
		await sleep(0.75);
		await ui.showBillboard("Failure", failureMessage);
		await sleep(5.0);
		await ui.hideBillboard();
		this.running = false; // set this after they decide to retry
	}

	async handleSuccess(ui) {
		await sleep(0.75);
		await ui.showBillboard("Success", this.completeText);
		await sleep(5.0);
		await ui.hideBillboard();
		this.running = false;
		return true; // return false if they opt to retry the level?
	}
}