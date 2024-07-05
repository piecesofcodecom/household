const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');

// Define os diretórios de origem e destino
const destDir = path.join(__dirname, './release/');

// Lista de diretórios e arquivos a serem copiados
const itemsToCopy = [
  'assets',
  'build',
  'lang',
  'fonts',
  'README.md',
  'styles',
  'templates',
  'system.json',
  'template.json'
];

// Função para executar comandos no terminal
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Erro ao executar ${command}: ${stderr}`);
      } else {
        console.log(`Executado ${command}: ${stdout}`);
        resolve();
      }
    });
  });
}

// Função principal para criar diretório, rodar comandos e copiar arquivos
async function createRelease() {
  try {
    // Executa os comandos necessários
    await runCommand('npm run build-css');
    await runCommand('npm run build-js');
    await runCommand('npm run minify-js');
    await runCommand('npm run minify-css');

    // Verifica se o diretório de destino existe, se não, cria
    await fs.ensureDir(destDir);

    // Copia os arquivos e diretórios necessários para o diretório de destino
    for (const item of itemsToCopy) {
      const src = path.join(__dirname, item);
      const dest = path.join(destDir, item);
      // Verifique se o item de origem existe
      const exists = await fs.pathExists(src);
      if (exists) {
        await fs.copy(src, dest);
        console.log(`Copiado ${item} para ${dest}`);
      } else {
        console.log(`Item de origem ${src} não existe. Pulando...`);
      }
    }

    console.log('Release criada com sucesso!');
  } catch (err) {
    console.error('Erro ao criar release:', err);
  }
}

// Executa a função principal
createRelease();
