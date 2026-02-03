// src/modules/computerVision.js
export class ComputerVision {
    constructor(config) {
        this.config = config;
        this.worker = null;
        this.onLog = console.log;
        this.onMaskUpdate = () => { };
    }

    setLogCallback(cb) {
        this.onLog = cb;
    }

    setMaskUpdateCallback(cb) {
        this.onMaskUpdate = cb;
    }

    async init() {
        return new Promise((resolve, reject) => {
            // Updated to use Module Worker because we use import statements in the worker
            this.worker = new Worker('./src/modules/cv.worker.js', { type: "module" });

            this.worker.onmessage = (e) => {
                const { type, message, mask, width, height } = e.data;

                if (type === "LOG") {
                    this.onLog(message);
                } else if (type === "ERROR") {
                    this.onLog("Worker Error: " + message);
                    reject(new Error(message));
                } else if (type === "INIT_DONE") {
                    resolve();
                } else if (type === "RESULT") {
                    this.onMaskUpdate({ data: mask, width, height });
                }
            };

            this.worker.onerror = (err) => {
                reject(err);
            };

            this.worker.postMessage({
                type: "INIT",
                payload: this.config.config
            });
        });
    }

    startProcessing(videoElement) {
        if (!this.worker) return;

        // Process frames in loop
        const processLoop = () => {
            if (videoElement.readyState >= 2) {
                // To avoid structured clone overhead of huge bitmaps, we can draw to offscreen canvas or use ImageBitmap
                // For simplicity, create ImageBitmap
                createImageBitmap(videoElement).then(bitmap => {
                    this.worker.postMessage({ type: "PROCESS_FRAME", payload: bitmap }, [bitmap]);
                }).catch(err => {
                    // Frame skipped or error
                });
            }
            requestAnimationFrame(processLoop);
        };

        processLoop();
    }
}
