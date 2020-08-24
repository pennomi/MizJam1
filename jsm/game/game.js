import * as THREE from '../thirdparty/three.module.js';
import Stats from '../thirdparty/stats.module.js';
import {Level} from "./level.js";
import {COLORS} from "./colors.js";
import {UI} from "./UI.js";


export class SevenSinsGame {
	constructor(containerQuery, debug=true) {
		this.container = document.querySelector(containerQuery);

		// Create and append the container
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, });
		this.renderer.setClearColor(0x000000, 0); // the default
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		this.renderer.autoClear = false;
		this.container.appendChild(this.renderer.domElement);

		// Make sure the renderer can handle a resize event
		window.addEventListener('resize', this.resize.bind(this));

		// Run a framerate display
		this.stats = new Stats();
		if (debug) {
			this.container.appendChild(this.stats.dom);
		}

		this.clock = new THREE.Clock();

		// Set up the Root Scene and Camera
		this.rootScene = new THREE.Scene();
		this.rootScene.background = new THREE.Color(COLORS.black);
		this.camera = new THREE.PerspectiveCamera(40, this.container.clientWidth / this.container.clientHeight, 0.01, 100);
		this.camera.position.set(0, 0, 10);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);

		this.setupLighting(this.rootScene);

		// Keep track of the active level
		this.level = null;
	}

	resize() {
		this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
		this.camera.updateProjectionMatrix();
		this.ui?.resize(this.container.clientWidth, this.container.clientHeight);
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
	}

	setupLighting(scene) {
		scene.add(new THREE.HemisphereLight(0xffffff, 0x000000, 0.4));

		let dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
		dirLight.position.set( 5, 2, 8 );
		scene.add( dirLight );

		// TODO: Add environment map
	}

	render () {
		// Queue up the next frame
		setTimeout(() => {
			requestAnimationFrame(this.render.bind(this));
		}, 1000 / 60);

		// Get change in time since last frame
		const dt = this.clock.getDelta();

		// Update the level and therefore, all of the characters
		if (this.level !== null) {
			this.level.update(dt);
			this.level.setUpCamera(this.camera);
		}

		this.ui?.update(dt);

		// Update the framerate display
		this.stats.update();

		// Render the scene
		this.renderer.render(this.rootScene, this.camera);

		// Then render the UI on top of it
		this.ui?.render();

	}

	async beginGame() {
		// Load the commandment tablet
		this.ui = new UI(this.renderer, this.container);
		await this.ui.load();

		// Load the first level
		this.loadLevel("level" + (new URLSearchParams(location.search).get("level") || "1"));

		// Load audio
		window.addEventListener('click', () => {
			this.loadAudio("./data/music/exodus_flutes.mp3");
		}, {once: true})

		// Start the render loop
		this.render();
	}

	loadLevel(id) {
		this.level = new Level();
		this.level.load("./data/levels/" + id + ".json").then(scene => {
			this.rootScene.add(scene);
			this.level.runLevelRoutine(this.ui).then(proceed => {
				this.rootScene.remove(scene);
				if (proceed) {
					this.loadLevel(this.level.nextLevelId);
				} else {
					this.loadLevel(id);
				}
			});
		});
	}

	loadAudio (audioUrl) {
		if (!this.sound) {
			const isIE11 = !!window.MSInputMethodContext && !!document.documentMode;
			if (isIE11) {
				return;
			}
			this.listener = new THREE.AudioListener();
			this.camera.add(this.listener);
			this.sound = new THREE.Audio(this.listener);
		}
		const audioLoader = new THREE.AudioLoader();
		audioLoader.load(audioUrl, buffer => {
			this.sound.setBuffer(buffer);
			this.sound.setLoop(true);
			this.resumeAudio();
		}, null, err => {
			console.error(err);
		});
	}
	
	muteAudio () {
		this.sound.setVolume(0);
	}
	
	resumeAudio () {
		this.sound.setVolume(1);
		this.sound.play();
	}
}
