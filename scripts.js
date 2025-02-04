// Get canvas and context
const canvas = document.querySelector("#wallMuralPreview");
const ctx = canvas.getContext('2d')

// load image
const image = new Image();
image.src = "/Placeholder Mural.jpg"

image.onload = function() {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
}
