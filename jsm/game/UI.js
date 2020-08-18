import * as THREE from "../thirdparty/three.module.js";
import {TypeableTexture} from "./typeableTexture.js";
import {loadGLTF} from "./utils.js";


const INPUT_MODES = {
	locked: 0,
	inputting: 1,
	replaying: 2,
}


export class UI {
	constructor() {
		this.scene = new THREE.Scene();
		this.scene.rotation.set(-Math.PI/16, -Math.PI/8, 0);
		this.tablet = null;
		this.camera = new THREE.OrthographicCamera();  // TODO: This renders the buttons or something?
		this.commands = [];

		this.texture = new TypeableTexture("../data/models/ui/tablet.png");

		// Check the input modes
		this.mode = INPUT_MODES.inputting;
	}

	async load () {
		// Load the model
		const gltf = await loadGLTF("../data/models/ui/tablet.glb", this.texture);
		this.tablet = gltf.scene;
		this.scene.add(this.tablet);
		return this.scene;
	}

	write(string) {
		this.texture.write(string);
	}

	handleClickEvent(event) {
		console.log("Click event happened");
	}

}