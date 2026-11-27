#!/usr/bin/env node
import { readdir, readFile } from "fs/promises";
import { join, extname } from "path";
import { execSync } from "child_process";

const examplesDir = "examples";
const invalidExamplesDir = "tests/invalid";
const schemaFile = "schema.json";

// In draft-07, a validator must ignore every keyword that is in the same object
// as `$ref`. Ajv applies these keywords, so a constraint next to `$ref` passes
// the tests here but has no effect in a strict validator. Fail early if the
// schema has one. Use `allOf: [{ "$ref": ... }]` to combine constraints.
const annotationKeywords = ["$ref", "$comment", "title", "description"];

function findRefSiblings(node, path = "#") {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => findRefSiblings(item, `${path}/${i}`));
  }
  if (node === null || typeof node !== "object") {
    return [];
  }
  const found = Object.entries(node).flatMap(([key, value]) =>
    findRefSiblings(value, `${path}/${key}`)
  );
  if ("$ref" in node) {
    const siblings = Object.keys(node).filter(
      (key) => !annotationKeywords.includes(key)
    );
    if (siblings.length > 0) {
      found.push(`${path}: ${siblings.join(", ")}`);
    }
  }
  return found;
}

async function runTests() {
  console.log("🧪 Running validation tests...\n");

  const refSiblings = findRefSiblings(
    JSON.parse(await readFile(schemaFile, "utf8"))
  );
  if (refSiblings.length > 0) {
    console.log("❌ Keywords next to $ref are ignored in draft-07:");
    refSiblings.forEach((line) => console.log(`   ${line}`));
    process.exit(1);
  }

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
      console.log("⚠️  No JSON files found in tests/invalid directory");
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
    console.error("Error reading tests/invalid directory:", error.message);
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
