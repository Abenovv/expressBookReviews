// AI-assisted local evidence capture. Every output is produced by the running app.
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { once } = require('node:events');
const { mkdir, writeFile, appendFile } = require('node:fs/promises');
const path = require('node:path');
const { createApp } = require('../index');
const { createBookClient } = require('../router/general');
const run = promisify(execFile);

async function main() {
  const output = path.resolve(__dirname, '../local-evidence');
  await mkdir(output, { recursive: true });
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  // This jar contains only a synthetic local demo session, not an account/browser session.
  const jar = path.join(output, 'local-demo-session.cookies');
  const executable = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const quote = value => `'${String(value).replace(/'/g, "'\\''")}'`;
  async function capture(name, args, append = false) {
    const completeArgs = ['-sS', '--fail-with-body', '--noproxy', '*', ...args];
    const { stdout } = await run(executable, completeArgs, { timeout: 10000 });
    JSON.parse(stdout);
    const content = `${executable} ${completeArgs.map(quote).join(' ')}\n${stdout.trim()}\n`;
    await (append ? appendFile : writeFile)(path.join(output, name), content, 'utf8');
    return stdout;
  }
  try {
    await capture('getallbooks', [base + '/']);
    await capture('getbooksbyISBN', [base + '/isbn/1']);
    await capture('getbooksbyauthor', [base + '/author/Chinua%20Achebe']);
    await capture('getbooksbytitle', [base + '/title/Things%20Fall%20Apart']);
    await capture('getbookreview', [base + '/review/1']);
    const credentials = JSON.stringify({ username: 'labreader', password: 'synthetic-demo-only' });
    await capture('register', ['-X', 'POST', '-H', 'Content-Type: application/json', '--data-raw', credentials, base + '/register']);
    await capture('login', ['-X', 'POST', '-H', 'Content-Type: application/json', '--data-raw', credentials, '-c', jar, base + '/customer/login']);
    // The actual lab's Task 8 explicitly supplies review in the request query.
    await capture('reviewadded', ['-X', 'PUT', '-b', jar, base + '/customer/auth/review/1?review=' + encodeURIComponent('A thoughtful and engaging book.')]);
    await capture('reviewadded', ['-X', 'PUT', '-b', jar, base + '/customer/auth/review/1?review=' + encodeURIComponent('Updated: a thoughtful book with memorable characters.')], true);
    await capture('deletereview', ['-X', 'DELETE', '-b', jar, base + '/customer/auth/review/1']);
    const client = createBookClient(base);
    const actualClientResults = {
      allBooks: await client.getAllBooks(),
      byISBN: await client.getBookByISBN('1'),
      byAuthor: await client.getBooksByAuthor('Chinua Achebe'),
      byTitle: await client.getBooksByTitle('Things Fall Apart')
    };
    await writeFile(path.join(output, 'axios-method-results.json'), JSON.stringify(actualClientResults, null, 2) + '\n');
    await writeFile(path.join(output, 'capture-metadata.json'), JSON.stringify({
      captured_at_utc: new Date().toISOString(),
      base_url: base,
      method: 'Actual local HTTP server and curl processes; no fabricated output',
      command_rendering: 'Commands shown with POSIX/Git Bash quoting; actual curl executable was called with the same argument values.',
      credentials: 'Synthetic local app demo credentials only; no real account credentials used',
      persistence: 'In-memory demo users, sessions and reviews; server stopped after capture',
      public_fork_created: false,
      published: false,
      submitted_for_grading: false
    }, null, 2) + '\n');
    console.log('Captured nine actual local curl evidence files and four Axios results. No publication or grading.');
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
