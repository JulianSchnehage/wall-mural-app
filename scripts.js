

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
const gridCanvas = document.querySelector("#grid-overlay");
const gridCtx = gridCanvas.getContext('2d');

const CM_TO_INCH = 0.393701;
const PANEL_WIDTH_CM = 52;
const REAL_HEIGHT_CM = 200;
const REAL_DPI = 10;


const image = new Image();
image.src = "Placeholder Mural.jpg"

let isDragging = false;
let startX = 0;
let offsetX = 0;

// Update image load handler
image.onload = function() {
    drawHorizontallyTiledImage(image);

    // LINK TO BUTTON
    drawStaticGrid(); // Initial grid draw
};


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


// Modified resize function
function resizeCanvas(newWidth, newHeight) {
    // Resize both canvases
    canvas.width = gridCanvas.width = newWidth;
    canvas.height = gridCanvas.height = newHeight;
    
    drawHorizontallyTiledImage(image);
    drawStaticGrid(); // Draw grid once after resize
}

// Modified draw function (removes grid drawing)
function drawHorizontallyTiledImage(image) {
    const aspectRatio = image.width / image.height;
    const scaledImageWidth = aspectRatio * canvas.height;
    const scaledImageHeight = canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible tile range
    const visibleLeft = -scaledImageWidth;
    const visibleRight = canvas.width + scaledImageWidth;
    const startX = Math.floor((offsetX + visibleLeft) / scaledImageWidth);
    const endX = Math.ceil((offsetX + visibleRight) / scaledImageWidth);

    const y = 0;

    for (let x = startX; x <= endX; x++) {
        const drawX = x * scaledImageWidth - offsetX;
        ctx.drawImage(image, drawX, y, scaledImageWidth, scaledImageHeight);
    }
}


// LINK TO BUTTON
// New static grid drawing function
function drawStaticGrid() {
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

  
