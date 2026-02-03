// src/modules/videoInput.js
export class VideoInput {
    constructor(config) {
        this.config = config;
        this.videoElement = document.getElementById(config.id);
        this.stream = null;

        if (!this.videoElement) {
            console.error(`Video element with id ${config.id} not found.`);
        }
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia(this.config.constraints);
            this.videoElement.srcObject = this.stream;

            return new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.videoElement.play();

                    // Resize config if needed (e.g. for CV performance)
                    if (this.config.processing && this.config.processing.resizeTo) {
                        // This logic handles logical resizing, actual resizing happens when sending data to worker
                    }

                    resolve(this.videoElement);
                };
            });
        } catch (error) {
            console.error("Error accessing webcam:", error);

            let msg = error.message;
            if (error.name === 'NotAllowedError') {
                msg = "Camera access denied. Please allow permission.";
            } else if (error.name === 'NotFoundError') {
                msg = "No camera found.";
            } else if (error.name === 'NotReadableError' || error.message.includes("Device in use")) {
                msg = "Camera is busy! Close other browser tabs/apps using it.";
            } else if (error.name === 'OverconstrainedError') {
                msg = "Camera resolution not supported.";
            }

            throw new Error(msg);
        }
    }

    getVideoElement() {
        return this.videoElement;
    }
}
