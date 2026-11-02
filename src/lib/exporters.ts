import * as THREE from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { OBJExporter } from "three/examples/jsm/exporters/OBJExporter.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export type ExportFormat = "stl" | "obj" | "glb";

export const FORMATS: { id: ExportFormat; label: string; hint: string }[] = [
  { id: "stl", label: "STL", hint: "3D printing (millimetres)" },
  { id: "obj", label: "OBJ", hint: "Blender, CAD and most 3D apps" },
  { id: "glb", label: "GLB", hint: "Web, AR, games (with colours)" },
];

export function fileNameFor(name: string, format: ExportFormat): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "shapesmith-design";
  return `${base}.${format}`;
}

/** Serialises the model. STL and OBJ are in millimetres; GLB uses metres (the glTF standard). */
export async function exportModel(object: THREE.Object3D, format: ExportFormat): Promise<Uint8Array> {
  object.updateMatrixWorld(true);
  if (format === "stl") {
    const data = new STLExporter().parse(object, { binary: true }) as DataView;
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (format === "obj") {
    return new TextEncoder().encode(new OBJExporter().parse(object));
  }
  const scaled = new THREE.Group();
  scaled.scale.setScalar(0.001);
  scaled.add(object.clone());
  const result = await new GLTFExporter().parseAsync(scaled, { binary: true });
  return new Uint8Array(result as ArrayBuffer);
}
