import * as THREE from "../thirdparty/three.module.js";
import {TypeableTexture} from "./typeableTexture.js";
import {loadGLTF} from "./utils.js";
import {UIButton} from "./button.js";


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
		this.commands = [];

		this.texture = new TypeableTexture("../data/models/ui/tablet.png", 128, 128);

		// Check the input modes
		this.mode = INPUT_MODES.inputting;

		// Set up the UI Scene and camera
		this.scene = new THREE.Scene();
		this.camera = new THREE.OrthographicCamera(
			0, 10,
			10 * window.innerHeight / window.innerWidth, 0,
			0.01, 1000);
		this.camera.position.set(0, 0, 10);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);

		// Lighting
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.4));

		let dirLight = new THREE.DirectionalLight(0xffffff, 1);
		dirLight.position.set(5, 2, 8);
		this.scene.add(dirLight);
	}

	async load () {
		// Load the model
		const gltf = await loadGLTF("../data/models/ui/tablet.glb", this.texture);
		this.tablet = gltf.scene;
		this.tablet.position.set(9, 1, 0);
		this.tablet.rotation.set(-Math.PI/16, -Math.PI/8, 0);
		this.scene.add(this.tablet);

		this.buttons = [];
		let button = new UIButton("→", ()=>{ console.log("CLICKED!") });
		let buttonScene = await button.load();
		this.scene.add(buttonScene);
	}

	write(string) {
		this.texture.write(string);
	}

	handleClickEvent(event) {
		console.log("Click event happened");
	}

	update() {
		// TODO: ???
	}

	resize(width, height) {
		this.camera.top = 10 * height / width;
		this.camera.updateProjectionMatrix();
	}

	render(renderer) {
		renderer.render(this.scene, this.camera);
	}


}