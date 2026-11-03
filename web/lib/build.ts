// The AI steps behind each route: build from a card, apply a change, repair a broken app.
import { chatHTML, chatJSON, type TraceStep } from "./ai";
import {
  appSystem, cardBlock, editAppSystem, editAppText, editGameSystem, editGameText, editSchema,
  gameSystem, postBlock, repairAppText, specSchema,
} from "./prompts";
import type { ExperienceSpec } from "./spec";
import { getImage, type Experience, type Suggestion } from "./store";

export async function imageDataUrl(imageId: string | null) {
  if (!imageId) return null;
  const image = await getImage(imageId);
  return image ? `data:${image.mime};base64,${image.b64}` : null;
}

type Built = { spec: ExperienceSpec | null; html: string | null; title: string; tagline: string; trace: TraceStep };

export async function buildFromCard(input: {
  suggestion: Suggestion;
  scene: { description: string; mood: string };
  caption: string;
  postUrl: string;
  imageDataUrl: string | null;
}): Promise<Built> {
  const text = `${cardBlock(input.suggestion, input.scene)}\n\n${postBlock(input.caption, input.postUrl)}`;
  if (input.suggestion.kind === "game") {
    const { data, trace } = await chatJSON(
      "write spec",
      { system: gameSystem(), text, imageDataUrl: input.imageDataUrl },
      specSchema,
    );
    return { spec: data, html: null, title: data.title, tagline: data.tagline, trace };
  }
  const { html, trace } = await chatHTML("write app", {
    system: appSystem(!!input.imageDataUrl),
    text: `${text}\n\nBuild this app.`,
    imageDataUrl: input.imageDataUrl,
  });
  return { spec: null, html, title: input.suggestion.title, tagline: input.suggestion.pitch, trace };
}

export async function applyChange(exp: Experience, instruction: string) {
  if (exp.kind === "game" && exp.spec) {
    const { data, trace } = await chatJSON(
      "edit spec",
      { system: editGameSystem(), text: editGameText(exp.spec, instruction) },
      editSchema,
    );
    return {
      spec: data.spec,
      html: null,
      title: data.spec.title,
      tagline: data.spec.tagline,
      changeSummary: data.changeSummary,
      unsupported: data.unsupported,
      trace,
    };
  }
  const { html, trace } = await chatHTML("edit app", {
    system: editAppSystem(!!exp.imageId),
    text: editAppText(exp.html ?? "", instruction),
  });
  return {
    spec: null,
    html,
    title: exp.title,
    tagline: exp.tagline,
    changeSummary: [instruction.length > 40 ? `${instruction.slice(0, 38)}…` : instruction],
    unsupported: "",
    trace,
  };
}

export async function repairApp(exp: Experience, error: string) {
  return chatHTML("repair app", { system: appSystem(!!exp.imageId), text: repairAppText(exp.html ?? "", error) });
}
