import * as THREE from "../thirdparty/three.module.js";
import {COLORS} from "./colors.js";
import {CHARACTER_TYPES} from "./characters.js";


const TILE_GEOMETRY = new THREE.BoxGeometry( 1, 1, 1 );


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
	2: new Tile("Pink", true, COLORS.darkpink),
	3: new Tile("Green", true, COLORS.darkgreen),
	4: new Tile("Blue", true, COLORS.darkblue),
	5: new Tile("Yellow", true, COLORS.yellow),
}


export class Level {
	constructor() {
		this._tiles = [];
		this._characters = [];
		this.scene = new THREE.Scene();
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

	getIdealCameraPosition() {
		let position = new THREE.Vector3();
		for (const c of this._characters) {
			position.add(c.scene.position);
		}
		if (this._characters.length) {
			position.divideScalar(this._characters.length);
		}
		position.z = 10;
		return position;
	}

	update(dt) {
		for (const char of this._characters) {
			char.update(dt);
		}
	}
}