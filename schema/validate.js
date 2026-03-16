import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const schema = JSON.parse(readFileSync(join(__dirname, 'tour-schema.json'), 'utf-8'));

const ajv = new Ajv2020({ allErrors: true });
addFormats(ajv);
const validateSchema = ajv.compile(schema);

export function validateTourData(data) {
  const errors = [];

  const schemaValid = validateSchema(data);
  if (!schemaValid) {
    for (const err of validateSchema.errors) {
      errors.push({
        path: err.instancePath || '/',
        message: `${err.instancePath || '/'}: ${err.message}`
      });
    }
    return { valid: false, errors };
  }

  const locationIds = new Set();
  const duplicates = new Set();

  for (const loc of data.locations) {
    if (locationIds.has(loc.id)) duplicates.add(loc.id);
    locationIds.add(loc.id);
  }

  for (const id of duplicates) {
    errors.push({ path: '/locations', message: `duplicate location id: "${id}"` });
  }

  if (!locationIds.has(data.startLocation)) {
    errors.push({
      path: '/startLocation',
      message: `startLocation "${data.startLocation}" does not match any location id`
    });
  }

  for (const loc of data.locations) {
    for (const conn of loc.connections) {
      if (!locationIds.has(conn)) {
        errors.push({
          path: `/locations/${loc.id}/connections`,
          message: `connection "${conn}" does not match any location id`
        });
      }
    }
    if (loc.hotspots) {
      for (const hotspot of loc.hotspots) {
        if (!locationIds.has(hotspot.target)) {
          errors.push({
            path: `/locations/${loc.id}/hotspots`,
            message: `hotspot target "${hotspot.target}" does not match any location id`
          });
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateTourYaml(yamlString) {
  let data;
  try {
    data = yaml.load(yamlString);
  } catch (err) {
    return { valid: false, errors: [{ path: '/', message: `YAML parse error: ${err.message}` }] };
  }
  return validateTourData(data);
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));
if (isMain) {
  const toursDir = join(__dirname, '..', 'tours');
  const files = readdirSync(toursDir).filter(f => f.endsWith('.yaml'));

  if (files.length === 0) {
    console.log('No .yaml files found in tours/');
    process.exit(0);
  }

  let allValid = true;
  for (const file of files) {
    const content = readFileSync(join(toursDir, file), 'utf-8');
    const result = validateTourYaml(content);
    if (result.valid) {
      console.log(`✓ ${file}`);
    } else {
      console.log(`✗ ${file}`);
      for (const err of result.errors) {
        console.log(`    ${err.message}`);
      }
      allValid = false;
    }
  }

  process.exit(allValid ? 0 : 1);
}
