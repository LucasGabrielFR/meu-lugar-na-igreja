import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const password = () => randomBytes(24).toString('base64url');
try {
  writeFileSync('.env', `POSTGRES_DB=paroquia\nPOSTGRES_USER=paroquia\nPOSTGRES_PASSWORD=${password()}\nADMIN_EMAIL=admin@acutistech.local\nADMIN_PASSWORD=${password()}\nAPP_PORT=3100\nAPP_BIND=127.0.0.1\nCOOKIE_SECURE=false\n`, { flag: 'wx', mode: 0o600 });
  console.log('.env criado com senhas aleatorias. Consulte-o localmente para entrar no painel.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env existente preservado.');
}
