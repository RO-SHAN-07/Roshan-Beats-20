// Animation Engine for Roshan Beats PWA
// GPU-accelerated animations using CSS transforms and requestAnimationFrame

class AnimationEngine {
    constructor() {
        this.animations = new Map();
        this.isRunning = false;
        this.frameId = null;
        this.fps = 60;
        this.frameInterval = 1000 / this.fps;
        this.lastFrameTime = 0;
    }

    // Start animation loop
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.animate();
        }
    }

    // Stop animation loop
    stop() {
        this.isRunning = false;
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
    }

    // Main animation loop
    animate(currentTime = 0) {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastFrameTime;

        if (deltaTime >= this.frameInterval) {
            this.updateAnimations(deltaTime);
            this.lastFrameTime = currentTime;
        }

        this.frameId = requestAnimationFrame(this.animate.bind(this));
    }

    // Update all active animations
    updateAnimations(deltaTime) {
        for (const [id, animation] of this.animations) {
            if (animation.update(deltaTime)) {
                // Animation completed
                animation.onComplete?.();
                this.animations.delete(id);
            }
        }

        // Stop loop if no animations remain
        if (this.animations.size === 0) {
            this.stop();
        }
    }

    // Add animation
    addAnimation(id, animation) {
        this.animations.set(id, animation);
        this.start();
    }

    // Remove animation
    removeAnimation(id) {
        this.animations.delete(id);
    }

    // Create smooth transition animation
    animateTo(element, properties, duration = 300, easing = 'easeOutCubic') {
        const id = `animate-${Date.now()}-${Math.random()}`;
        const animation = new PropertyAnimation(element, properties, duration, easing);
        this.addAnimation(id, animation);
        return id;
    }

    // Create spring animation
    springTo(element, properties, options = {}) {
        const id = `spring-${Date.now()}-${Math.random()}`;
        const animation = new SpringAnimation(element, properties, options);
        this.addAnimation(id, animation);
        return id;
    }
}

// Property animation class
class PropertyAnimation {
    constructor(element, properties, duration, easing = 'easeOutCubic') {
        this.element = element;
        this.properties = {};
        this.duration = duration;
        this.easing = easing;
        this.elapsed = 0;
        this.onComplete = null;

        // Store initial values
        this.initialValues = {};
        this.targetValues = {};

        for (const [property, value] of Object.entries(properties)) {
            this.initialValues[property] = this.getCurrentValue(property);
            this.targetValues[property] = value;
        }
    }

    update(deltaTime) {
        this.elapsed += deltaTime;
        const progress = Math.min(this.elapsed / this.duration, 1);
        const easedProgress = this.ease(progress);

        // Update properties
        for (const [property, targetValue] of Object.entries(this.targetValues)) {
            const initialValue = this.initialValues[property];
            const currentValue = this.interpolate(initialValue, targetValue, easedProgress);
            this.setProperty(property, currentValue);
        }

        return progress >= 1;
    }

    getCurrentValue(property) {
        const computedStyle = getComputedStyle(this.element);
        switch (property) {
            case 'translateX':
            case 'translateY':
            case 'scale':
            case 'rotate':
                return 0; // Transform properties start at 0
            case 'opacity':
                return parseFloat(computedStyle.opacity) || 1;
            default:
                return parseFloat(computedStyle[property]) || 0;
        }
    }

    setProperty(property, value) {
        switch (property) {
            case 'translateX':
            case 'translateY':
            case 'scale':
            case 'rotate':
                this.updateTransform(property, value);
                break;
            default:
                this.element.style[property] = value;
        }
    }

    updateTransform(property, value) {
        // Cache current transform to avoid recomputing
        if (!this.element._currentTransform) {
            this.element._currentTransform = {
                translateX: 0,
                translateY: 0,
                scale: 1,
                rotate: 0
            };
        }

        this.element._currentTransform[property] = value;

        const transform = this.element._currentTransform;
        const transformString = `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale}) rotate(${transform.rotate}deg)`;

        // Use GPU acceleration
        this.element.style.transform = transformString;
        this.element.style.willChange = 'transform';
    }

    interpolate(start, end, progress) {
        return start + (end - start) * progress;
    }

    ease(t) {
        const easingFunctions = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeInCubic: t => t * t * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
            easeInQuart: t => t * t * t * t,
            easeOutQuart: t => 1 - (--t) * t * t * t,
            easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t
        };

        return easingFunctions[this.easing]?.(t) || t;
    }
}

// Spring animation class
class SpringAnimation {
    constructor(element, properties, options = {}) {
        this.element = element;
        this.properties = properties;
        this.options = {
            stiffness: 100,
            damping: 10,
            mass: 1,
            ...options
        };

        this.velocity = {};
        this.position = {};
        this.target = {};

        // Initialize
        for (const [property, value] of Object.entries(properties)) {
            this.position[property] = this.getCurrentValue(property);
            this.target[property] = value;
            this.velocity[property] = 0;
        }

        this.onComplete = null;
    }

    update(deltaTime) {
        const dt = deltaTime / 1000; // Convert to seconds
        let isComplete = true;

        for (const [property, targetValue] of Object.entries(this.target)) {
            const currentPosition = this.position[property];
            const currentVelocity = this.velocity[property];

            // Spring force
            const displacement = currentPosition - targetValue;
            const springForce = -this.options.stiffness * displacement;
            const dampingForce = -this.options.damping * currentVelocity;

            // Acceleration
            const acceleration = (springForce + dampingForce) / this.options.mass;

            // Update velocity and position
            this.velocity[property] += acceleration * dt;
            this.position[property] += currentVelocity * dt;

            // Update element
            this.setProperty(property, this.position[property]);

            // Check if animation is complete
            if (Math.abs(displacement) > 0.1 || Math.abs(currentVelocity) > 0.1) {
                isComplete = false;
            }
        }

        return isComplete;
    }

    getCurrentValue(property) {
        return new PropertyAnimation(this.element, {}, 0).getCurrentValue(property);
    }

    setProperty(property, value) {
        new PropertyAnimation(this.element, {}, 0).setProperty(property, value);
    }
}

// Visualizer animation class
class VisualizerAnimation {
    constructor(canvas, analyserNode) {
        this.canvas = canvas;
        this.analyserNode = analyserNode;
        this.ctx = canvas.getContext('2d');
        this.animationId = null;
        this.isPlaying = false;

        // Canvas optimization
        this.ctx.imageSmoothingEnabled = false;
        this.canvas.style.imageRendering = 'pixelated';
    }

    start() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.animate();
        }
    }

    stop() {
        this.isPlaying = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    animate = () => {
        if (!this.isPlaying) return;

        this.renderFrame();
        this.animationId = requestAnimationFrame(this.animate);
    }

    renderFrame() {
        const bufferLength = this.analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        this.analyserNode.getByteFrequencyData(dataArray);

        // Clear canvas with GPU acceleration
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Render bars
        const barWidth = (this.canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * this.canvas.height;

            // Use GPU-accelerated colors
            const hue = (i / bufferLength) * 360;
            this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
}

// GPU-accelerated particle system
class ParticleSystem {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.particles = [];
        this.options = {
            maxParticles: 100,
            particleSize: 2,
            speed: 2,
            ...options
        };

        this.animationId = null;
        this.isActive = false;
    }

    start() {
        if (!this.isActive) {
            this.isActive = true;
            this.animate();
        }
    }

    stop() {
        this.isActive = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    addParticle(x, y, vx, vy, color = '#ffffff') {
        if (this.particles.length >= this.options.maxParticles) {
            this.particles.shift(); // Remove oldest particle
        }

        this.particles.push({
            x, y, vx, vy, color,
            life: 1.0,
            size: this.options.particleSize
        });
    }

    animate = () => {
        if (!this.isActive) return;

        this.updateParticles();
        this.renderParticles();

        this.animationId = requestAnimationFrame(this.animate);
    }

    updateParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];

            // Update position
            particle.x += particle.vx;
            particle.y += particle.vy;

            // Update life
            particle.life -= 0.02;

            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    renderParticles() {
        // Clear with alpha for trail effect
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Render particles
        this.particles.forEach(particle => {
            this.ctx.globalAlpha = particle.life;
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size * particle.life, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.globalAlpha = 1.0;
    }
}

// Global animation engine instance
export const animationEngine = new AnimationEngine();

// Utility functions for common animations
export const animate = {
    // Fade in element
    fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        return animationEngine.animateTo(element, { opacity: 1 }, duration);
    },

    // Fade out element
    fadeOut(element, duration = 300) {
        return new Promise(resolve => {
            const animationId = animationEngine.animateTo(element, { opacity: 0 }, duration);
            setTimeout(() => {
                element.style.display = 'none';
                resolve(animationId);
            }, duration);
        });
    },

    // Slide in from direction
    slideIn(element, direction = 'left', duration = 300) {
        const transforms = {
            left: { translateX: -100 },
            right: { translateX: 100 },
            up: { translateY: -100 },
            down: { translateY: 100 }
        };

        const startTransform = transforms[direction] || transforms.left;
        element.style.transform = `translate(${startTransform.translateX || 0}px, ${startTransform.translateY || 0}px)`;
        element.style.opacity = '0';
        element.style.display = 'block';

        return animationEngine.animateTo(element, {
            translateX: 0,
            translateY: 0,
            opacity: 1
        }, duration);
    },

    // Scale animation
    scale(element, scale, duration = 300) {
        return animationEngine.animateTo(element, { scale }, duration);
    },

    // Bounce animation
    bounce(element, intensity = 1.2, duration = 500) {
        return animationEngine.springTo(element, { scale: intensity }, {
            stiffness: 200,
            damping: 10
        });
    }
};

// Export classes for advanced usage
export { VisualizerAnimation, ParticleSystem };