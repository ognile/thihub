import { getCommandTarget, getQuizReport } from "./quiz-cli-shared.mts";

async function main() {
  const target = getCommandTarget();
  const report = await getQuizReport(target);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
