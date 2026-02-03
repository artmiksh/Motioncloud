// src/main.js
import { VideoInput } from './modules/videoInput.js';
import { ComputerVision } from './modules/computerVision.js';
import { Renderer } from './modules/renderer.js';
import { UI } from './modules/ui.js';

function log(msg) {
    // const el = document.getElementById("app-status");
    // if (el) {
    //     el.innerText = msg;
    //     el.style.color = "#00ff00";
    // }
    console.log("[AppLog]", msg);
}

function error(msg) {
    // const el = document.getElementById("app-status");
    // if (el) {
    //     el.innerText = msg;
    //     el.style.color = "#ff3333";
    // }
    console.error("[AppError]", msg);
}

async function main() {
    try {
        log("Loading...");
        const response = await fetch('./architecture_config.json?t=' + Date.now());
        const config = await response.json();

        // 1. Video
        log("Starting Camera...");
        const videoInput = new VideoInput(config.modules.videoInput);
        const videoElement = await videoInput.start();

        // 2. Renderer
        log("Starting Renderer...");
        const renderer = new Renderer(config.modules.renderer);
        await renderer.init(config.modules.sceneGraph);
        renderer.setExternalTextures(videoElement);

        // 3. UI
        const ui = new UI(config.modules.ui, renderer);
        ui.init();

        // 4. Render Loop
        function animate(time) {
            requestAnimationFrame(animate);
            renderer.render(time);
        }
        requestAnimationFrame(animate);

        // 5. CV with Increased Timeout
        log("Initializing AI (CPU Mode)... This puts heavy load initially.");
        const cv = new ComputerVision(config.modules.computerVision);

        cv.setLogCallback((msg) => {
            log("AI Status: " + msg);
        });

        cv.setMaskUpdateCallback(({ data, width, height }) => {
            renderer.updateMask(data, width, height);
        });

        // 60 Seconds Timeout for slow connections
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("AI download/init timed out (>60s). Check Internet.")), 60000)
        );

        try {
            await Promise.race([cv.init(), timeout]);
            log("AI Ready! Processing...");
            cv.startProcessing(videoElement);
        } catch (cvErr) {
            error("AI Failed: " + cvErr.message + ". App running in manual visual mode.");
        }

    } catch (e) {
        error("Fatal Error: " + e.message);
    }
}

main();
