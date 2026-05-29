/* ═══════════════════════════════════════════════════════════════
   ASL — Abstream Sports League · 100% Color-Accurate 3D Logo
   ═══════════════════════════════════════════════════════════════ */

(function () {
  const container = document.querySelector('.hero-logo-3d-container');
  const canvas = document.getElementById('asl-3d-logo-canvas');
  if (!container || !canvas) return;

  // ── Setup Scene, Camera & Renderer ──
  const scene = new THREE.Scene();
  
  // Perspective Camera
  const camera = new THREE.PerspectiveCamera(
    36, // Field of View
    container.clientWidth / container.clientHeight, // Aspect Ratio
    0.1, // Near plane
    100 // Far plane
  );
  camera.position.set(0, 0, 3.8);

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,         // Fully transparent canvas background
    antialias: true,     // Smooth geometry edges
    powerPreference: "high-performance"
  });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // ── Load Texture & Preprocess to Transparent Canvas ──
  const loader = new THREE.TextureLoader();
  let logoMesh = null;

  loader.load(
    'assets/logo-3d.jpg',
    function (texture) {
      // 1. Preprocess the loaded JPG image using an offscreen canvas to strip the black background
      const img = texture.image;
      const processCanvas = document.createElement('canvas');
      processCanvas.width = img.width;
      processCanvas.height = img.height;
      const ctx = processCanvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imgData = ctx.getImageData(0, 0, processCanvas.width, processCanvas.height);
      const data = imgData.data;

      // Extract colors and build an alpha channel mask based on luminance
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard luminance calculation
        const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

        // Threshold parameters for background subtraction & anti-aliased edge smoothing
        const minLuminance = 15;   // Below this is solid black background (fully transparent)
        const maxLuminance = 55;   // Above this is bright metallic gold/silver (fully opaque)

        if (brightness < minLuminance) {
          data[i + 3] = 0; // Alpha = 0 (completely transparent)
        } else if (brightness < maxLuminance) {
          // Smooth blend alpha interpolation to prevent jagged pixelation
          const factor = (brightness - minLuminance) / (maxLuminance - minLuminance);
          data[i + 3] = Math.floor(factor * 255);
        } else {
          data[i + 3] = 255; // Alpha = 255 (fully opaque)
        }
      }

      ctx.putImageData(imgData, 0, 0);

      // 2. Instantiate a clean CanvasTexture from the processed canvas
      const transparentTexture = new THREE.CanvasTexture(processCanvas);
      transparentTexture.minFilter = THREE.LinearMipmapLinearFilter;
      transparentTexture.magFilter = THREE.LinearFilter;
      transparentTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      // Setup 1:1 Aspect ratio square geometry
      const size = 1.95;
      const geometry = new THREE.PlaneGeometry(size, size, 1, 1);

      // self-illuminating basic material to guarantee 100% color fidelity to the original asset.
      // This is completely unaffected by scene lights, preserving original warm gold gradients & chrome reflections.
      const material = new THREE.MeshBasicMaterial({
        map: transparentTexture,              // Diffuse color from processed canvas
        transparent: true,                    // Active alpha transparency
        side: THREE.DoubleSide
      });

      logoMesh = new THREE.Mesh(geometry, material);
      logoMesh.position.set(0, 0.02, 0);
      scene.add(logoMesh);

      // Clean up local raw texture data references
      texture.dispose();

      // Trigger initial resize calibration
      window.dispatchEvent(new Event('resize'));
    },
    undefined,
    function (err) {
      console.error('ASL 3D Logo: Failed to load logo texture.', err);
    }
  );

  // ── Interactivity & Parallax ──
  let mouseX = 0;
  let mouseY = 0;
  let targetRotationX = 0;
  let targetRotationY = 0;

  const heroSection = document.getElementById('hero');
  if (heroSection) {
    heroSection.addEventListener('mousemove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Parallax rotation targets
      targetRotationX = mouseY * 0.35;
      targetRotationY = mouseX * 0.40;
    });

    // Smooth reset on mouse leave
    heroSection.addEventListener('mouseleave', () => {
      mouseX = 0;
      mouseY = 0;
      targetRotationX = 0;
      targetRotationY = 0;
    });
  }

  // ── Animation & Render Loop ──
  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const time = clock.getElapsedTime();

    if (logoMesh) {
      // 1. Sinusoidal low-gravity floating animation
      logoMesh.position.y = Math.sin(time * 1.4) * 0.09 + 0.01;

      // 2. Slow horizontal auto-sweeping
      // Restricted to a narrow arc to preserve readability and hide the mirrored back side
      const autoSweepY = Math.sin(time * 0.45) * 0.18;

      // 3. Apply smooth lerped rotations on X, Y, and Z axes
      logoMesh.rotation.x += (targetRotationX - logoMesh.rotation.x) * 0.055;
      logoMesh.rotation.y += ((targetRotationY + autoSweepY) - logoMesh.rotation.y) * 0.055;
      logoMesh.rotation.z += (-mouseX * 0.10 - logoMesh.rotation.z) * 0.055;

      // 4. Subtle scale pulse (breathing effect)
      const pulse = 1.0 + Math.sin(time * 1.6) * 0.012;
      logoMesh.scale.set(pulse, pulse, pulse);
    }

    renderer.render(scene, camera);
  }

  animate();

  // ── Responsive Scale & Distance Handler ──
  window.addEventListener('resize', () => {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Handle screen distance scaling to ensure card looks centered on smaller viewports
    if (logoMesh) {
      if (window.innerWidth < 480) {
        camera.position.z = 4.3;
      } else if (window.innerWidth < 768) {
        camera.position.z = 4.0;
      } else {
        camera.position.z = 3.8;
      }
    }
  });

  // Resources Disposal Hooks
  window.destroyThreeLogo = function() {
    renderer.dispose();
    if (logoMesh) {
      logoMesh.geometry.dispose();
      logoMesh.material.dispose();
    }
  };
})();
