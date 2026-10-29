import pg from 'pg';
import { pathToFileURL } from 'node:url';
import { processPendingInstagramReceipts } from './instagram-comment-processor.mjs';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const client = new pg.Client();
  try {
    await client.connect();
    const summary = await processPendingInstagramReceipts(client, process.env);
    console.log(JSON.stringify(summary, null, 2));
  } catch {
    console.error('instagram_process_failed: verifique a conexão PostgreSQL e a migration 013.');
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

