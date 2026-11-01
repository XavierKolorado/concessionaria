import {
  ACESFilmicToneMapping,
  Box3,
  Color,
  DirectionalLight,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshDepthMaterial,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PropertyBinding,
  RingGeometry,
  Scene,
  ShaderMaterial,
  Spherical,
  SpotLight,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { HorizontalBlurShader } from "three/addons/shaders/HorizontalBlurShader.js";
import { VerticalBlurShader } from "three/addons/shaders/VerticalBlurShader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const CAR_SPAN = 4.7;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function buildEnvironment(renderer, quality) {
  const env = new Scene();
  env.background = new Color("#030303");
  const geo = new PlaneGeometry(1, 1);
  const add = (geometry, intensity, position, rotation, scale, color = "#ffffff") => {
    const mat = new MeshBasicMaterial({ color: new Color(color).multiplyScalar(intensity), side: 2, toneMapped: false });
    const mesh = new Mesh(geometry, mat);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(...scale);
    env.add(mesh);
  };
  add(geo, 3.2, [0, 6, 0], [Math.PI / 2, 0, 0], [12, 2.4, 1]);
  add(geo, 1.2, [0, 4, -6], [Math.PI / 4, 0, 0], [14, 1, 1]);
  add(geo, 6, [-7, 1.2, 0], [0, Math.PI / 2, 0], [16, 0.35, 1]);
  add(geo, 2.6, [7, 2.2, 1], [0, -Math.PI / 2, 0], [12, 1.2, 1]);
  add(geo, 1.6, [0, 1.5, 9], [0, Math.PI, 0], [10, 0.5, 1]);
  const ring = new RingGeometry(0.5, 1, 64);
  add(ring, 1.2, [4, 3, -8], [0, 0, 0], [4, 4, 4], "#9b1d26");

  const pmrem = new PMREMGenerator(renderer);
  const target = pmrem.fromScene(env, quality === "high" ? 0.02 : 0.04);
  pmrem.dispose();
  env.traverse((o) => {
    o.geometry?.dispose();
    o.material?.dispose();
  });
  return target;
}

function createContactShadow(renderer, scene, { size = 14, far = 2.4, blur = 2.6, opacity = 0.85, resolution = 1024 }) {
  const group = new Group();
  group.position.y = 0.002;

  const rt = new WebGLRenderTarget(resolution, resolution);
  const rtBlur = new WebGLRenderTarget(resolution, resolution);
  rt.texture.generateMipmaps = rtBlur.texture.generateMipmaps = false;

  const planeGeometry = new PlaneGeometry(size, size).rotateX(Math.PI / 2);
  const plane = new Mesh(
    planeGeometry,
    new MeshBasicMaterial({ map: rt.texture, opacity, transparent: true, depthWrite: false })
  );
  plane.renderOrder = 1;
  plane.scale.y = -1;
  group.add(plane);

  const blurPlane = new Mesh(planeGeometry);
  blurPlane.visible = false;
  group.add(blurPlane);

  const camera = new OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0, far);
  camera.rotation.x = Math.PI / 2;
  group.add(camera);

  const depth = new MeshDepthMaterial();
  depth.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      "gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );",
      "gl_FragColor = vec4( vec3( 0.0 ), 1.0 - fragCoordZ );"
    );
  };
  depth.depthTest = depth.depthWrite = false;

  const hBlur = new ShaderMaterial(HorizontalBlurShader);
  const vBlur = new ShaderMaterial(VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;

  const blurPass = (amount) => {
    blurPlane.visible = true;
    blurPlane.material = hBlur;
    hBlur.uniforms.tDiffuse.value = rt.texture;
    hBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(rtBlur);
    renderer.render(blurPlane, camera);
    blurPlane.material = vBlur;
    vBlur.uniforms.tDiffuse.value = rtBlur.texture;
    vBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(rt);
    renderer.render(blurPlane, camera);
    blurPlane.visible = false;
  };

  const bake = () => {
    const background = scene.background;
    const environment = scene.environment;
    scene.background = null;
    scene.environment = null;
    plane.visible = false;
    scene.overrideMaterial = depth;
    const clearAlpha = renderer.getClearAlpha();
    renderer.setClearAlpha(0);
    renderer.setRenderTarget(rt);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    blurPass(blur);
    blurPass(blur * 0.4);
    renderer.setRenderTarget(null);
    renderer.setClearAlpha(clearAlpha);
    plane.visible = true;
    scene.background = background;
    scene.environment = environment;
  };

  const dispose = () => {
    rt.dispose();
    rtBlur.dispose();
    planeGeometry.dispose();
    plane.material.dispose();
    depth.dispose();
    hBlur.dispose();
    vBlur.dispose();
  };

  return { group, bake, dispose };
}

async function applyVariant(gltf, variantName) {
  const ext = gltf.userData?.gltfExtensions?.KHR_materials_variants;
  if (!ext) return;
  const index = ext.variants.findIndex((v) => v.name === variantName);
  const meshes = [];
  gltf.scene.traverse((o) => {
    if (o.isMesh && o.userData.gltfExtensions?.KHR_materials_variants) meshes.push(o);
  });
  await Promise.all(
    meshes.map(async (mesh) => {
      if (!mesh.userData.originalMaterial) mesh.userData.originalMaterial = mesh.material;
      const mapping = mesh.userData.gltfExtensions.KHR_materials_variants.mappings.find((m) =>
        m.variants.includes(index)
      );
      if (mapping) {
        mesh.material = await gltf.parser.getDependency("material", mapping.material);
        gltf.parser.assignFinalMaterial(mesh);
      } else {
        mesh.material = mesh.userData.originalMaterial;
      }
    })
  );
}

export function loadCar(src, onProgress) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new Promise((resolve, reject) => {
    loader.load(
      src,
      resolve,
      (e) => e.lengthComputable && onProgress?.((e.loaded / e.total) * 100),
      reject
    );
  });
}

export function prepareCar(gltf, hiddenMeshes = []) {
  const names = hiddenMeshes.map((n) => PropertyBinding.sanitizeNodeName(n));
  gltf.scene.traverse((o) => {
    if (names.includes(o.name)) o.visible = false;
  });
  const box = new Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new Vector3());
  gltf.scene.position.set(-center.x, -box.min.y, -center.z);
  return gltf;
}

export function createStudio(container, { quality = "high", preserveDrawingBuffer = false } = {}) {
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality === "high" ? 1.75 : 1.25));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.debug.checkShaderErrors = false;
  container.appendChild(renderer.domElement);

  const scene = new Scene();
  const envTarget = buildEnvironment(renderer, quality);
  scene.environment = envTarget.texture;

  const spot = new SpotLight("#ffffff", 90, 0, 0.42, 1);
  spot.position.set(0, 9, 2);
  scene.add(spot, spot.target);
  const fill = new DirectionalLight("#c9d0db", 0.9);
  fill.position.set(-6, 3, -4);
  scene.add(fill);

  const shadow = createContactShadow(renderer, scene, { resolution: quality === "high" ? 1024 : 512 });
  scene.add(shadow.group);

  const dispose = () => {
    shadow.dispose();
    envTarget.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };

  return { renderer, scene, shadow, dispose, applyVariant };
}

export async function createHeroScene(container, options) {
  const { src, hiddenMeshes, variant, quality, compact, reducedMotion, onProgress } = options;
  const studio = createStudio(container, { quality });
  const { renderer, scene } = studio;

  const camera = new PerspectiveCamera(compact ? 34 : 28, 1, 0.1, 80);
  const target = new Vector3(0, compact ? 1.05 : 0.75, 0.15);

  let gltf;
  try {
    gltf = prepareCar(await loadCar(src, onProgress), hiddenMeshes);
    await applyVariant(gltf, variant);
  } catch (err) {
    studio.dispose();
    throw err;
  }
  scene.add(gltf.scene);
  studio.shadow.bake();

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enablePan = false;
  controls.enableZoom = true;
  controls.zoomSpeed = 0.6;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.rotateSpeed = 0.55;
  renderer.domElement.style.touchAction = "pan-y";

  const blockWheel = (e) => e.stopPropagation();
  container.addEventListener("wheel", blockWheel, { capture: true });

  const restTheta = 0.72;
  const restPhi = 1.4;
  let restRadius = 10;
  let nearRadius = 6.8;
  let zoomed = false;
  let zooming = false;
  let introStart = null;
  let introDone = reducedMotion;
  const pointer = { x: 0, y: 0 };
  const parallax = { x: 0, y: 0 };
  const spherical = new Spherical();
  const offset = new Vector3();

  const layout = () => {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    const aspect = camera.aspect;
    const fill = compact ? 0.96 : aspect > 1.9 ? 0.5 : width < 1200 && aspect > 1.1 ? 0.44 : 0.58;
    const fit = CAR_SPAN / fill / 2 / (Math.tan(MathUtils.degToRad(camera.fov / 2)) * aspect);
    restRadius = MathUtils.clamp(fit, 8.5, 18);
    nearRadius = restRadius * 0.68;
    controls.minDistance = nearRadius - 1;
    controls.maxDistance = restRadius + 2;
    controls.minPolarAngle = compact ? restPhi : 0.95;
    controls.maxPolarAngle = compact ? restPhi : 1.48;
    zooming = true;
  };
  layout();

  const startTheta = reducedMotion ? restTheta : -0.55;
  const startRadius = reducedMotion ? restRadius : restRadius * 1.45;
  camera.position.setFromSpherical(new Spherical(startRadius, restPhi, startTheta)).add(target);
  camera.lookAt(target);
  scene.environmentIntensity = reducedMotion ? 1 : 0.05;
  controls.update();

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(container);

  const onPointer = (e) => {
    const r = container.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  container.addEventListener("pointermove", onPointer);

  let visible = true;
  const visibility = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  });
  visibility.observe(container);

  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const delta = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (!visible) return;

    if (!introDone) {
      if (introStart === null) introStart = now;
      const t = Math.min((now - introStart) / 2600, 1);
      const k = easeOutCubic(t);
      const theta = MathUtils.lerp(-0.55, restTheta, k);
      const radius = MathUtils.lerp(restRadius * 1.45, restRadius, k);
      camera.position.setFromSpherical(new Spherical(radius, restPhi, theta)).add(target);
      scene.environmentIntensity = MathUtils.lerp(0.05, 1, k);
      if (t >= 1) introDone = true;
    } else {
      if (zooming) {
        offset.copy(camera.position).sub(controls.target);
        spherical.setFromVector3(offset);
        const wanted = zoomed ? nearRadius : restRadius;
        spherical.radius = MathUtils.damp(spherical.radius, wanted, 4, delta);
        if (Math.abs(spherical.radius - wanted) < 0.01) zooming = false;
        camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
      }
      if (!reducedMotion && !compact) {
        parallax.x = MathUtils.damp(parallax.x, pointer.x * 0.35, 2.5, delta);
        parallax.y = MathUtils.damp(parallax.y, pointer.y * 0.12, 2.5, delta);
        controls.target.set(target.x - parallax.x, target.y - parallax.y, target.z);
      }
    }
    controls.update();
    renderer.render(scene, camera);
  });

  return {
    setVariant: (name) => applyVariant(gltf, name),
    setZoom: (value) => {
      zoomed = value;
      zooming = true;
    },
    dispose: () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      visibility.disconnect();
      container.removeEventListener("wheel", blockWheel, { capture: true });
      container.removeEventListener("pointermove", onPointer);
      controls.dispose();
      studio.dispose();
    },
  };
}
