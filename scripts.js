let muralObj = signal({}, 'mural');

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


function drawHorizontallyTiledImage(image) {
    const aspectRatio = image.width / image.height;
    const scaledImageWidth = aspectRatio * canvas.height;
    const scaledImageHeight = canvas.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const numTilesX = Math.ceil(canvas.width / scaledImageWidth) + 1;
    const y = 0; // Image fills entire canvas height

    const startTile = Math.floor(offsetX / scaledImageWidth);
    const startOffset = offsetX % scaledImageWidth;

    for (let x = startTile; x < startTile + numTilesX; x++) {
        const drawX = x * scaledImageWidth - startOffset;

        if (drawX + scaledImageWidth > 0 && drawX < canvas.width) {
            ctx.drawImage(
                image,
                drawX,
                y,
                scaledImageWidth,
                scaledImageHeight
            );
        }
    }
}

function resizeCanvas(newWidth, newHeight) {
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Calculate scaled dimensions for clamping
    const aspectRatio = image.width / image.height;
    const scaledImageWidth = aspectRatio * newHeight;

    // Clamp offsetX to scaled image width
    offsetX = Math.min(offsetX, scaledImageWidth);
    offsetX = Math.max(offsetX, -scaledImageWidth);

    drawHorizontallyTiledImage(image);
}

function resizeCanvas(newWidth, newHeight) {
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Calculate scaled dimensions for clamping
    const aspectRatio = image.width / image.height;
    const scaledImageWidth = aspectRatio * newHeight;

    // Clamp offsetX to scaled image width
    offsetX = Math.min(offsetX, scaledImageWidth);
    offsetX = Math.max(offsetX, -scaledImageWidth);

    drawHorizontallyTiledImage(image);
}