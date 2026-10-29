const { test } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createApp } = require('../index');
const { createBookClient } = require('../router/general');

test('bookshop REST, authentication, ownership, concurrency and Axios clients', async t => {
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(path, method = 'GET', body, cookie) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (cookie) headers.Cookie = cookie;
    const response = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
  }

  await t.test('original catalog, ISBN, author, title, reviews and missing books', async () => {
    const all = await request('/');
    assert.equal(Object.keys(all.body).length, 10);
    assert.equal((await request('/isbn/1')).body.title, 'Things Fall Apart');
    assert.equal(Object.keys((await request('/author/Unknown')).body).length, 4);
    assert.equal((await request('/title/Pride')).body['8'].author, 'Jane Austen');
    assert.deepEqual((await request('/review/1')).body, {});
    assert.equal((await request('/isbn/missing')).status, 404);
    assert.equal((await request('/isbn/constructor')).status, 404);
  });

  let alice, bob;
  await t.test('registration, duplicate rejection, invalid login and session creation', async () => {
    assert.equal((await request('/register', 'POST', { username: 'alice', password: 'lab-password-1' })).status, 201);
    assert.equal((await request('/register', 'POST', { username: 'bob', password: 'lab-password-2' })).status, 201);
    assert.equal((await request('/register', 'POST', { username: 'alice', password: 'again' })).status, 409);
    assert.equal((await request('/register', 'POST', { username: '', password: '' })).status, 400);
    assert.equal((await request('/customer/login', 'POST', { username: 'alice', password: 'wrong' })).status, 401);
    alice = await request('/customer/login', 'POST', { username: 'alice', password: 'lab-password-1' });
    bob = await request('/customer/login', 'POST', { username: 'bob', password: 'lab-password-2' });
    assert.equal(alice.status, 200);
    assert.equal(bob.status, 200);
    assert.ok(alice.cookie);
    assert.ok(bob.cookie);
    assert.notEqual(alice.cookie, bob.cookie);
  });

  await t.test('anonymous writes denied; each session can change/delete only its own review', async () => {
    assert.equal((await request('/customer/auth/review/1', 'PUT', { review: 'anonymous' })).status, 401);
    await Promise.all([
      request('/customer/auth/review/1', 'PUT', { review: 'Alice original' }, alice.cookie),
      request('/customer/auth/review/1', 'PUT', { review: 'Bob original' }, bob.cookie)
    ]);
    const edited = await request('/customer/auth/review/1', 'PUT', { username: 'bob', review: 'Alice updated' }, alice.cookie);
    assert.equal(edited.body.reviews.alice, 'Alice updated');
    assert.equal(edited.body.reviews.bob, 'Bob original');
    const deleted = await request('/customer/auth/review/1', 'DELETE', undefined, alice.cookie);
    assert.equal(deleted.body.reviews.alice, undefined);
    assert.equal(deleted.body.reviews.bob, 'Bob original');
    assert.equal((await request('/customer/auth/review/1', 'DELETE', undefined, alice.cookie)).status, 404);
    assert.equal((await request('/customer/auth/review/missing', 'PUT', { review: 'x' }, bob.cookie)).status, 404);
    assert.equal((await request('/customer/auth/review/1', 'PUT', { review: '' }, bob.cookie)).status, 400);
    const queryReview = await request('/customer/auth/review/1?review=Bob%20query%20review', 'PUT', undefined, bob.cookie);
    assert.equal(queryReview.status, 200);
    assert.equal(queryReview.body.reviews.bob, 'Bob query review');
  });

  await t.test('simultaneous duplicate registrations cannot create conflicting accounts', async () => {
    const results = await Promise.all([1, 2].map(() => request('/register', 'POST', { username: 'same', password: 'test-only' })));
    assert.deepEqual(results.map(x => x.status).sort(), [201, 409]);
    const reads = await Promise.all(Array.from({ length: 10 }, () => request('/isbn/1')));
    assert.ok(reads.every(x => x.status === 200 && x.body.title === 'Things Fall Apart'));
  });

  await t.test('four Axios methods perform actual HTTP requests and propagate errors', async () => {
    const client = createBookClient(base);
    let callbackCalled = false;
    const all = await client.getAllBooks((error, books) => {
      assert.equal(error, null);
      assert.equal(Object.keys(books).length, 10);
      callbackCalled = true;
    });
    assert.ok(callbackCalled);
    assert.equal(all['1'].author, 'Chinua Achebe');
    assert.equal((await client.getBookByISBN('1')).title, 'Things Fall Apart');
    assert.equal((await client.getBooksByAuthor('Jane Austen'))['8'].title, 'Pride and Prejudice');
    assert.equal((await client.getBooksByTitle('Things Fall Apart'))['1'].author, 'Chinua Achebe');
    await assert.rejects(client.getBookByISBN('missing'), error => error.response.status === 404);
  });
});
