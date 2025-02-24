let muralObj = signal({ width: 400, height: 400 }, 'mural'); // Initialize with defaults
let currentUnit = 'cm';
const CM_TO_INCH = 0.393701;
const INCH_TO_CM =  1 / CM_TO_INCH;

// Initialize UI
const widthInput = document.querySelector("#canvas-width");
const heightInput = document.querySelector("#canvas-height");
const unitSelector = document.querySelector("#unit-selector");
unitSelector.value = currentUnit;
// Set initial values based on default unit
updateInputValues();

unitSelector.addEventListener("change", handleUnitChange);
widthInput.addEventListener("change", handleSizeChange);
heightInput.addEventListener("change", handleSizeChange);

document.addEventListener("signal:mural", function(e) {
    if (e.detail.key === "width" || e.detail.key === "height") {
        resizeCanvas(muralObj.width, muralObj.height);
    }
});

function handleUnitChange() {
    const newUnit = unitSelector.value;
    if (newUnit === currentUnit) return;
    
    // Convert current values to new unit
    currentUnit = newUnit;
    updateInputValues();
    
    // Update step increments
    widthInput.step = currentUnit === 'cm' ? '1' : '0.1';
    heightInput.step = currentUnit === 'cm' ? '1' : '0.1';

    drawRulers();
}

function handleSizeChange(e) {
    const rawValue = parseFloat(e.target.value);
    const isWidth = e.target.id === "canvas-width";
    
    // Convert input value to centimeters
    const cmValue = currentUnit === 'cm' ? rawValue : rawValue / CM_TO_INCH;
    
    if (isWidth) {
        muralObj.width = Math.round(cmValue);
    } else {
        muralObj.height = Math.round(cmValue);
    }
}

function updateInputValues() {
    // Convert internal cm values to current unit
    const width = currentUnit === 'cm' ? 
        muralObj.width : 
        muralObj.width * CM_TO_INCH;
    
    const height = currentUnit === 'cm' ? 
        muralObj.height : 
        muralObj.height * CM_TO_INCH;

    widthInput.value = width.toFixed(currentUnit === 'cm' ? 0 : 1);
    heightInput.value = height.toFixed(currentUnit === 'cm' ? 0 : 1);
}


// -------------------------------
// Components
// -------------------------------

// Signal function using proxies

function signal(data = {}, name='') {
        
    function handler(data, name) {
        return {
            get (obj,key) {
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
                emit(name, {key, value, action: 'set'});
                return true; 
            },
            deleteProperty (obj, key) {
                delete obj[key];
                emit(name, {key,value: obj[key], action: 'delete'});
                return true;
            }
        }

    }

    return new Proxy (data, handler(data,name));

}

// -------------------------
// Emit custom event
// -------------------------

function emit (name, detail = {}) {
    // create new event
    let event = new CustomEvent(`signal:${name}`, {
        bubbles: true,
        detail: detail
    });
    
    // dispatch event
    return document.dispatchEvent(event)

}

// -------------------------
// Canvas Element 
// -------------------------


const canvas = document.querySelector("#wall-mural-preview");
const ctx = canvas.getContext('2d')
const gridCanvas = document.querySelector("#grid-overlay");
const gridCtx = gridCanvas.getContext('2d');
let gridEnabled = false;

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
image.src = "assets/Placeholder%20Mural.jpg"

let isDragging = false;
let startX = 0;
let offsetX = 0;

image.onload = function() {
    grayscaleImage = createGrayscaleImage(image);
    resizeCanvas(muralObj.width, muralObj.height); // Force initial resize
};

//records location of pointer when user clicks
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - offsetX;
})

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        offsetX = e.clientX - startX;
        offsetX = Math.max(-image.width, Math.min(offsetX, image.width));
        
        // Use current image state
        drawHorizontallyTiledImage(isGrayscale ? grayscaleImage : image);
    }
});

// if the user release click or the cursor leaves the canvas, dragging stops
canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});



function resizeCanvas(widthCM, heightCM) {
    // Ensure minimum size
    widthCM = Math.max(1, widthCM);
    heightCM = Math.max(1, heightCM);

    // Update canvas dimensions
    canvas.width = gridCanvas.width = widthCM;
    canvas.height = gridCanvas.height = heightCM;

    // Redraw content
    if (image.complete) {
        drawHorizontallyTiledImage(isGrayscale ? grayscaleImage : image);
        drawStaticGrid(false);
    }
    // Update ruler dimensions to match main canvas
    widthRulerCanvas.width = canvas.width;
    heightRulerCanvas.height = canvas.height;

    // Update measurement labels
    const widthValue = currentUnit === 'cm' ? widthCM : widthCM * CM_TO_INCH;
    const heightValue = currentUnit === 'cm' ? heightCM : heightCM * CM_TO_INCH;

    widthValueSpan.textContent = `${widthValue.toFixed(currentUnit === 'cm' ? 0 : 1)}${currentUnit}`;
    heightValueSpan.textContent = `${heightValue.toFixed(currentUnit === 'cm' ? 0 : 1)}${currentUnit}`;

    drawRulers();
}


function drawRulers() {
    drawWidthRuler();
    drawHeightRuler();
}

function drawWidthRuler() {
    const ctx = widthRulerCtx;
    const width = canvas.width;
    const height = 30;
    ctx.clearRect(0, 0, width, height);

    const isCM = currentUnit === 'cm';
    const majorStep = isCM ? 100 : 12;  // 100cm or 12"
    const minorStep = isCM ? 10 : 1;     // 10cm or 1"
    const pixelPerUnit = isCM ? 1 : INCH_TO_CM;  // 2.54px per inch

    // Style setup
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#333';
    ctx.font = '9px Arial';
    ctx.textAlign = 'center';

    // Draw ticks (FIXED: minorStep * pixelPerUnit)
    for (let x = 0; x <= width; x += minorStep * pixelPerUnit) {
        const isMajor = x % (majorStep * pixelPerUnit) === 0;
        ctx.lineWidth = isMajor ? 1 : 0.5;
        
        ctx.beginPath();
        ctx.moveTo(x, isMajor ? 5 : 15);
        ctx.lineTo(x, height);
        ctx.stroke();

        if (isMajor) {
            const value = isCM ? x : x / INCH_TO_CM;  // Convert pixels to inches
            const label = isCM ? 
                `${value}cm` : 
                `${Math.floor(value/12)}' ${(value%12)}"`;
            ctx.fillText(label, x, 3);
        }
    }
}

function drawHeightRuler() {
    const ctx = heightRulerCtx;
    const height = canvas.height;
    const width = 30;
    ctx.clearRect(0, 0, width, height);

    const isCM = currentUnit === 'cm';
    const majorStep = isCM ? 100 : 12;  // 100cm or 12"
    const minorStep = isCM ? 20 : 1;     // 20cm or 1"
    const pixelPerUnit = isCM ? 1 : INCH_TO_CM;  // 2.54px per inch

    // Style setup
    ctx.strokeStyle = '#666';
    ctx.fillStyle = '#333';
    ctx.font = '9px Arial';


    for (let y = 0; y <= height; y += minorStep * pixelPerUnit) {
        const isMajor = y % (majorStep * pixelPerUnit) === 0;
        ctx.lineWidth = isMajor ? 1 : 0.5;
        
        ctx.beginPath();
        ctx.moveTo(isMajor ? 5 : 15, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        if (isMajor) {
            const value = isCM ? y : y / INCH_TO_CM;  // Convert pixels to inches
            const label = isCM ? 
                `${value}cm` : 
                `${Math.floor(value/12)}' ${(value%12)}"`;
            
            ctx.save();
            ctx.translate(12, y);
            ctx.rotate(-Math.PI/2);
            ctx.fillText(label, 0, 0);
            ctx.restore();
        }
    }
}

function drawHorizontallyTiledImage(sourceImage) { 
    const aspectRatio = sourceImage.width / sourceImage.height;
    const scaledImageWidth = aspectRatio * canvas.height;
    const scaledImageHeight = canvas.height;

    ctx.save();
    
    // Apply flip transformation if needed
    if (isFlipped) {
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const visibleLeft = -scaledImageWidth;
    const visibleRight = canvas.width + scaledImageWidth;
    const startX = Math.floor((offsetX + visibleLeft) / scaledImageWidth);
    const endX = Math.ceil((offsetX + visibleRight) / scaledImageWidth);

    const y = 0;

    for (let x = startX; x <= endX; x++) {
        const drawX = x * scaledImageWidth - offsetX;
        ctx.drawImage(
            sourceImage,
            drawX, 
            y, 
            scaledImageWidth, 
            scaledImageHeight
        );
    }
    
    ctx.restore();
}

// Add event listeners for grid and other tools
document.addEventListener("click", function(e){
    if (e.target.id === "canvasGrid") {
        drawStaticGrid(true);
    }
    if (e.target.id === "flipImage") {
        flipImage();
    } 
    if (e.target.id === "toggleGrayscale") {
        toggleGrayscale(ctx)
    }
});



// New static grid drawing function
function drawStaticGrid(changeGridState) {
    
    if (changeGridState === true){
        gridEnabled = !gridEnabled;
    }
    if (gridEnabled === true) {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    
        // Vertical lines every 52px (52cm panel boundaries)
        gridCtx.strokeStyle = 'rgba(102, 255, 0, 1)';
        gridCtx.lineWidth = 1;
        for (let x = 0; x <= gridCanvas.width; x += 52) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, gridCanvas.height);
            gridCtx.stroke();
        }
        
    } else if (gridEnabled === false) {
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
    }    
};


// Flip image 
let isFlipped = false;

function flipImage() {
    isFlipped = !isFlipped;
    // Redraw with current image (grayscale or original)
    drawHorizontallyTiledImage(isGrayscale ? grayscaleImage : image);
}

// Add state variables
let isGrayscale = false;
let grayscaleImage = null;

function toggleGrayscale() {
    isGrayscale = !isGrayscale;
    if (isGrayscale && !grayscaleImage) {
        // Create grayscale version on first toggle
        grayscaleImage = createGrayscaleImage(image);
    }
    // Redraw with appropriate image
    if (isGrayscale && grayscaleImage) {
        drawHorizontallyTiledImage(grayscaleImage);
    } else {
        drawHorizontallyTiledImage(image);
    }
}


// Grayscale preprocessing
function createGrayscaleImage(srcImage) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size to match source image
    canvas.width = srcImage.naturalWidth;
    canvas.height = srcImage.naturalHeight;
    
    // Draw and convert to grayscale
    ctx.drawImage(srcImage, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = luminance;
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    // Create new image from processed canvas
    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
}