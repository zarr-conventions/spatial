#!/usr/bin/env node
import { readdir } from "fs/promises";
import { join, extname } from "path";
import { execSync } from "child_process";

const examplesDir = "examples";
const invalidExamplesDir = "invalid_examples";
const schemaFile = "schema.json";

async function runTests() {
  console.log("🧪 Running validation tests...\n");

  let passed = 0;
  let failed = 0;

  // Test valid examples — expect validation to pass
  try {
    const files = await readdir(examplesDir);
    const jsonFiles = files.filter((file) => extname(file) === ".json");

    if (jsonFiles.length === 0) {
      console.log("⚠️  No JSON files found in examples directory");
      process.exit(1);
    }

    console.log("Valid examples (should pass):");
    for (const file of jsonFiles) {
      const filePath = join(examplesDir, file);
      process.stdout.write(`  ${file}... `);

      try {
        execSync(`node validate.js ${schemaFile} ${filePath}`, {
          stdio: "pipe",
          encoding: "utf8",
        });
        console.log("✅ PASSED");
        passed++;
      } catch (error) {
        console.log("❌ FAILED (expected valid)");
        console.log(error.stdout || error.message);
        failed++;
      }
    }
  } catch (error) {
    console.error("Error reading examples directory:", error.message);
    process.exit(1);
  }

  // Test invalid examples — expect validation to fail
  try {
    const files = await readdir(invalidExamplesDir);
    const jsonFiles = files.filter((file) => extname(file) === ".json");

    if (jsonFiles.length === 0) {
      console.log("⚠️  No JSON files found in invalid_examples directory");
      process.exit(1);
    }

    console.log("\nInvalid examples (should fail):");
    for (const file of jsonFiles) {
      const filePath = join(invalidExamplesDir, file);
      process.stdout.write(`  ${file}... `);

      try {
        execSync(`node validate.js ${schemaFile} ${filePath}`, {
          stdio: "pipe",
          encoding: "utf8",
        });
        console.log("❌ FAILED (expected invalid, but passed)");
        failed++;
      } catch {
        console.log("✅ PASSED (correctly rejected)");
        passed++;
      }
    }
  } catch (error) {
    console.error("Error reading invalid_examples directory:", error.message);
    process.exit(1);
  }

  const total = passed + failed;
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
