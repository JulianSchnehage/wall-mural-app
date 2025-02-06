let muralObj = signal({}, 'mural');

document.addEventListener("DOMContentLoaded", ()=> {
     // Create mural object to control canvas and send data to external service
    
    setupCanvas();

});


document.addEventListener("signal:mural", function(e){
    console.log(e.detail);
    const canvas = document.querySelector("#wall-mural-preview");
    
    if (e.detail.key === "width" || e.detail.key === "height") {
        const width = muralObj.width || 400;
        const height = muralObj.height || 400;
        
        updateCanvasDimensions(width,height);
    }
    
})


document.addEventListener("change", function(e){
    if (e.target.id === "canvas-width") {
        muralObj.width = e.target.value;
    }
    if (e.target.id === "canvas-height") {
        muralObj.height = e.target.value;
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



// -------------------------
// Initialize the canvas

function setupCanvas() {
  
    // Get canvas and context
    const canvas = document.querySelector("#wall-mural-preview");
    const ctx = canvas.getContext('2d');

    // load image
    const image = new Image();
    image.src = "Placeholder Mural.jpg"

    image.onload = function() {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }
}


//------------------
// Update Canvas Dimensions

function updateCanvasDimensions(width,height) {
    const canvas = document.querySelector("#wall-mural-preview")
    const ctx = canvas.getContext('2d');
    
    // Update canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Redraw image with new dimensions
    const image = new Image();
    image.src = "./PlaceHolder Mural.jpg"
    image.onload = function() {
        ctx.drawImage(image, 0, 0, width, height );
    }
    
}

   
    

  
