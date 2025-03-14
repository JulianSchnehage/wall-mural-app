// Get the mural image URL from the data attribute
const muralImageURL = document.querySelector("#wall-mural-preview").getAttribute("data-img");

// Initialize the mural dimensions (used only for aspect ratio)
let muralObj = signal({ width: 400, height: 400 }, 'mural');
let currentUnit = 'cm';
const CM_TO_INCH = 0.393701;
const INCH_TO_CM = 1 / CM_TO_INCH;

// Initialize UI
const widthInput = document.querySelector("#canvas-width");
const heightInput = document.querySelector("#canvas-height");
const unitSelector = document.querySelector("#unit-selector");
unitSelector.value = currentUnit;
updateInputValues();

unitSelector.addEventListener("change", handleUnitChange);
widthInput.addEventListener("change", handleSizeChange);
heightInput.addEventListener("change", handleSizeChange);

document.addEventListener("signal:mural", function(e) {
    if (e.detail.key === "width" || e.detail.key === "height") {
        resizeCanvas(); // call new dynamic resize
    }
});

function handleUnitChange() {
    const newUnit = unitSelector.value;
    if (newUnit === currentUnit) return;
    
    currentUnit = newUnit;
    updateInputValues();
    
    widthInput.step = currentUnit === 'cm' ? '1' : '0.1';
    heightInput.step = currentUnit === 'cm' ? '1' : '0.1';

    drawRulers();
}

function handleSizeChange(e) {
    const rawValue = parseFloat(e.target.value);
    const isWidth = e.target.id === "canvas-width";
    // Convert input value to centimeters (internal units)
    const cmValue = currentUnit === 'cm' ? rawValue : rawValue / CM_TO_INCH;
    
    if (isWidth) {
        muralObj.width = Math.round(cmValue);
    } else {
        muralObj.height = Math.round(cmValue);
    }
    
    // When dimensions change, resize the canvas
    resizeCanvas();
}

function updateInputValues() {
    const width = currentUnit === 'cm' ? muralObj.width : muralObj.width * CM_TO_INCH;
    const height = currentUnit === 'cm' ? muralObj.height : muralObj.height * CM_TO_INCH;
    widthInput.value = width.toFixed(currentUnit === 'cm' ? 0 : 1);
    heightInput.value = height.toFixed(currentUnit === 'cm' ? 0 : 1);
}

// -------------------------------
// Signal function using proxies
// -------------------------------
function signal(data = {}, name = '') {    
    function handler(data, name) {
        return {
            get(obj, key) {
                if (key === '_isProxy') return true;
                let nested = ['[object Object]', 'object Array'];
                let type = Object.prototype.toString.call(obj[key]);
                if (nested.includes(type) && !obj[key]._isProxy) {
                    obj[key] = new Proxy(obj[key], handler(name, data));
                }
                return obj[key];
            },
            set(obj, key, value) {
                if (obj[key] === value) return true;
                obj[key] = value;
                emit(name, { key, value, action: 'set' });
                return true; 
            },
            deleteProperty(obj, key) {
                delete obj[key];
                emit(name, { key, value: obj[key], action: 'delete' });
                return true;
            }
        }
    }
    return new Proxy(data, handler(data, name));
}

// -------------------------
// Emit custom event
// -------------------------
function emit(name, detail = {}) {
    let event = new CustomEvent(`signal:${name}`, {
        bubbles: true,
        detail: detail
    });
    return document.dispatchEvent(event);
}

// -------------------------
// Canvas Elements
// -------------------------
const canvas = document.querySelector("#wall-mural-preview");
const ctx = canvas.getContext("2d", { alpha: false });
const gridCanvas = document.querySelector("#grid-overlay");
const gridCtx = gridCanvas.getContext('2d');
let gridEnabled = false;

// Ruler canvases and measurement value spans
const widthRulerCanvas = document.querySelector('.width-measurement-ruler');
const heightRulerCanvas = document.querySelector('.height-measurement-ruler');
const widthRulerCtx = widthRulerCanvas.getContext('2d');
const heightRulerCtx = heightRulerCanvas.getContext('2d');
const widthValueSpan = document.querySelector('.width-measurement-value');
const heightValueSpan = document.querySelector('.height-measurement-value');

const PANEL_WIDTH_CM = 52;
const REAL_HEIGHT_CM = 200;
const REAL_DPI = 10;

const image = new Image();
image.crossOrigin = "anonymous";
image.src = muralImageURL;

let isDragging = false;
let startX = 0;
let offsetX = 0;

image.onload = function() {
    grayscaleImage = createGrayscaleImage(image);
    resizeCanvas(); // call dynamic resize on image load
};

// Mouse events for dragging on the main canvas
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - offsetX;
});
canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        offsetX = e.clientX - startX;
        offsetX = Math.max(-image.width, Math.min(offsetX, image.width));
        drawHorizontallyTiledImage(isGrayscale ? grayscaleImage : image);
    }
});
canvas.addEventListener('mouseup', () => { isDragging = false; });
canvas.addEventListener('mouseleave', () => { isDragging = false; });

/* 
  Updated resizeCanvas() function:
  - Uses the parent element's dimensions ('.canvas-container') 
  - Computes the new width and height while preserving the aspect ratio from muralObj 
  - Sets the main canvas and grid overlay to these dimensions
  - Sets the ruler canvases so that the width ruler is always 30px tall and matches the canvas width,
    and the height ruler is always 30px wide and matches the canvas height.
*/
function resizeCanvas() {
    // Get the parent element of the main canvas
    const parent = document.querySelector('.canvas-container');
    const parentWidth = Math.floor(parent.clientWidth);
    const parentHeight = Math.floor(parent.clientHeight);
    
    // Use the input dimensions (from muralObj) as the desired dimensions.
    let desiredWidth = muralObj.width;
    let desiredHeight = muralObj.height;
    
    // We'll compute newCanvasWidth and newCanvasHeight based on the container size.
    let newCanvasWidth, newCanvasHeight;
    
    // Check if the desired dimensions fit within the container.
    if (desiredWidth <= parentWidth && desiredHeight <= parentHeight) {
      // Use the input values if they are smaller than the container.
      newCanvasWidth = desiredWidth;
      newCanvasHeight = desiredHeight;
    } else {
      // Otherwise, scale down while preserving aspect ratio.
      const desiredAspectRatio = desiredWidth / desiredHeight;
      if (parentWidth / parentHeight > desiredAspectRatio) {
        // Container is relatively wider; height limits scaling.
        newCanvasHeight = parentHeight;
        newCanvasWidth = parentHeight * desiredAspectRatio;
      } else {
        // Container is relatively narrower; width limits scaling.
        newCanvasWidth = parentWidth;
        newCanvasHeight = parentWidth / desiredAspectRatio;
      }
    }
    newCanvasWidth = Math.floor(newCanvasWidth);
    newCanvasHeight = Math.floor(newCanvasHeight);
    // Update the main canvas and grid overlay internal resolutions.


    canvas.width = newCanvasWidth;
    canvas.height = newCanvasHeight;
    gridCanvas.width = newCanvasWidth;
    gridCanvas.height = newCanvasHeight;
    
    
  
    // Set CSS style dimensions to match our computed sizes.
    // canvas.style.width = `${newCanvasWidth}px`;
    // canvas.style.height = `${newCanvasHeight}px`;
    // gridCanvas.style.width = `${newCanvasWidth}px`;
    // gridCanvas.style.height = `${newCanvasHeight}px`;
  
    // --- Update Ruler Canvases ---
    // The width ruler spans the same width as the main canvas but is fixed 30px tall.
    widthRulerCanvas.width = newCanvasWidth;
    widthRulerCanvas.height = 30;
    widthRulerCanvas.parentElement.style.maxWidth = `${newCanvasWidth}px`;
    // The height ruler spans the same height as the main canvas but is fixed 30px wide.
    heightRulerCanvas.width = 30;
    heightRulerCanvas.height = newCanvasHeight;
    heightRulerCanvas.parentElement.style.maxHeight = `${newCanvasHeight}px`;
    // Redraw main image and grid if the image is loaded.
    if (image.complete) {
      drawHorizontallyTiledImage(isGrayscale ? grayscaleImage : image);
      drawStaticGrid(gridEnabled);
    }
  
    // Update measurement labels (using the original muralObj values).
    const widthValue = currentUnit === 'cm' ? muralObj.width : muralObj.width * CM_TO_INCH;
    const heightValue = currentUnit === 'cm' ? muralObj.height : muralObj.height * CM_TO_INCH;
    widthValueSpan.textContent = `${widthValue.toFixed(currentUnit === 'cm' ? 0 : 1)}${currentUnit}`;
    heightValueSpan.textContent = `${heightValue.toFixed(currentUnit === 'cm' ? 0 : 1)}${currentUnit}`;
  
    // Redraw the rulers.
    drawRulers();
  }
  

// Listen for window resize events to trigger a canvas resize
window.addEventListener('resize', resizeCanvas);

// -------------------------
// Ruler Drawing Functions
// -------------------------
function drawRulers() {
    drawWidthRuler();
    drawHeightRuler();
}

function drawWidthRuler() {
    const ctx = widthRulerCtx;
    const width = widthRulerCanvas.width;
    const height = widthRulerCanvas.height;
    ctx.clearRect(0, 0, width, height);

    const isCM = currentUnit === 'cm';
    // Major ticks: 100cm (1m) for metric or 12 inches (1ft) for imperial.
    const majorStep = isCM ? 100 : 24;
    // Minor ticks: every 10cm or every 1 inch.
    const minorStep = isCM ? 10 : 12;
    const pixelPerUnit = width / muralObj.width; // Scale factor based on muralObj dimensions
    // console.log("pixelPerUnit",pixelPerUnit);
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    for (let x = 0; x <= muralObj.width; x += minorStep) {
        
        const isMajor = x % majorStep === 0;
        ctx.lineWidth = 1;
        
        ctx.beginPath();
        ctx.moveTo(Math.floor(x * pixelPerUnit), isMajor ? 15 : 25);
        ctx.lineTo(Math.floor(x * pixelPerUnit), height);
        ctx.stroke();

        if (isMajor) {
            let value = x;
            let label = isCM ? `${(value / 100).toFixed(0)}m` : `${(value)}"`;
            ctx.fillText(label, Math.floor(x * pixelPerUnit), 10);
        }
    }
}

function drawHeightRuler() {
    const ctx = heightRulerCtx;
    const height = heightRulerCanvas.height;
    const width = heightRulerCanvas.width;
    ctx.clearRect(0, 0, width, height);

    const isCM = currentUnit === 'cm';
    const majorStep = isCM ? 100 : 24;
    const minorStep = isCM ? 10 : 12;
    const pixelPerUnit = height / muralObj.height;

    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#333';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let y = muralObj.height; y >= 0; y -= minorStep) {
        const isMajor = (height - y) % majorStep === 0;
        ctx.lineWidth = 1;

        ctx.beginPath();
        ctx.moveTo(Math.floor(width * pixelPerUnit), y);
        ctx.lineTo(isMajor ? Math.floor(width * pixelPerUnit - 15) : Math.floor(width * pixelPerUnit - 5), y);
        ctx.stroke();

        if (isMajor) {
            let value = (height - y) / pixelPerUnit;
            let label = isCM ? `${(value / 100).toFixed(0)}m` : `${Math.floor(value)}"`;
            ctx.save();
            ctx.translate(width - 10, y);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
    }
}

// -------------------------
// Measuring Tool Function
// -------------------------

        // const crosshairCanvas = document.getElementById('wall-mural-preview');
        // const crosshairCtx = crosshairCanvas.getContext('2d');
        // const tooltip = document.getElementById("crosshair-tooltip");
        
        // // Set canvas dimensions
        // crosshairCanvas.width = muralObj.width;
        // crosshairCanvas.height = muralObj.height;

        // function drawLines(mouseX, mouseY) {
        //     // Clear canvas
        //     crosshairCtx.clearRect(0, 0, crosshairCanvas.width, crosshairCanvas.height);
            
        //     // Set line style
        //     crosshairCtx.strokeStyle = '#ff0000';
        //     crosshairCtx.lineWidth = 1;
            
        //     // Draw vertical line (top to cursor)
        //     crosshairCtx.beginPath();
        //     crosshairCtx.moveTo(mouseX, 0);
        //     crosshairCtx.lineTo(mouseX, mouseY);
        //     crosshairCtx.stroke();
            
        //     // Draw horizontal line (left to cursor)
        //     crosshairCtx.beginPath();
        //     crosshairCtx.moveTo(0, mouseY);
        //     crosshairCtx.lineTo(mouseX, mouseY);
        //     crosshairCtx.stroke();
        // }

        // crosshairCanvas.addEventListener('mousemove', (e) => {
        //     // Get canvas position and mouse coordinates
        //     const rect = crosshairCanvas.getBoundingClientRect();
        //     const mouseX = e.clientX - rect.left;
        //     const mouseY = e.clientY - rect.top;
            
        //     // Update lines
        //     drawLines(mouseX, mouseY);
            
        //     // Update tooltip
        //     tooltip.style.display = 'block';
        //     tooltip.textContent = `(${Math.round(mouseX)}, ${Math.round(mouseY)})`;
        //     tooltip.style.left = `${e.clientX + 10}px`;
        //     tooltip.style.top = `${e.clientY + 10}px`;
        // });

        // crosshairCanvas.addEventListener('mouseleave', () => {
        //     // Clear canvas and hide tooltip when mouse leaves
        //     crosshairCtx.clearRect(0, 0, crosshairCanvas.width, crosshairCanvas.height);
        //     tooltip.style.display = 'none';
        // });

// -------------------------
// Main Canvas Image Drawing
// -------------------------
function drawHorizontallyTiledImage(sourceImage) { 
    const aspectRatio = sourceImage.width / sourceImage.height;
    const scaledImageWidth = aspectRatio * canvas.height;
    const scaledImageHeight = canvas.height;

    ctx.save();
    if (isFlipped) {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleLeft = -scaledImageWidth;
    const visibleRight = canvas.width + scaledImageWidth;
    const startX = Math.floor((offsetX + visibleLeft) / scaledImageWidth);
    const endX = Math.ceil((offsetX + visibleRight) / scaledImageWidth);

    for (let x = startX; x <= endX; x++) {
        const drawX = x * scaledImageWidth - offsetX;
        ctx.drawImage(sourceImage, drawX, 0, scaledImageWidth, scaledImageHeight);
    }
    
    ctx.restore();
}

// -------------------------
// Grid, Flip, and Grayscale Functions
// -------------------------
document.addEventListener("click", function(e) {
    if (e.target.id === "canvasGrid") {
        drawStaticGrid(true);
    }
    if (e.target.id === "flipImage") {
        flipImage();
    } 
    if (e.target.id === "toggleGrayscale") {
        toggleGrayscale();
    }
});

function drawStaticGrid(changeGridState) {
    if (changeGridState === true) {
        gridEnabled = !gridEnabled;
    }
    if (gridEnabled) {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        gridCtx.strokeStyle = 'rgba(102, 255, 0, 1)';
        gridCtx.lineWidth = 1;
        for (let x = 0; x <= gridCanvas.width; x += 52) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, gridCanvas.height);
            gridCtx.stroke();
        }
    } else {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    }    
}

let isFlipped = false;
function flipImage() {
    isFlipped = !isFlipped;
    drawHorizontallyTiledImage(isGrayscale ? grayscaleImage : image);
}

let isGrayscale = false;
let grayscaleImage = null;
function toggleGrayscale() {
    isGrayscale = !isGrayscale;
    if (isGrayscale && !grayscaleImage) {
        grayscaleImage = createGrayscaleImage(image);
    }
    drawHorizontallyTiledImage(isGrayscale && grayscaleImage ? grayscaleImage : image);
}

function createGrayscaleImage(srcImage) {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = srcImage.naturalWidth;
    tempCanvas.height = srcImage.naturalHeight;
    tempCtx.drawImage(srcImage, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = luminance;
    }
    tempCtx.putImageData(imageData, 0, 0);
    const img = new Image();
    img.src = tempCanvas.toDataURL();
    return img;
}
