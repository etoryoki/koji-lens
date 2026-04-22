import {
  configFilePath,
  getConfigValue,
  listKnownConfigKeys,
  loadConfig,
  setConfigValue,
  unsetConfigValue,
} from "@kojihq/core";

export function configCommand(
  action: string,
  key?: string,
  value?: string,
): void {
  switch (action) {
    case "get":
      handleGet(key);
      return;
    case "set":
      handleSet(key, value);
      return;
    case "unset":
      handleUnset(key);
      return;
    case "list":
      handleList();
      return;
    case "path":
      console.log(configFilePath());
      return;
    default:
      console.error(
        `Unknown action: ${action}. Use get | set | unset | list | path.`,
      );
      process.exit(1);
  }
}

function handleGet(key: string | undefined): void {
  if (!key) {
    console.error("config get <key> requires a key.");
    console.error(`Known keys: ${listKnownConfigKeys().join(", ")}`);
    process.exit(1);
  }
  const v = getConfigValue(key);
  if (v === undefined) {
    process.exit(0);
  }
  console.log(String(v));
}

function handleSet(key: string | undefined, value: string | undefined): void {
  if (!key || value === undefined) {
    console.error("config set <key> <value> requires both arguments.");
    console.error(`Known keys: ${listKnownConfigKeys().join(", ")}`);
    process.exit(1);
  }
  try {
    setConfigValue(key, value);
    console.log(`${key} = ${value}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function handleUnset(key: string | undefined): void {
  if (!key) {
    console.error("config unset <key> requires a key.");
    process.exit(1);
  }
  try {
    unsetConfigValue(key);
    console.log(`${key} unset`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function handleList(): void {
  const cfg = loadConfig();
  if (Object.keys(cfg).length === 0) {
    console.log("(no config values set)");
    console.log(`Known keys: ${listKnownConfigKeys().join(", ")}`);
    return;
  }
  for (const [k, v] of Object.entries(cfg)) {
    console.log(`${k} = ${v}`);
  }
}
