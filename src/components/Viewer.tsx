import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

interface Props {
  object: THREE.Object3D | null;
}

interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  grid: THREE.GridHelper | null;
  current: THREE.Object3D | null;
}

/** Interactive 3D view: drag to rotate, scroll / pinch to zoom, right-drag / two fingers to pan. */
export default function Viewer({ object }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const stage = useRef<Stage | null>(null);

  useEffect(() => {
    const el = host.current!;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(1, 2, 1.5);
    scene.add(sun, new THREE.AmbientLight(0xffffff, 0.25));

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100000);
    camera.position.set(150, 120, 180);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    stage.current = { renderer, scene, camera, controls, grid: null, current: null };

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = el;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    let frame = 0;
    const loop = () => {
      frame = requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    };
    loop();

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      stage.current = null;
    };
  }, []);

  useEffect(() => {
    const s = stage.current;
    if (!s) return;
    if (s.current) s.scene.remove(s.current);
    if (s.grid) {
      s.scene.remove(s.grid);
      s.grid.dispose();
      s.grid = null;
    }
    s.current = object;
    if (!object) return;
    s.scene.add(object);

    // Frame the model and size the grid (1 cell = 10 mm, or 100 mm for big models).
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 1);
    const cell = radius > 300 ? 100 : 10;
    const extent = Math.ceil((radius * 3) / cell) * cell;
    const grid = new THREE.GridHelper(extent * 2, (extent * 2) / cell, 0x7f8a99, 0x4a5260);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.35;
    grid.position.y = Math.min(box.min.y, 0);
    s.scene.add(grid);
    s.grid = grid;

    const dist = radius / Math.sin(THREE.MathUtils.degToRad(s.camera.fov / 2)) * 1.1;
    const dir = new THREE.Vector3(0.9, 0.7, 1.1).normalize();
    s.camera.position.copy(center).addScaledVector(dir, dist);
    s.camera.near = dist / 100;
    s.camera.far = dist * 100;
    s.camera.updateProjectionMatrix();
    s.controls.target.copy(center);
    s.controls.update();
  }, [object]);

  return <div className="viewer" ref={host} />;
}
