import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import hre from "hardhat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const artifact = await hre.artifacts.readArtifact("SurveyRegistry");
  const abi = artifact.abi;
  const outDir = path.resolve(__dirname, "../abi");
  const outFile = path.join(outDir, "survey_registry.json");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, JSON.stringify(abi, null, 2) + "\n");
  console.log("ABI exported to:", outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
