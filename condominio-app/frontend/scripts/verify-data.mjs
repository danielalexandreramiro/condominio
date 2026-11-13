import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('..', '..', 'docs', 'assets', 'data');
const output = resolve('dist', 'condominio-app', 'browser', 'assets', 'data');
const files = (await readdir(source)).filter(file => file.endsWith('.json')).sort();
const outputFiles = (await readdir(output)).filter(file => file.endsWith('.json')).sort();

if (files.length === 0 || !files.includes('index.json')) {
  throw new Error('A pasta de dados precisa conter index.json e arquivos JSON.');
}

if (JSON.stringify(files) !== JSON.stringify(outputFiles)) {
  throw new Error('Os arquivos JSON do build não correspondem à pasta de dados.');
}

const index = JSON.parse(await readFile(resolve(source, 'index.json'), 'utf8'));
if (!Array.isArray(index.meses) || index.meses.some(mes =>
  typeof mes !== 'string' || !/^\d{6}$/.test(mes) || !files.includes(`${mes}.json`)
)) {
  throw new Error('O índice de meses contém referências inválidas ou arquivos ausentes.');
}

for (const file of files) {
  const [original, built] = await Promise.all([
    readFile(resolve(source, file)),
    readFile(resolve(output, file))
  ]);
  if (!original.equals(built)) {
    throw new Error(`O arquivo ${file} no build difere da fonte.`);
  }
}

console.log(`${files.length} arquivos JSON verificados.`);
