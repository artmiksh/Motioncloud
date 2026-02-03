// src/modules/cv.worker.js
// Module Worker Version

import { FilesetResolver, ImageSegmenter } from "../libs/vision_bundle.js";

let segmenter = null;

self.postMessage({ type: "LOG", message: "Worker (Module): Loaded." });

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        if (type === "INIT") {
            self.postMessage({ type: "LOG", message: "Worker: Initializing..." });

            // We need to tell FilesetResolver where the WASM file is.
            // Since we are in src/modules/, and libs are in src/libs/
            // The path provided to forVisionTasks should be relative to the page or the worker?
            // Usually relative to the module if we pass a path.
            // Let's rely on the direct path we know works from previous steps or standard relative path.
            const vision = await FilesetResolver.forVisionTasks(
                "/src/libs/vision_wasm_internal.js"
            );

            self.postMessage({ type: "LOG", message: "Worker: Creating Segmenter..." });

            segmenter = await ImageSegmenter.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: payload.modelAssetPath,
                    delegate: "CPU" // Use CPU for stability
                },
                runningMode: "VIDEO",
                outputCategoryMask: payload.outputCategoryMask,
                outputConfidenceMasks: payload.outputConfidenceMasks
            });

            self.postMessage({ type: "LOG", message: "Worker: Ready." });
            postMessage({ type: "INIT_DONE" });

        } else if (type === "PROCESS_FRAME") {
            if (!segmenter) return;

            const startTimeMs = performance.now();
            segmenter.segmentForVideo(payload, startTimeMs, (result) => {
                // Handle Multiclass Output (Index 0 is Background usually)
                if (result.confidenceMasks && result.confidenceMasks.length > 0) {
                    const mask = result.confidenceMasks[0];
                    const maskData = mask.getAsFloat32Array();

                    // Invert if necessary (1.0 - value) if the model returns Background confidence
                    // Checking typical behaviour: 
                    // Selfie Multiclass: 0=Background, 1=Hair, 2=Body...
                    // So mask[0] is Background. Shader wants Body (1.0).
                    // So we invert.
                    for (let i = 0; i < maskData.length; i++) {
                        maskData[i] = 1.0 - maskData[i];
                    }

                    postMessage({
                        type: "RESULT",
                        mask: maskData,
                        width: mask.width,
                        height: mask.height
                    }, [maskData.buffer]);
                }
            });
        }
    } catch (err) {
        self.postMessage({ type: "LOG", message: "ERROR: " + err.message });
        self.postMessage({ type: "ERROR", message: err.toString() });
    }
};
