import React, { useEffect, useRef, useState } from 'react';

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute float a_size;
  attribute float a_alpha;
  
  uniform vec2 u_resolution;
  
  varying float v_alpha;

  void main() {
    // Convert Position from pixels to 0.0 -> 1.0
    vec2 zeroToOne = a_position / u_resolution;
    
    // Convert from 0->1 to 0->2
    vec2 zeroToTwo = zeroToOne * 2.0;
    
    // Convert from 0->2 to -1->+1 (clipspace)
    vec2 clipSpace = zeroToTwo - 1.0;
    
    // Flip Y axis (canvas 0,0 is top/left, clipspace 0,0 is center, +Y is up)
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    
    gl_PointSize = a_size;
    v_alpha = a_alpha;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  
  varying float v_alpha;
  uniform vec3 u_color;

  void main() {
    // Circular particle
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);
    
    if (dist > 0.5) {
      discard;
    }
    
    // Soften edge
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    gl_FragColor = vec4(u_color, alpha * v_alpha);
  }
`;

const ParticleLogo = ({
  logoSrc = "https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg", // Default React Logo
  particleColor = [100, 200, 255], // RGB
  particleSize = 2.0,
  distortionRadius = 80,
  forceStrength = 5.0,
  returnSpeed = 0.05,
  friction = 0.90,
  clickStrength = 50.0,
  enableWobble = true,
  returnDelay = 0,
  pixelStep = 4
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const requestRef = useRef(null);
  const imgRef = useRef(null); // Store loaded image
  
  // State for particles
  const particlesRef = useRef([]); // { x, y, ox, oy, vx, vy, alpha }
  const mouseRef = useRef({ x: -9999, y: -9999, isDown: false });

  // Store dynamic params
  const paramsRef = useRef({
      distortionRadius,
      particleColor,
      forceStrength,
      clickStrength,
      particleSize,
      enableWobble,
      returnDelay
  });

  // Update paramsRef
  useEffect(() => {
      paramsRef.current = {
          distortionRadius,
          particleColor,
          forceStrength,
          clickStrength,
          particleSize,
          enableWobble,
          returnDelay
      };
  }, [distortionRadius, particleColor, forceStrength, clickStrength, particleSize, enableWobble, returnDelay]);

  // WebGL Context Refs
  const glRef = useRef(null);
  const programRef = useRef(null);
  const bufferRef = useRef(null);
  const positionLocationRef = useRef(null);
  const sizeLocationRef = useRef(null);
  const alphaLocationRef = useRef(null);
  const resolutionLocationRef = useRef(null);
  const colorLocationRef = useRef(null);

  useEffect(() => {
    // 1. Initialize logic
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = logoSrc;
    
    const startApp = () => {
        imgRef.current = img;
        init(img);
    };
    
    img.onload = startApp;
    img.onerror = () => {
        console.warn("Failed to load logoSrc, falling back to placeholder.");
        img.src = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI0MCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=";
    };

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [logoSrc]);

  // Re-generate particles when density changes
  useEffect(() => {
      if (imgRef.current && canvasRef.current) {
          generateParticles(imgRef.current, canvasRef.current.width, canvasRef.current.height);
      }
  }, [pixelStep]);

  const init = (image) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // --- WebGL Setup ---
    const gl = canvas.getContext('webgl', { alpha: true, preserveDrawingBuffer: false });
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }
    glRef.current = gl;

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Creates Shader Program
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    programRef.current = program;
    gl.useProgram(program);

    // Look up locations
    positionLocationRef.current = gl.getAttribLocation(program, "a_position");
    sizeLocationRef.current = gl.getAttribLocation(program, "a_size");
    alphaLocationRef.current = gl.getAttribLocation(program, "a_alpha");
    resolutionLocationRef.current = gl.getUniformLocation(program, "u_resolution");
    colorLocationRef.current = gl.getUniformLocation(program, "u_color");

    // Create Buffer
    bufferRef.current = gl.createBuffer();

    // --- Generate Particles from Image ---
    generateParticles(image, canvas.width, canvas.height);

    // --- Resize Handler ---
    handleResize(); // Initial sizing
    window.addEventListener('resize', handleResize);

    // --- Start Animation Loop ---
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    animate();
  };

  const createShader = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const createProgram = (gl, vsSource, fsSource) => {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return null;
    }
    return program;
  };

  const generateParticles = (image, canvasW, canvasH) => {
    // Draw image to hidden canvas to read pixels
    const tmpCanvas = document.createElement('canvas');
    const ctx = tmpCanvas.getContext('2d');
    
    // Scale image to fit reasonably within the view, preserving aspect ratio
    const maxSize = Math.min(window.innerWidth, window.innerHeight) * 0.8;
    const scale = Math.min(maxSize / image.width, maxSize / image.height);
    const w = Math.floor(image.width * scale);
    const h = Math.floor(image.height * scale);
    
    tmpCanvas.width = w;
    tmpCanvas.height = h;
    
    // Center logic
    const offsetX = (window.innerWidth - w) / 2;
    const offsetY = (window.innerHeight - h) / 2;

    ctx.drawImage(image, 0, 0, w, h);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const particles = [];
    const step = pixelStep; // Use dynamic step

    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const index = (y * w + x) * 4;
        const alpha = data[index + 3];
        
        if (alpha > 20) {
           particles.push({
             x: offsetX + x,
             y: offsetY + y,
             ox: offsetX + x, // Original X
             oy: offsetY + y, // Original Y
             vx: 0,
             vy: 0,
             alpha: alpha / 255,
             lastInteraction: 0 // Track time
           });
        }
      }
    }
    console.log(`Particles generated: ${particles.length}`);
    particlesRef.current = particles;
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    if (!canvas || !glRef.current) return;
    
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
      glRef.current.viewport(0, 0, canvas.width, canvas.height);
    }
  };

  const animate = () => {
    const gl = glRef.current;
    const particles = particlesRef.current;
    
    if (!gl || !particles.length) {
        requestRef.current = requestAnimationFrame(animate);
        return;
    }

    const vertexData = new Float32Array(particles.length * 4);
    
    const mx = mouseRef.current.x;
    const my = mouseRef.current.y;
    const isClicking = mouseRef.current.isDown;
    const now = performance.now();
    
    // Deconstruct all params including new ones
    const { 
        distortionRadius, 
        forceStrength, 
        clickStrength, 
        particleColor, 
        particleSize,
        enableWobble,
        returnDelay
    } = paramsRef.current;
    
    const currentStrength = isClicking ? clickStrength : forceStrength;
    const currentRadius = distortionRadius;

    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        
        // 1. Calculate Distance to Mouse
        const dx = mx - p.x;
        const dy = my - p.y;
        const distSq = dx*dx + dy*dy;
        const dist = Math.sqrt(distSq);
        
        // 2. Mouse Interaction Force (Repulsion)
        if (dist < currentRadius) {
            const force = (currentRadius - dist) / currentRadius;
            const angle = Math.atan2(dy, dx);
            const push = force * currentStrength;
            
            p.vx -= Math.cos(angle) * push;
            p.vy -= Math.sin(angle) * push;
            
            p.lastInteraction = now; // Mark as interacted
        }

        // 3. Spring/Homing Force
        // Check delay
        const timeSinceInteraction = now - p.lastInteraction;
        
        if (timeSinceInteraction > returnDelay) {
            const dxHome = p.ox - p.x;
            const dyHome = p.oy - p.y;
            
            if (enableWobble) {
                // Spring Physics (Velocity builds up -> Overshoot -> Wobbly)
                p.vx += dxHome * returnSpeed;
                p.vy += dyHome * returnSpeed;
                
                // Normal Friction
                p.vx *= friction;
                p.vy *= friction;
            } else {
                // No Wobble (Critical Damping / Easing)
                // We dampen velocity heavily and add a LERP-like force
                p.vx += dxHome * returnSpeed;
                p.vy += dyHome * returnSpeed;
                
                // Heavy friction to prevent wobble/overshoot
                p.vx *= 0.50; 
                p.vy *= 0.50;
            }
        } else {
             // Waiting for delay - apply friction to drift slowly or just stop
             p.vx *= 0.90;
             p.vy *= 0.90;
        }

        // 5. Update Position
        p.x += p.vx;
        p.y += p.vy;

        // Fill Buffer Data
        const infoIndex = i * 4;
        vertexData[infoIndex + 0] = p.x;
        vertexData[infoIndex + 1] = p.y;
        vertexData[infoIndex + 2] = particleSize; 
        vertexData[infoIndex + 3] = p.alpha;
    }

    // --- Render ---
    gl.clearColor(0.0, 0.0, 0.0, 0.0); // Transparent bg
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programRef.current);
    
    // Set Uniforms
    if (canvasRef.current) {
        gl.uniform2f(resolutionLocationRef.current, canvasRef.current.width, canvasRef.current.height);
    }
    // Use dynamic color from ref
    gl.uniform3f(colorLocationRef.current, particleColor[0]/255, particleColor[1]/255, particleColor[2]/255);

    // Bind Buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferRef.current);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.DYNAMIC_DRAW);

    // Attribute Pointers
    const stride = 4 * 4; // 4 bytes per float
    
    gl.enableVertexAttribArray(positionLocationRef.current);
    gl.vertexAttribPointer(positionLocationRef.current, 2, gl.FLOAT, false, stride, 0);
    
    gl.enableVertexAttribArray(sizeLocationRef.current);
    gl.vertexAttribPointer(sizeLocationRef.current, 1, gl.FLOAT, false, stride, 2 * 4);
    
    gl.enableVertexAttribArray(alphaLocationRef.current);
    gl.vertexAttribPointer(alphaLocationRef.current, 1, gl.FLOAT, false, stride, 3 * 4);

    // Draw
    gl.drawArrays(gl.POINTS, 0, particles.length);

    requestRef.current = requestAnimationFrame(animate);
  };
  
  // Mouse Handling
  const handleMouseMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.x = e.clientX - rect.left;
    mouseRef.current.y = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;
    mouseRef.current.isDown = false;
  };
  
  const handleMouseDown = () => {
      mouseRef.current.isDown = true;
  }
  
  const handleMouseUp = () => {
      mouseRef.current.isDown = false;
  }

  return (
    <div 
        ref={containerRef} 
        className="w-full h-full relative"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        className="block cursor-default touch-none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default ParticleLogo;
