import {
  createQuizAdminClient,
  getCommandTarget,
  getFlagValue,
  loadDefinitionFromTarget,
  printDefinitionSummary,
  upsertQuizDefinition,
} from "./quiz-cli-shared.mts";

async function main() {
  const target = getCommandTarget();
  const environment = getFlagValue("--env") ?? "production";
  const definition = await loadDefinitionFromTarget(target);
  const supabase = createQuizAdminClient();
  const published = await upsertQuizDefinition(supabase, definition, "published");

  printDefinitionSummary(definition);
  console.log(`environment: ${environment}`);
  console.log(`published-id: ${published.id}`);
  console.log(`published-at: ${published.published_at ?? "n/a"}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
