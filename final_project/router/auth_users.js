// AI-assisted implementation; retain the original IBM starter attribution.
const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const deriveKey = promisify(scrypt);
const wrap = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function validCredentials(username, password) {
  return typeof username === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(username)
    && typeof password === 'string' && password.length > 0 && password.length <= 128;
}

async function registerUser(store, username, password) {
  if (!validCredentials(username, password)) return { status: 400, message: 'Provide a valid username and password' };
  if (store.users.has(username)) return { status: 409, message: 'Username already registered' };
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64);
  // Recheck after async hashing to handle simultaneous registrations safely.
  if (store.users.has(username)) return { status: 409, message: 'Username already registered' };
  store.users.set(username, { salt, hash });
  return { status: 201, message: 'User successfully registered' };
}

function requireAuthentication(req, res, next) {
  const authorization = req.session && req.session.authorization;
  if (!authorization) return res.status(401).json({ message: 'Login required' });
  try {
    const payload = jwt.verify(authorization.accessToken, req.app.locals.jwtSecret, {
      algorithms: ['HS256'], issuer: 'bookshop-lab', audience: 'bookshop-client'
    });
    if (payload.sub !== authorization.username || !req.app.locals.store.users.has(payload.sub)) {
      return res.status(401).json({ message: 'Invalid session' });
    }
    req.authenticatedUsername = payload.sub;
    return next();
  } catch {
    return res.status(401).json({ message: 'Session invalid or expired' });
  }
}

function createAuthenticatedRouter(store) {
  const router = express.Router();
  router.post('/login', wrap(async (req, res) => {
    const { username, password } = req.body || {};
    if (!validCredentials(username, password)) return res.status(400).json({ message: 'Provide a valid username and password' });
    const user = store.users.get(username);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const hash = await deriveKey(password, user.salt, 64);
    if (!timingSafeEqual(hash, user.hash)) return res.status(401).json({ message: 'Invalid credentials' });
    await new Promise((resolve, reject) => req.session.regenerate(error => error ? reject(error) : resolve()));
    req.session.authorization = {
      username,
      accessToken: jwt.sign({}, req.app.locals.jwtSecret, {
        algorithm: 'HS256', subject: username, issuer: 'bookshop-lab',
        audience: 'bookshop-client', expiresIn: '1h'
      })
    };
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
    return res.status(200).json({ message: 'User successfully logged in' });
  }));

  router.put('/auth/review/:isbn', (req, res) => {
    const book = Object.hasOwn(store.books, req.params.isbn) && store.books[req.params.isbn];
    if (!book) return res.status(404).json({ message: 'Book not found' });
    const review = req.body?.review ?? req.query.review;
    if (typeof review !== 'string' || !review.trim() || review.length > 2000) {
      return res.status(400).json({ message: 'Provide a review of 1 to 2000 characters' });
    }
    // Ownership comes from the verified session, never a submitted username.
    Object.defineProperty(book.reviews, req.authenticatedUsername, {
      value: review.trim(), writable: true, enumerable: true, configurable: true
    });
    return res.json({ message: 'Review added or modified', reviews: book.reviews });
  });

  router.delete('/auth/review/:isbn', (req, res) => {
    const book = Object.hasOwn(store.books, req.params.isbn) && store.books[req.params.isbn];
    if (!book) return res.status(404).json({ message: 'Book not found' });
    if (!Object.hasOwn(book.reviews, req.authenticatedUsername)) {
      return res.status(404).json({ message: 'No review belonging to this user' });
    }
    delete book.reviews[req.authenticatedUsername];
    return res.json({ message: 'Your review was deleted', reviews: book.reviews });
  });
  return router;
}

module.exports = { createAuthenticatedRouter, requireAuthentication, registerUser };
