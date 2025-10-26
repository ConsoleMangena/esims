import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const Factory = await ethers.getContractFactory("SurveyRegistry");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("SurveyRegistry deployed to:", address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
