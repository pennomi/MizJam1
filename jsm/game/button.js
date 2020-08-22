import * as THREE from "../thirdparty/three.module.js";
import {loadGLTF} from "./utils.js";
import {TypeableTexture} from "./typeableTexture.js";


export class UIButton {
	constructor(position, text, activeText, keyCodes, onclick) {
		this.scene = new THREE.Scene();
		this.initialPosition = position;
		this.texture = new TypeableTexture("../data/models/ui/button.png", 16, 16);
		this.character = text;
		this.activeCharacter = activeText;
		this.keyCodes = keyCodes;
		this.onclick = onclick;
	}

	click(ev) {
		this.texture.write(this.activeCharacter);
		setTimeout(() => {
			this.texture.write(this.character);
		}, 200);
		this.onclick(ev);
	}

	async load() {
		const gltf = await loadGLTF("../data/models/ui/button.glb", this.texture);
		this.scene = gltf.scene;
		this.scene.position.set(this.initialPosition[0], this.initialPosition[1], 0);
		this.scene.userData.button = this;
		this.texture.write(this.character);
		return this.scene;
	}
}