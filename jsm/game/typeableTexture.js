import * as THREE from "../thirdparty/three.module.js";


const GLYPH_SIZE = 16;
const GLYPH_POSITIONS = {};
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
	constructor(backgroundImageUrl, width, height, startX=0, startY=0, maxRowLength=1) {
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

		this.startX = startX;
		this.startY = startY;
		this.maxRowLength = maxRowLength;
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
				index % this.maxRowLength * GLYPH_SIZE + this.startX,
				Math.floor(index / this.maxRowLength) * GLYPH_SIZE + this.startY,
				GLYPH_SIZE, GLYPH_SIZE
			);

			index += 1;
		}

		// Flag the texture as needing an update
		this.needsUpdate = true;
	}
}