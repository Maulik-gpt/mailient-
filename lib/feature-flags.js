const parseBoolean = (value, fallback = true) => {
  if (value === undefined || value === null || value === '') return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) return false;
  return fallback;
};

export const featureFlags = {
  arcusOperatorRuntimeV2: parseBoolean(process.env.ARCUS_OPERATOR_RUNTIME_V2, true),
  arcusCanvasActionsV2: parseBoolean(process.env.ARCUS_CANVAS_ACTIONS_V2, true),
  arcusFreeRouterV2: parseBoolean(process.env.ARCUS_FREE_ROUTER_V2, true),
};

export function isFeatureEnabled(flagName) {
  return Boolean(featureFlags[flagName]);
}
