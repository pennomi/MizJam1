import * as THREE from "../thirdparty/three.module.js";
import {TypeableTexture} from "./typeableTexture.js";
import {loadGLTF} from "./utils.js";
import {UIButton} from "./button.js";

const UI_ORIENTATION = new THREE.Euler(-Math.PI/16, -Math.PI/8, 0);

const INPUT_MODES = {
	locked: 0,
	inputting: 1,
	replaying: 2,
}


export class UI {
	constructor(renderer) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.scene.rotation.set(-Math.PI/16, -Math.PI/8, 0);
		this.tablet = null;
		this.commands = [];

		this.texture = new TypeableTexture("../data/models/ui/tablet.png", 128, 128, 32, 32, 4);

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

		this.raycaster = new THREE.Raycaster();
		this.mouse = new THREE.Vector2();

		// Lighting
		this.scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.4));

		let dirLight = new THREE.DirectionalLight(0xffffff, 1);
		dirLight.position.set(5, 2, 8);
		this.scene.add(dirLight);
		window.addEventListener('click', this.handleClickEvent.bind(this));
	}

	async load () {
		// Load the model
		const gltf = await loadGLTF("../data/models/ui/tablet.glb", this.texture);
		this.tablet = gltf.scene;
		this.tablet.position.set(9, 1, 0);
		this.tablet.rotation.copy(UI_ORIENTATION);
		this.scene.add(this.tablet);

		this.buttons = [
			new UIButton("←", ()=>{ console.log("CLICKED LEFT!") }),
			new UIButton("↑", ()=>{ console.log("CLICKED UP!") }),
			new UIButton("↓", ()=>{ console.log("CLICKED DOWN!") }),
			new UIButton("→", ()=>{ console.log("CLICKED RIGHT!") }),
		];
		for (let button of this.buttons) {
			await button.load();
			button.scene.position.set(3 + this.buttons.indexOf(button), 1, 0);
			button.scene.rotation.copy(UI_ORIENTATION);
			this.scene.add(button.scene);
		}
		// let button = new UIButton("→", ()=>{ console.log("CLICKED!") });
		// await button.load();
		// this.scene.add(button.scene);
	}

	write(string) {
		this.texture.write(string);
	}

	handleClickEvent(event) {
		event.preventDefault();

		this.mouse.x = ( event.clientX / this.renderer.domElement.clientWidth ) * 2 - 1;
		this.mouse.y = - ( event.clientY / this.renderer.domElement.clientHeight ) * 2 + 1;
		this.raycaster.setFromCamera( this.mouse, this.camera );

		let intersects = this.raycaster.intersectObject( this.scene, true );
		let clickedButtons = {};
		for (let intersect of intersects) {
			let button = intersect.object?.parent?.userData?.button;
			if (button) {
				if (!clickedButtons[button.scene.uuid]) {
					button.onclick();
				}
				clickedButtons[button.scene.uuid] = true;
			}
		}
	}

	update() {
		// TODO: ???
	}

	resize(width, height) {
		this.camera.top = 10 * height / width;
		this.camera.updateProjectionMatrix();
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}


}