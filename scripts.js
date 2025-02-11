let muralObj = signal({}, 'mural');

// reset input values to 400 on page reload
document.querySelector("#canvas-width").value = 400;
document.querySelector("#canvas-height").value = 400;

document.addEventListener("signal:mural", function(e){
    console.log(e.detail);
    
    if (e.detail.key === "width" || e.detail.key === "height") {
        const width = muralObj.width || 400;
        const height = muralObj.height || 400;
        
        resizeCanvas(width,height);
    }
    
})


document.addEventListener("change", function(e){
    if (e.target.id === "canvas-width") {
        muralObj.width = parseInt(e.target.value, 10);
    }
    if (e.target.id === "canvas-height") {
        muralObj.height = parseInt(e.target.value, 10);
    }
})

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

function emit (name, detail = {}) {
    // create new event
    let event = new CustomEvent(`signal:${name}`, {
        bubbles: true,
        detail: detail
    });
    
    // dispatch event
    return document.dispatchEvent(event)

}

//--------------------------------------------------------
// Canvas Element 
//--------------------------------------------------------

const canvas = document.querySelector("#wall-mural-preview");
const ctx = canvas.getContext('2d')

const image = new Image();
image.src = "Placeholder Mural.jpg"

let isDragging = false;
let startX = 0;
let offsetX = 0;


image.onload = function(){
    drawHorizontallyTiledImage(image);
}

//records location of pointer when user clicks
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX - offsetX;
})

// make sure the user doesn't scroll too far
canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        offsetX = e.clientX - startX;

        if (offsetX > image.width) offsetX = image.width;
        if (offsetX < -image.width) offsetX = -image.width;
        
        drawHorizontallyTiledImage(image);
    }
});

// if the user release click or the cursor leaves the canvas, dragging stops
canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});


const CM_TO_INCH = 0.393701;
const PANEL_WIDTH_CM = 52;
const REAL_HEIGHT_CM = 200;
const REAL_DPI = 10;

// Modified draw function with measurement-accurate grid
function drawHorizontallyTiledImage(image) {
    // Calculate pixel dimensions based on real-world measurements
    const realWidthPx = image.width; // Original pixel width from file
    const realHeightPx = image.height; // Original pixel height from file
    const scaleFactor = (REAL_HEIGHT_CM * REAL_DPI) / (2.54 * realHeightPx);
    
    const displayHeightPx = REAL_HEIGHT_CM; // 200cm = 200px
    const displayWidthPx = realWidthPx * scaleFactor;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center vertically
    const y = (canvas.height - displayHeightPx) / 2;

    // Calculate visible tile range
    const numTilesX = Math.ceil(canvas.width / displayWidthPx) + 1;
    const startTile = Math.floor(offsetX / displayWidthPx);
    const startOffset = offsetX % displayWidthPx;

    // Draw tiled images
    for (let x = startTile; x < startTile + numTilesX; x++) {
        const drawX = x * displayWidthPx - startOffset;
        if (drawX + displayWidthPx > 0 && drawX < canvas.width) {
            ctx.drawImage(
                image,
                drawX,
                y,
                displayWidthPx,
                displayHeightPx
            );
        }
    }

    // Draw measurement grid
    drawMeasurementGrid();
}

// New grid drawing function with unit awareness
function drawMeasurementGrid() {
    // Vertical lines (panel boundaries)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 1;
    
    // Calculate visible panel range
    const firstVisiblePanel = Math.floor(offsetX / PANEL_WIDTH_CM) - 1;
    const lastVisiblePanel = Math.ceil((offsetX + canvas.width) / PANEL_WIDTH_CM) + 1;

    // Draw panel boundaries
    for (let p = firstVisiblePanel; p <= lastVisiblePanel; p++) {
        const xPos = p * PANEL_WIDTH_CM - offsetX;
        ctx.beginPath();
        ctx.moveTo(xPos, 0);
        ctx.lineTo(xPos, canvas.height);
        ctx.stroke();
    }

    // Horizontal lines (measurement markers)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    const measurementInterval = 100; // Every 100cm
    for (let y = 0; y <= canvas.height; y += measurementInterval) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

// Updated mouse move handler with measurement clamping
canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const realWidthPx = image.width;
        const realHeightPx = image.height;
        const scaleFactor = (REAL_HEIGHT_CM * REAL_DPI) / (2.54 * realHeightPx);
        const displayWidthPx = realWidthPx * scaleFactor;

        offsetX = e.clientX - startX;
        
        // Clamp offset to prevent empty space
        offsetX = Math.min(offsetX, displayWidthPx);
        offsetX = Math.max(offsetX, -displayWidthPx);
        
        drawHorizontallyTiledImage(image);
    }
});

// Conversion functions for UI
function pxToCm(px) {
    return px; // 1:1 mapping
}

function pxToInches(px) {
    return px * CM_TO_INCH;
}

// Example usage when showing measurements:
function updateMeasurementsDisplay() {
    const currentWidthCm = pxToCm(canvas.width);
    const currentWidthInches = pxToInches(canvas.width);
    
    console.log(`Wall width: ${currentWidthCm}cm (${currentWidthInches.toFixed(1)}")`);
}