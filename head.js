import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";

const deg = (d) => (d * Math.PI) / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

const mount = document.getElementById("head");
const veil = document.getElementById("veil");
if (!mount) throw new Error("Missing #head");

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
} catch (_) {
  if (veil) veil.style.display = "none";
  throw new Error("WebGLRenderer failed");
}
if (!renderer.getContext()) {
  if (veil) veil.style.display = "none";
  throw new Error("No WebGL");
}

renderer.setClearColor(0x000000, 0);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.domElement.style.width = "100%";
renderer.domElement.style.height = "100%";
renderer.domElement.style.display = "block";
renderer.domElement.style.touchAction = "none";
mount.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 12.6);
camera.lookAt(0, 0, 0);

RectAreaLightUniformsLib.init();
const rectLight = new THREE.RectAreaLight(0xffffff, 3, 8, 5);
rectLight.position.set(2.4, 4, 5.5);
rectLight.lookAt(0, 0, 0);
scene.add(rectLight);

const studioMap = (() => {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#E3E3E3";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const spot = (x, y, radius, gray, alpha) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
    g.addColorStop(0, `rgba(${gray}, ${gray}, ${gray}, ${alpha})`);
    g.addColorStop(1, `rgba(${gray}, ${gray}, ${gray}, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  spot(384, 72, 130, 255, 0.95);
  spot(150, 58, 100, 235, 0.65);
  spot(260, 40, 70, 255, 0.45);
  spot(430, 190, 140, 18, 0.5);
  spot(70, 170, 120, 12, 0.45);
  spot(250, 210, 150, 8, 0.35);
  spot(330, 140, 90, 18, 0.4);
  spot(470, 110, 75, 12, 0.38);
  spot(30, 90, 80, 8, 0.32);
  const map = new THREE.CanvasTexture(canvas);
  map.mapping = THREE.EquirectangularReflectionMapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  return map;
})();

const pmrem = new THREE.PMREMGenerator(renderer);
const room = new RoomEnvironment();
const sphere = new THREE.SphereGeometry(80, 48, 24);
if (studioMap) {
  room.add(
    new THREE.Mesh(
      sphere,
      new THREE.MeshBasicMaterial({ map: studioMap, side: THREE.BackSide })
    )
  );
}
const env = pmrem.fromScene(room);
scene.environment = env.texture;
studioMap?.dispose();
room.dispose();
pmrem.dispose();

const head = new THREE.Group();
scene.add(head);

const material = new THREE.MeshStandardMaterial({
  color: 0xe7e7e7,
  metalness: 0.9,
  roughness: 0.2,
  envMapIntensity: 1.2
});

const maxYaw = deg(42);
const maxPitch = deg(28);
const refAspect = 16 / 9;
const baseHeightScale = 2.6 * 0.96 * 1.1 * 0.9 * 1.05 * 1.05;
const introDur = 0.8;
const introPitch = 0.5;
let yawGain = maxYaw;
const target = { yaw: 0, pitch: 0 };
let yaw = 0;
let pitch = 0;
let alive = true;
let modelReady = false;
let introDone = false;
let introT = 0;
let headModel = null;

function viewScale() {
  // Grow the head as the viewport shrinks (desktop 1 → phone ~1.55).
  const w = window.innerWidth;
  if (w >= 1100) return 1;
  if (w <= 390) return 1.55;
  return 1 + 0.55 * (1 - (w - 390) / (1100 - 390));
}

function applyHeadScale() {
  if (!headModel) return;
  const box = new THREE.Box3().setFromObject(headModel);
  const size = box.getSize(new THREE.Vector3());
  const heightScale = baseHeightScale * viewScale();
  headModel.scale.setScalar(heightScale / Math.max(size.y / headModel.scale.y, 1e-4));
}

const draco = new DRACOLoader();
draco.setDecoderPath("draco/");
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

loader.load(
  "models/head.glb",
  (gltf) => {
    if (!alive) return;
    const model = gltf.scene;
    model.traverse((obj) => {
      if (!obj.isMesh) return;
      if (!obj.geometry.getAttribute("normal")) obj.geometry.computeVertexNormals();
      obj.material = material;
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.position.y += 0.18;
    headModel = model;
    head.add(model);
    applyHeadScale();
    modelReady = true;
    if (reduced.matches) {
      introDone = true;
      introT = introDur;
      if (veil) veil.style.display = "none";
      window.__headIntroDone = true;
      window.dispatchEvent(new Event("headintrodone"));
    }
  },
  undefined,
  () => {
    if (veil) veil.style.display = "none";
    window.__headIntroDone = true;
    window.dispatchEvent(new Event("headintrodone"));
  }
);

function resize() {
  const w = Math.max(1, mount.clientWidth);
  const h = Math.max(1, mount.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  applyHeadScale();
  const halfFov = deg(35) / 2;
  yawGain =
    maxYaw *
    Math.min(
      1,
      (2 * Math.atan(Math.tan(halfFov) * camera.aspect)) /
        (2 * Math.atan(Math.tan(halfFov) * refAspect))
    );
}

function onPointer(e) {
  if (!introDone) return;
  target.yaw = clamp((e.clientX / window.innerWidth) * 2 - 1, -1, 1);
  target.pitch = clamp((e.clientY / window.innerHeight) * 2 - 1, -1, 1);
}

const clock = new THREE.Clock();
function frame() {
  if (!alive) return;
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);

  let pitchBias = 0;
  if (modelReady && !introDone) {
    introT += dt;
    const n = Math.min(introT / introDur, 1);
    if (veil) veil.style.opacity = String(1 - n);
    pitchBias = -(1 - easeOutCubic(n)) * introPitch;
    if (n >= 1) {
      introDone = true;
      if (veil) veil.style.display = "none";
      if (!window.__headIntroDone) {
        window.__headIntroDone = true;
        window.dispatchEvent(new Event("headintrodone"));
      }
    }
  }

  if (introDone) {
    yaw += (target.yaw * yawGain - yaw) * 0.12;
    pitch += (target.pitch * maxPitch - pitch) * 0.12;
  }

  head.rotation.y = yaw;
  head.rotation.x = pitch + pitchBias;

  if (!reduced.matches) {
    const compact = mount.clientWidth < 140;
    const floatAmp = compact ? 0.03 : 0.07;
    head.position.y = floatAmp * Math.sin(0.9 * clock.elapsedTime);
    scene.environmentRotation.y += 0.15 * dt;
  } else {
    head.position.y = 0;
  }
  renderer.render(scene, camera);
}

resize();
const ro = new ResizeObserver(resize);
ro.observe(mount);
window.addEventListener("pointermove", onPointer, { passive: true });
requestAnimationFrame(frame);
