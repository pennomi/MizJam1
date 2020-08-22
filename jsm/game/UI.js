import * as THREE from "../thirdparty/three.module.js";
import {TypeableTexture} from "./typeableTexture.js";
import {loadGLTF} from "./utils.js";
import {UIButton} from "./button.js";

const UI_ORIENTATION = new THREE.Euler(-Math.PI/16, -Math.PI/8, 0);


export class UI {
	constructor(renderer) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.scene.rotation.set(-Math.PI/16, -Math.PI/8, 0);
		this.tablet = null;
		this.commands = [];

		this.texture = new TypeableTexture("../data/models/ui/tablet.png", 128, 128, 32, 32, 4);

		this.INPUT_MODES = {
			locked: 0,
			inputting: 1,
			replaying: 2,
		};
		// Check the input modes
		this.mode = this.INPUT_MODES.locked;

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

		this.commands = [];
	}

	async load () {
		// Load the model
		const gltf = await loadGLTF("../data/models/ui/tablet.glb", this.texture);
		this.tablet = gltf.scene;
		this.tablet.position.set(9, 1, 0);
		this.tablet.rotation.copy(UI_ORIENTATION);
		this.tablet.userData.button = {
			scene: this.tablet,
			click: () => {this.mode = this.INPUT_MODES.replaying},
		};
		this.scene.add(this.tablet);

		this.buttons = [
			new UIButton("←", "⇦", ()=>{ this.appendCommand("←") }),
			new UIButton("↑", "⇧", ()=>{ this.appendCommand("↑") }),
			new UIButton("↓", "⇩", ()=>{ this.appendCommand("↓") }),
			new UIButton("→", "⇨", ()=>{ this.appendCommand("→") }),
			new UIButton("×", "×", this.deleteCommand.bind(this)),
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

	appendCommand(char) {
		if (this.commands.length >= 20) {
			return;
		}
		this.commands.push(char);
		this.write();
	}

	deleteCommand() {
		this.commands.pop();
		this.write();
	}

	mapExecutedCommand(char) {
		if (char === "←") {
			return "⇦";
		}
		if (char === "→") {
			return "⇨";
		}
		if (char === "↑") {
			return "⇧";
		}
		if (char === "↓") {
			return "⇩";
		}
		return " ";
	}

	write(string) {
		if (string === undefined) {
			string = this.commands.join("");
		}
		this.texture.write(string);
	}

	handleClickEvent(event) {
		event.preventDefault();
		if (this.mode !== this.INPUT_MODES.inputting) {
			return;
		}

		this.mouse.x = ( event.clientX / this.renderer.domElement.clientWidth ) * 2 - 1;
		this.mouse.y = - ( event.clientY / this.renderer.domElement.clientHeight ) * 2 + 1;
		this.raycaster.setFromCamera( this.mouse, this.camera );

		let intersects = this.raycaster.intersectObject( this.scene, true );
		let clickedButtons = {};
		for (let intersect of intersects) {
			let button = intersect.object?.parent?.userData?.button;
			if (button) {
				if (!clickedButtons[button.scene.uuid]) {
					button.click();
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