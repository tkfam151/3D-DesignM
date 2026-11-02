/**
 * The design format Claude returns, and the code that turns it into three.js geometry.
 *
 * A design is an ordered list of parts. Each part is a primitive shape that is either
 * added to the model or subtracted from everything added before it (for holes, slots,
 * hollowing). Units are millimetres, +Y is up, and the model rests on the ground (y = 0).
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { Brush, Evaluator, ADDITION, SUBTRACTION } from "three-bvh-csg";

export const SHAPES = [
  "box",
  "rounded_box",
  "sphere",
  "cylinder",
  "cone",
  "torus",
  "capsule",
  "extrusion",
  "lathe",
] as const;
export type Shape = (typeof SHAPES)[number];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Part {
  name: string;
  shape: Shape;
  operation: "add" | "subtract";
  color: string;
  position: Vec3;
  rotation: Vec3;
  size: {
    width: number;
    height: number;
    depth: number;
    radius: number;
    radius_top: number;
    radius_bottom: number;
    tube: number;
    length: number;
  };
  profile: { x: number; y: number }[];
}

export interface Design {
  name: string;
  description: string;
  parts: Part[];
}

export interface DesignResponse {
  reply: string;
  suggestions: string[];
  design: Design;
}

const num = { type: "number" } as const;
const vec3 = {
  type: "object",
  properties: { x: num, y: num, z: num },
  required: ["x", "y", "z"],
  additionalProperties: false,
} as const;

/** JSON schema used with structured outputs, so every reply parses. */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description: "Short, friendly message to the user about what you made or changed.",
    },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "Two to four short follow-up ideas the user could tap next.",
    },
    design: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        parts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              shape: { type: "string", enum: [...SHAPES] },
              operation: { type: "string", enum: ["add", "subtract"] },
              color: { type: "string", description: "Hex colour such as #8fa3b8" },
              position: vec3,
              rotation: { ...vec3, description: "Euler angles in degrees, applied in XYZ order" },
              size: {
                type: "object",
                properties: {
                  width: num,
                  height: num,
                  depth: num,
                  radius: num,
                  radius_top: num,
                  radius_bottom: num,
                  tube: num,
                  length: num,
                },
                required: [
                  "width",
                  "height",
                  "depth",
                  "radius",
                  "radius_top",
                  "radius_bottom",
                  "tube",
                  "length",
                ],
                additionalProperties: false,
              },
              profile: {
                type: "array",
                items: {
                  type: "object",
                  properties: { x: num, y: num },
                  required: ["x", "y"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "name",
              "shape",
              "operation",
              "color",
              "position",
              "rotation",
              "size",
              "profile",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["name", "description", "parts"],
      additionalProperties: false,
    },
  },
  required: ["reply", "suggestions", "design"],
  additionalProperties: false,
} as const;

const SEGMENTS = 64;
const pos = (n: number, fallback: number) => (Number.isFinite(n) && n > 0 ? n : fallback);

function geometryFor(part: Part): THREE.BufferGeometry {
  const s = part.size;
  switch (part.shape) {
    case "box":
      return new THREE.BoxGeometry(pos(s.width, 10), pos(s.height, 10), pos(s.depth, 10));
    case "rounded_box": {
      const w = pos(s.width, 10);
      const h = pos(s.height, 10);
      const d = pos(s.depth, 10);
      const r = Math.min(pos(s.radius, 1), Math.min(w, h, d) / 2 - 0.001);
      return new RoundedBoxGeometry(w, h, d, 4, Math.max(r, 0.001));
    }
    case "sphere":
      return new THREE.SphereGeometry(pos(s.radius, 5), SEGMENTS, SEGMENTS / 2);
    case "cylinder": {
      const r = pos(s.radius, 5);
      const top = s.radius_top > 0 ? s.radius_top : r;
      const bottom = s.radius_bottom > 0 ? s.radius_bottom : r;
      return new THREE.CylinderGeometry(top, bottom, pos(s.height, 10), SEGMENTS);
    }
    case "cone":
      return new THREE.ConeGeometry(
        pos(s.radius_bottom, pos(s.radius, 5)),
        pos(s.height, 10),
        SEGMENTS,
      );
    case "torus": {
      const g = new THREE.TorusGeometry(pos(s.radius, 10), pos(s.tube, 2), SEGMENTS / 2, SEGMENTS);
      g.rotateX(Math.PI / 2); // lie flat: ring axis along +Y
      return g;
    }
    case "capsule":
      return new THREE.CapsuleGeometry(pos(s.radius, 5), pos(s.length, 10), 16, SEGMENTS);
    case "extrusion": {
      const pts = part.profile.map((p) => new THREE.Vector2(p.x, p.y));
      if (pts.length < 3) return new THREE.BoxGeometry(10, 10, 10);
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), {
        depth: pos(s.depth, 10),
        bevelEnabled: false,
        curveSegments: 24,
      });
      g.translate(0, 0, -pos(s.depth, 10) / 2);
      return g;
    }
    case "lathe": {
      const pts = part.profile.map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
      if (pts.length < 2) return new THREE.SphereGeometry(5);
      return new THREE.LatheGeometry(pts, SEGMENTS);
    }
    default:
      return new THREE.BoxGeometry(10, 10, 10);
  }
}

function materialFor(color: string): THREE.MeshStandardMaterial {
  const c = new THREE.Color();
  try {
    c.set(/^#?[0-9a-f]{6}$/i.test(color) ? (color.startsWith("#") ? color : `#${color}`) : "#9aa7b4");
  } catch {
    c.set("#9aa7b4");
  }
  return new THREE.MeshStandardMaterial({
    color: c,
    roughness: 0.55,
    metalness: 0.08,
    side: THREE.DoubleSide,
  });
}

function placed<T extends THREE.Mesh>(mesh: T, part: Part): T {
  const d = THREE.MathUtils.DEG2RAD;
  mesh.position.set(part.position.x || 0, part.position.y || 0, part.position.z || 0);
  mesh.rotation.set((part.rotation.x || 0) * d, (part.rotation.y || 0) * d, (part.rotation.z || 0) * d);
  mesh.updateMatrixWorld(true);
  return mesh;
}

/**
 * Build a three.js object for a design. Without subtract parts every part stays a
 * separate mesh (fast, keeps names). With subtract parts the parts are combined in
 * order with constructive solid geometry into a single watertight mesh.
 */
export function buildDesign(design: Design): THREE.Group {
  const group = new THREE.Group();
  group.name = design.name || "design";
  const parts = design.parts.filter((p) => SHAPES.includes(p.shape));

  const hasSubtract = parts.some((p) => p.operation === "subtract");
  if (!hasSubtract) {
    for (const part of parts) {
      const mesh = placed(new THREE.Mesh(geometryFor(part), materialFor(part.color)), part);
      mesh.name = part.name;
      group.add(mesh);
    }
    return group;
  }

  const evaluator = new Evaluator();
  evaluator.useGroups = true;
  let result: Brush | null = null;
  for (const part of parts) {
    const brush = placed(new Brush(geometryFor(part), materialFor(part.color)), part);
    if (!result) {
      if (part.operation === "add") result = brush;
      continue; // nothing to cut from yet
    }
    try {
      result = evaluator.evaluate(result, brush, part.operation === "add" ? ADDITION : SUBTRACTION);
    } catch (err) {
      console.warn(`Skipping part "${part.name}" (boolean operation failed)`, err);
    }
  }
  if (result) {
    const mesh = new THREE.Mesh(result.geometry, result.material);
    mesh.name = design.name || "design";
    group.add(mesh);
  }
  return group;
}

/** Light structural check on a parsed response (structured outputs already guarantee shape). */
export function isDesignResponse(value: unknown): value is DesignResponse {
  const v = value as DesignResponse;
  return (
    !!v &&
    typeof v.reply === "string" &&
    Array.isArray(v.suggestions) &&
    !!v.design &&
    Array.isArray(v.design.parts)
  );
}
