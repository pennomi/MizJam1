import * as THREE from '../thirdparty/three.module.js';
import Stats from '../thirdparty/stats.module.js';
import {Level} from "./level.js";
import {COLORS} from "./colors.js";


export class SevenSinsGame {
	constructor(containerQuery, debug=true) {
		this.container = document.querySelector(containerQuery);

		// Create and append the container
		this.renderer = new THREE.WebGLRenderer({ antialias: true });
		this.renderer.setPixelRatio(window.devicePixelRatio);
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
		this.renderer.outputEncoding = THREE.sRGBEncoding;
		this.container.appendChild(this.renderer.domElement);

		// Set up the camera
		this.camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 100);
		this.camera.position.set(0, 0, 10);
		this.camera.up.set(0, 1, 0);
		this.camera.lookAt(0, 0, 0);

		// Make sure the renderer can handle a resize event
		window.onresize = this.resize.bind(this);

		// Run a framerate display
		this.stats = new Stats();
		if (debug) {
			this.container.appendChild(this.stats.dom);
		}

		this.clock = new THREE.Clock();

		this.rootScene = new THREE.Scene();
		this.rootScene.background = new THREE.Color(COLORS.black);

		this.setupLighting();

		// Keep track of the active level
		this.level = null;
	}

	resize() {
		this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
		this.camera.updateProjectionMatrix();
		this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
	}

	setupLighting () {
		this.rootScene.add( new THREE.HemisphereLight( 0xffffff, 0x000000, 0.4 ) );

		let dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
		dirLight.position.set( 5, 2, 8 );
		this.rootScene.add( dirLight );

		// TODO: Add environment map
	}

	render () {
		// Queue up the next frame
		requestAnimationFrame(this.render.bind(this));

		// Get change in time since last frame
		const dt = this.clock.getDelta();

		// Update the level and therefore, all of the characters
		if (this.level !== null) {
			this.level.update(dt);
			let position = this.level.getIdealCameraPosition();
			this.camera.position.copy(position);
		}

		// Update the framerate display
		this.stats.update();

		// Render the scene
		this.renderer.render(this.rootScene, this.camera);
	}

	beginGame() {
		// Start the render loop
		this.render();

		// Load the first level
		this.level = new Level();
		this.level.load("../data/levels/level1.json").then((scene)=>{
			this.rootScene.add(scene);
		});
	}
}





