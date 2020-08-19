import * as THREE from "../thirdparty/three.module.js";


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
		"~~~~~~~~~~~~~\n" +
		"~~~~~~~~~~~~~\n" +
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


export class TypeableTexture extends THREE.CanvasTexture {
	constructor(backgroundImageUrl, width, height) {
		// Initialize the canvas
		let hiddenCanvas = document.createElement("canvas");
		hiddenCanvas.width = width;
		hiddenCanvas.height = height;

		// Initialize the texture
		super(hiddenCanvas);
		this.magFilter = THREE.NearestFilter;
		this.encoding = THREE.sRGBEncoding;
		this.flipY = false;

		// Get the canvas context
		this.ctx = hiddenCanvas.getContext("2d");

		// Load basic images
		this.backgroundImage = document.createElement("img");
		this.backgroundImage.src = backgroundImageUrl;
		this.fontImage = document.createElement("img");
		this.fontImage.src = "../data/models/ui/font.png";
	}

	write(string) {
		this.ctx.drawImage(this.backgroundImage, 0, 0);

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

		// Flag the texture as needing an update
		this.needsUpdate = true;
	}
}