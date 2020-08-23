import * as THREE from "../thirdparty/three.module.js";
import {TypeableTexture} from "./typeableTexture.js";
import {lerp, loadGLTF, sleep} from "./utils.js";
import {UIButton} from "./button.js";

const UI_ORIENTATION = new THREE.Euler(-Math.PI/16, -Math.PI/8, 0);


export class UI {
	constructor(renderer) {
		this.renderer = renderer;
		this.scene = new THREE.Scene();
		this.scene.rotation.set(-Math.PI/16, -Math.PI/8, 0);
		this.tablet = null;
		this.commands = [];

		this.tabletTexture = new TypeableTexture("../data/models/ui/tablet.png", 128, 128, 32, 32, 4);
		this.billboardTexture = new TypeableTexture("../data/models/ui/billboard.png", 512, 256, 48, 48, 26);

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
		window.addEventListener('keydown', this.handleKeyEvent.bind(this));

		this.commands = [];
		this.dt = 0;
	}

	async load () {
		// Load the model
		let gltf = await loadGLTF("../data/models/ui/tablet.glb", this.tabletTexture);
		this.tablet = gltf.scene;
		this.tablet.position.set(9, 1, 0);
		this.tablet.rotation.copy(UI_ORIENTATION);
		this.tablet.userData.button = {
			scene: this.tablet,
			click: () => {this.mode = this.INPUT_MODES.replaying},
		};
		this.scene.add(this.tablet);
		this.tabletTexture.write("");

		this.buttons = [
			new UIButton([1, 1], "←", "⇦", [37, 65], ()=>{ this.appendCommand("←") }),
			new UIButton([2, 2], "↑", "⇧", [38, 87], ()=>{ this.appendCommand("↑") }),
			new UIButton([2, 1], "↓", "⇩", [40, 83], ()=>{ this.appendCommand("↓") }),
			new UIButton([3, 1], "→", "⇨", [39, 68], ()=>{ this.appendCommand("→") }),
			new UIButton([4, 1], "×", "×", [8, 46], this.deleteCommand.bind(this)),
		];
		for (let button of this.buttons) {
			await button.load();
			button.scene.rotation.copy(UI_ORIENTATION);
			this.scene.add(button.scene);
		}
		// let button = new UIButton("→", ()=>{ console.log("CLICKED!") });
		// await button.load();
		// this.scene.add(button.scene);

		gltf = await loadGLTF("../data/models/ui/billboard.glb", this.billboardTexture);
		this.billboard = gltf.scene;
		this.billboard.position.set(5, 5, 0);
		this.billboard.scale.set(0, 0, 0);
		this.billboard.rotation.copy(UI_ORIENTATION);
		this.scene.add(this.billboard);
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

	async waitForNextFrame() {
		// Wait for there to be a dt
		while (this.dt === 0) {
			await sleep(0.01);
		}

		// Then reset it and return the value
		let dt = this.dt;
		this.dt = 0;
		return dt;
	}

	write(string) {
		if (string === undefined) {
			string = this.commands.join("");
		}
		this.tabletTexture.write(string);
	}

	async showBillboard(title, body) {
		const rowSize = 26;
		// Create a string that centers the title and wraps body text words properly
		title = title.slice(0, rowSize);
		let half = Math.floor((rowSize - title.length) / 2);
		title = " ".repeat(half) + title + "\n\n";

		this.billboardTexture.write(title + body);

		// Run the interpolation
		let currentTime = 0;
		let duration = 0.25;
		while (currentTime < duration) {
			currentTime += await this.waitForNextFrame();
			let percentComplete = currentTime / duration;
			let currentPosition = lerp(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 2, 2), percentComplete);
			this.billboard.scale.copy(currentPosition);
		}
	}

	async hideBillboard() {
		// Run the interpolation
		let currentTime = 0;
		let duration = 0.25;
		while (currentTime < duration) {
			currentTime += await this.waitForNextFrame();
			let percentComplete = currentTime / duration;
			let currentPosition = lerp(new THREE.Vector3(2, 2, 2), new THREE.Vector3(0, 0, 0), percentComplete);
			this.billboard.scale.copy(currentPosition);
		}
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

	handleKeyEvent(event) {
		event.preventDefault();
		if (this.mode !== this.INPUT_MODES.inputting) {
			return;
		}

		if (event.keyCode === 32 || event.keyCode === 13) {
			this.tablet.userData.button.click();
			return;
		}
		for (let button of this.buttons) {
			if (button.keyCodes.indexOf(event.keyCode) !== -1) {
				button.click();
				return;
			}
		}
	}

	update(dt) {
		this.dt = dt;
	}

	resize(width, height) {
		this.camera.top = 10 * height / width;
		this.camera.updateProjectionMatrix();
	}

	render() {
		this.renderer.render(this.scene, this.camera);
	}


}