import { getCommandTarget, loadDefinitionFromTarget, printDefinitionSummary } from "./quiz-cli-shared.mts";

async function main() {
  const target = getCommandTarget();
  const definition = await loadDefinitionFromTarget(target);

  printDefinitionSummary(definition);
  console.log("validation: passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
