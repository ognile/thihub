import { getCommandTarget, loadDefinitionFromTarget, printDefinitionSummary } from "./quiz-cli-shared.mts";

async function main() {
  const target = getCommandTarget();
  const definition = await loadDefinitionFromTarget(target);

  printDefinitionSummary(definition);
  console.log("step-outline:");
  definition.steps.forEach((step, index) => {
    console.log(`${index + 1}. [${step.kind}] ${step.id} -> ${step.next ?? "auto"}`);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
