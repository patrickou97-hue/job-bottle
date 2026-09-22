import "server-only";

export const CURRENT_MIMO_PRO_MODEL = "mimo-v2.6-pro";
// MiMo's v2.6 API exposes Pro and Flash; there is no callable bare
// `mimo-v2.6` model. Keep the base configuration on the compatible Flash tier.
export const CURRENT_MIMO_MODEL = "mimo-v2.6-flash";

const LEGACY_MIMO_MODELS: Record<string, string> = {
  "mimo-v2.5": CURRENT_MIMO_MODEL,
  "mimo-v2.6": CURRENT_MIMO_MODEL,
  "mimo-v2.5-pro": CURRENT_MIMO_PRO_MODEL,
};

/** Keep an existing v2.5 Pro environment safe during the model rollout. */
export function resolveMimoModel(configuredModel = process.env.MIMO_MODEL) {
  const model = configuredModel?.trim();
  return model ? LEGACY_MIMO_MODELS[model.toLowerCase()] ?? model : model;
}
