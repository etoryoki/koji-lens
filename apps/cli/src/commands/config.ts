export function configCommand(
  action: string,
  key?: string,
  value?: string,
): void {
  const rest = [key, value].filter(Boolean).join(" ");
  console.log(`[stub] koji-lens config ${action}${rest ? " " + rest : ""}`);
  console.log(
    "Persistent config storage (~/.koji-lens/config.json) will be added when SQLite cache layer lands.",
  );
}
