/**
 * Talks to the Claude API with the user's own key. The whole conversation is resent
 * on each turn so follow-ups ("make it taller") refine the current design.
 */
import Anthropic from "@anthropic-ai/sdk";
import { RESPONSE_SCHEMA, isDesignResponse, type DesignResponse } from "./design";

export const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `You are Shapesmith, a 3D design assistant inside an app. The user describes an object; you design it as a 3D model built from primitive parts, and they refine it with follow-up messages.

Every reply returns JSON with:
- "reply": a short, friendly message (1-3 sentences) saying what you made or changed. Mention key dimensions.
- "suggestions": 2-4 short follow-up ideas (under 8 words each), e.g. "Add a handle", "Make the walls thinner".
- "design": the COMPLETE current design, every part, not only the changed parts. If the user only asks a question, answer in "reply" and return the current design unchanged.

Coordinate system: units are millimetres, +Y is up, X is width, Z is depth. Rest the model on the ground: its lowest point at y = 0, centred on x = 0, z = 0. Use realistic real-world dimensions.

Parts are applied in order. "add" joins a part to the model. "subtract" cuts it out of everything added before it (holes, cavities, slots, hollowing a cup). Put subtract parts after the parts they cut, and make cutting parts slightly longer than the material they cut through so no thin skin is left. The first part must be "add".

Shapes (all centred on "position", then rotated by "rotation" in degrees, XYZ order). Fill every "size" field; set unused fields to 0. Use an empty "profile" unless the shape needs one.
- box: width (X), height (Y), depth (Z).
- rounded_box: width, height, depth, radius = corner rounding radius.
- sphere: radius.
- cylinder: radius, height along Y. For a tapered cylinder set radius_top and radius_bottom.
- cone: radius_bottom, height along Y, point at the top.
- torus: radius = distance from centre to tube centre, tube = tube radius. Lies flat (ring axis along Y).
- capsule: radius, length = straight middle section along Y (total height = length + 2*radius).
- extrusion: "profile" is a closed 2D outline of points in the X-Y plane (counter-clockwise, at least 3 points, do not repeat the first point); extruded along Z by depth and centred on z = 0. Rotate it to lay it flat.
- lathe: "profile" is a 2D outline revolved around the Y axis; x = radius (>= 0), y = height. Start and end the profile at x = 0 so the solid is closed. Great for vases, bottles, bowls, knobs and chess pieces.

Design guidance:
- Use as many parts as the object needs for a convincing result, typically 3-40. Use subtract parts for holes and hollow objects (cups, boxes, pipe ends) so the result is printable.
- Make parts overlap slightly where they join so the model is one solid piece.
- Give each part a clear name and a pleasant, realistic hex colour.
- Keep wall thicknesses at least 1.5 mm so the model can be 3D-printed.`;

export function createClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    // The app runs entirely on the user's device with the user's own key,
    // so calling the API directly from the app's web view is intended here.
    dangerouslyAllowBrowser: true,
  });
}

/** Checks a key by making a free metadata request. Returns an error message, or null if OK. */
export async function verifyKey(apiKey: string): Promise<string | null> {
  try {
    await createClient(apiKey).models.retrieve(MODEL);
    return null;
  } catch (err) {
    return describeError(err);
  }
}

export function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) {
    return "That API key was rejected. Check it was copied completely, or create a new key in the Claude Console.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "This API key doesn't have permission to use this model.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limit reached. Wait a minute and try again.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    const msg = err.message.toLowerCase();
    if (msg.includes("credit") || msg.includes("billing")) {
      return "Your Anthropic account is out of credit. Add credit in the Claude Console under Billing.";
    }
    return `The request was rejected: ${err.message}`;
  }
  if (err instanceof Anthropic.InternalServerError) {
    return "Claude is temporarily overloaded. Please try again in a moment.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Couldn't reach the Claude API. Check your internet connection.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Claude API error (${err.status ?? "unknown"}): ${err.message}`;
  }
  return err instanceof Error ? err.message : String(err);
}

export type History = Anthropic.Beta.BetaMessageParam[];

export interface TurnResult {
  response: DesignResponse;
  /** The assistant turn to append to the history (full content, thinking blocks included). */
  assistant: Anthropic.Beta.BetaMessageParam;
}

/**
 * Sends the conversation and returns the parsed design. `onProgress` receives short
 * status text (a summary of Claude's reasoning) while it works.
 */
export async function runTurn(
  client: Anthropic,
  history: History,
  onProgress: (text: string) => void,
  signal?: AbortSignal,
): Promise<TurnResult> {
  const stream = client.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      thinking: { type: "adaptive", display: "summarized" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: RESPONSE_SCHEMA as unknown as Record<string, unknown> },
      },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: history,
    },
    { signal },
  );

  let thinking = "";
  let chars = 0;
  for await (const event of stream) {
    if (event.type === "content_block_delta") {
      if (event.delta.type === "thinking_delta") {
        thinking += event.delta.thinking;
        onProgress(thinking);
      } else if (event.delta.type === "text_delta") {
        chars += event.delta.text.length;
        onProgress(`Building the model… (${Math.round(chars / 100) / 10}k characters)`);
      }
    }
  }
  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error("Claude declined this request. Try describing the object differently.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("The design was too large to finish. Try asking for a simpler version.");
  }
  const text = message.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Claude's reply couldn't be read as a design. Please try again.");
  }
  if (!isDesignResponse(parsed)) {
    throw new Error("Claude's reply was missing the design. Please try again.");
  }
  return {
    response: parsed,
    assistant: { role: "assistant", content: message.content as Anthropic.Beta.BetaContentBlockParam[] },
  };
}
