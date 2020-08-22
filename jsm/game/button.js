import * as THREE from "../thirdparty/three.module.js";
import {loadGLTF} from "./utils.js";
import {TypeableTexture} from "./typeableTexture.js";


export class UIButton {
	constructor(text, onclick) {
		this.scene = new THREE.Scene();
		this.texture = new TypeableTexture("../data/models/ui/button.png", 16, 16);
		this.character = text;
		this.onclick = onclick;
	}

	async load() {
		const gltf = await loadGLTF("../data/models/ui/button.glb", this.texture);
		this.scene = gltf.scene;
		this.scene.userData.button = this;
		this.texture.write(this.character);
		return this.scene;
	}
}