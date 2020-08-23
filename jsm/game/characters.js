import * as THREE from "../thirdparty/three.module.js";
import {Character, FACING} from "./basecharacter.js";


class Prophet extends Character {
	gltfUrl = "../data/models/characters/prophet.glb";
}


class Pride extends Character {
	gltfUrl = "../data/models/characters/pride.glb";

	async load(x, y) {
			let scene = await super.load(x, y);
			this.faceDirection = FACING.left;
			// this.scene.rotation.set(0, Math.PI, 0);
			return scene;
	}

	async moveLeft (level) {
		await this.faceRight();
		return await this._move(new THREE.Vector3(1, 0, 0), level);
	}

	async moveRight (level) {
		await this.faceLeft();
		return await this._move(new THREE.Vector3(-1, 0, 0), level);
	}
}


class Gluttony extends Character {
	gltfUrl = "../data/models/characters/gluttony.glb";
	size = 2;
}


export const CHARACTER_TYPES = {
	prophet: Prophet,
	pride: Pride,
	gluttony: Gluttony,
};
