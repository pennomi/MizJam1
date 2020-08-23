import * as THREE from "../thirdparty/three.module.js";
import {sRGBEncoding} from "../thirdparty/three.module.js";


const TILE_POSITIONING = {
	out: 0,
	in: -1,
}


// Load tilemap
const TILEMAP_DIMENSIONS = [48, 22]
const TILEMAP = new THREE.TextureLoader().load("../data/models/tiles/tilesetColor.png")
TILEMAP.encoding = sRGBEncoding;
TILEMAP.minFilter = THREE.NearestFilter;
TILEMAP.magFilter = THREE.NearestFilter;
const TILEMAP_BUMP = new THREE.TextureLoader().load("../data/models/tiles/tileset.png")
TILEMAP_BUMP.encoding = sRGBEncoding;
TILEMAP_BUMP.minFilter = THREE.NearestFilter;
TILEMAP_BUMP.magFilter = THREE.NearestFilter;

const TILE_MATERIAL = new THREE.MeshStandardMaterial({
	map: TILEMAP,
	bumpMap: TILEMAP,
	transparent: true,
});


export class Tile {
	constructor(name, textureCoordinate, options) {
		this.name = name;

		this.blocking = options.blocking || false;
		this.climbable = options.climbable || false;
		this.deadly = options.deadly || false;
		this.positioning = options.blocking ? TILE_POSITIONING.out : TILE_POSITIONING.in;
		if (options.position !== undefined) {
			this.positioning = options.position;
		}

		this.textureCoordinate = textureCoordinate;
	}

	createMesh(x, y) {
		// Create the geometry  TODO: Should only be once per tile type. Or, tiles should be instanced
		const geometry = new THREE.BoxGeometry(1, 1, 1);
		const cube = new THREE.Mesh(geometry, TILE_MATERIAL);

		// Adjust the UV map (The +- 0.001 helps avoid texture sampling errors with the adjoining tile)
		const unitX = 1/TILEMAP_DIMENSIONS[0];
		let startX = this.textureCoordinate[0] * unitX + 0.001;
		let endX = this.textureCoordinate[0] * unitX + unitX - 0.001;
		const unitY = 1/TILEMAP_DIMENSIONS[1];
		let startY = this.textureCoordinate[1] * unitY + 0.001;
		let endY = this.textureCoordinate[1] * unitY + unitY - 0.001;
		for (let tri of cube.geometry.faceVertexUvs[0]) {
			for (let v of tri) {
				v.x = v.x === 0 ? startX : endX;
				v.y = v.y === 0 ? startY : endY;
			}
		}
		cube.geometry.uvsNeedUpdate = true;

		// Make it a hair over 1 meter to avoid lines?
		// cube.scale.set(1.01, 1.01, 1.01);

		// Set the scene position
		cube.position.set(x, y, this.positioning);
		return cube;
	}
}


export const TILE_TYPES = {
	0: new Tile("Sky", [0, 21], {}),
	1: new Tile("Ground", [19, 21], {
		blocking: true,
	}),
	2: new Tile("Goal", [29, 9], {}),
	3: new Tile("Ladder", [21, 20], {
		climbable: true,
	}),
	4: new Tile("Water", [7, 21], {
		deadly: true,
		position: TILE_POSITIONING.out,
	}),
	5: new Tile("Destructable", [23, 18], {
		blocking: true,
	}),
}
