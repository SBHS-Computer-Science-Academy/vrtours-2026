import { defineConfig } from 'vite';
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

function toursPlugin() {
  const toursDir = join(__dirname, '..', 'tours');

  return {
    name: 'vite-plugin-tours',

    configureServer(server) {
      server.middlewares.use('/tours/index.json', (_req, res) => {
        const files = readdirSync(toursDir).filter(f => f.endsWith('.yaml'));
        const index = files.map(f => f.replace('.yaml', '.json'));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(index));
      });

      server.middlewares.use('/tours', (req, res, next) => {
        const filename = req.url.replace(/^\//, '').replace(/\.json$/, '.yaml');
        try {
          const yamlContent = readFileSync(join(toursDir, filename), 'utf-8');
          const data = yaml.load(yamlContent);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(data));
        } catch {
          next();
        }
      });
    },

    writeBundle(options) {
      const outDir = options.dir || 'dist';
      const toursOutDir = join(outDir, 'tours');
      mkdirSync(toursOutDir, { recursive: true });

      const files = readdirSync(toursDir).filter(f => f.endsWith('.yaml'));
      const index = [];

      for (const file of files) {
        const yamlContent = readFileSync(join(toursDir, file), 'utf-8');
        const data = yaml.load(yamlContent);
        const jsonFilename = file.replace('.yaml', '.json');
        writeFileSync(join(toursOutDir, jsonFilename), JSON.stringify(data));
        index.push(jsonFilename);
      }

      writeFileSync(join(toursOutDir, 'index.json'), JSON.stringify(index));
    }
  };
}

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [toursPlugin()],
  build: {
    outDir: 'dist'
  }
});
