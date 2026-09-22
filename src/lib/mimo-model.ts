import "server-only";

export const CURRENT_MIMO_PRO_MODEL = "mimo-v2.6-pro";
export const CURRENT_MIMO_MODEL = "mimo-v2.6";

const LEGACY_MIMO_MODELS: Record<string, string> = {
  "mimo-v2.5": CURRENT_MIMO_MODEL,
  "mimo-v2.5-pro": CURRENT_MIMO_PRO_MODEL,
};

/** Keep an existing v2.5 Pro environment safe during the model rollout. */
export function resolveMimoModel(configuredModel = process.env.MIMO_MODEL) {
  const model = configuredModel?.trim();
  return model ? LEGACY_MIMO_MODELS[model.toLowerCase()] ?? model : model;
}
