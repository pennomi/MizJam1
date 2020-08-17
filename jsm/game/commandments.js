import * as THREE from "../thirdparty/three.module.js";
import {GLTFLoader} from "../thirdparty/GLTFLoader.js";

const GLYPH_SIZE = 16;
const GLYPH_POSITIONS = {};
const TABLET_GLYPH_WIDTH = 4;
const TABLET_INITIAL_POSITION = [GLYPH_SIZE * 2, GLYPH_SIZE * 2];
function loadGlyphs() {
	const characters =
		"0123456789:.%\n" +
		"ABCDEFGHIJKLM\n" +
		"NOPQRSTUVWXYZ\n" +
		"#+-×÷=@$¢!?© \n" +
		"\n" +
		"\n" +
		"~~~~~~~~~↑→↓←\n" +
		"~~~~~~~~~⇧⇨⇩⇦\n";
	let i = 0;
	for (const row of characters.split("\n")) {
		let j = 0;
		for (const char of row) {
			GLYPH_POSITIONS[char] = [j, i];
			j += 1;
		}
		i += 1;
	}
}
loadGlyphs();


export class Commandments {
	constructor() {
		this.scene = new THREE.Scene();
		this.scene.rotation.set(-Math.PI/16, -Math.PI/8, 0);
		this.tablet = null;
		this.camera = new THREE.OrthographicCamera();  // TODO: This renders the buttons or something?
		this.commands = [];

		this.canvas = document.createElement("canvas");
		this.canvas.width = 128;
		this.canvas.height = 128;
		this.ctx = this.canvas.getContext("2d");
		this.texture = new THREE.CanvasTexture(this.canvas);
		this.texture.magFilter = THREE.NearestFilter;
		this.texture.encoding = THREE.sRGBEncoding;
		this.texture.flipY = false;
	}

	async load () {
		// Load the images
		this.tabletImage = document.createElement("img");
		this.tabletImage.src = "../data/models/ui/tablet.png";
		this.fontImage = document.createElement("img");
		this.fontImage.src = "../data/models/ui/font.png";

		// Load the model
		return new Promise((resolve, reject) => {
			let loader = new GLTFLoader();
			loader.load("../data/models/ui/tablet.glb", gltf => {
				// Add it to the scene
				this.tablet = gltf.scene;
				this.scene.add(this.tablet);

				this.tablet.traverse(node=>{
					if (node instanceof THREE.Mesh) {
						node.material.map = this.texture;
					}
				});

				// Return it
				resolve(this.scene);
			}, null, reject);
		});
	}

	clear () {
		this.ctx.drawImage(this.tabletImage, 0, 0);
	}

	write(string) {
		this.clear();

		string = string.toUpperCase();
		let index = 0;
		for (const char of string) {
			const glyphPosition = GLYPH_POSITIONS[char];
			this.ctx.drawImage(
				this.fontImage,
				glyphPosition[0] * GLYPH_SIZE,
				glyphPosition[1] * GLYPH_SIZE,
				GLYPH_SIZE, GLYPH_SIZE,
				index % TABLET_GLYPH_WIDTH * GLYPH_SIZE + TABLET_INITIAL_POSITION[0],
				Math.floor(index / TABLET_GLYPH_WIDTH) * GLYPH_SIZE + TABLET_INITIAL_POSITION[1],
				GLYPH_SIZE, GLYPH_SIZE
			);

			index += 1;
		}
	}

	// checkInput (input) {
	//
	// }


}