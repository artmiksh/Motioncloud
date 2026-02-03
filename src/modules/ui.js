// src/modules/ui.js
export class UI {
    constructor(config, rendererInstance) {
        this.config = config;
        this.container = document.getElementById(config.containerId);
        this.renderer = rendererInstance;
    }

    init() {
        if (!this.container) return;

        // Apply Layout
        Object.assign(this.container.style, this.config.layout);

        const content = document.getElementById("controls-content");

        this.config.components.forEach(comp => {
            const wrapper = document.createElement('div');
            wrapper.className = 'control-group';

            const label = document.createElement('label');
            label.innerText = comp.label;
            wrapper.appendChild(label);

            let input;

            if (comp.type === 'slider') {
                input = document.createElement('input');
                input.type = 'range';
                input.min = comp.min;
                input.max = comp.max;
                input.step = comp.step;

                // Get initial value
                const boundObj = this.renderer.getBinding(comp.binding);
                if (boundObj) input.value = boundObj.value;

                input.addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    if (boundObj) boundObj.value = val;
                });
            } else if (comp.type === 'color') {
                input = document.createElement('input');
                input.type = 'color';

                const boundObj = this.renderer.getBinding(comp.binding);

                // Set initial value from the bound property (which is likely a THREE.Color)
                if (boundObj && boundObj.value && typeof boundObj.value.getHexString === 'function') {
                    input.value = "#" + boundObj.value.getHexString();
                } else {
                    input.value = "#0066ff"; // Default Blue fallback if binding fails
                }

                input.addEventListener('input', (e) => {
                    const hex = e.target.value;
                    if (boundObj) boundObj.value.set(hex);
                });
            } else if (comp.type === 'toggle') {
                input = document.createElement('input');
                input.type = 'checkbox';

                const boundObj = this.renderer.getBinding(comp.binding);
                // 1.0 = Checked (Show Background), 0.0 = Unchecked (Figure Only)
                if (boundObj) input.checked = (boundObj.value > 0.5);

                input.addEventListener('change', (e) => {
                    if (boundObj) boundObj.value = e.target.checked ? 1.0 : 0.0;
                });
            }

            wrapper.appendChild(input);
            content.appendChild(wrapper);
        });
    }
}
