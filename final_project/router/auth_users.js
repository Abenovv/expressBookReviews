const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, scryptSync, timingSafeEqual } = require('node:crypto');
const books = require('./booksdb');

const authenticated = express.Router();
const users = new Map();
const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');

function getCredentials(req) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !username.trim() ||
      typeof password !== 'string' || !password || password.length > 128) {
    return null;
  }
  return { username: username.trim(), password };
}

function registerUser(req, res) {
  const credentials = getCredentials(req);
  if (!credentials) {
    return res.status(400).json({ message: 'Provide a username and a password.' });
  }
  const { username, password } = credentials;
  if (users.has(username)) {
    return res.status(409).json({ message: 'Username already registered.' });
  }

  const salt = randomBytes(16);
  users.set(username, { salt, hash: scryptSync(password, salt, 64) });
  return res.status(201).json({ message: 'User successfully registered.' });
}

authenticated.post('/login', (req, res, next) => {
  const credentials = getCredentials(req);
  const user = credentials && users.get(credentials.username);
  if (!user || !timingSafeEqual(user.hash, scryptSync(credentials.password, user.salt, 64))) {
    return res.status(401).json({ message: 'Invalid username or password.' });
  }

  req.session.regenerate((error) => {
    if (error) return next(error);
    const { username } = credentials;
    req.session.token = jwt.sign({}, jwtSecret, { subject: username, expiresIn: '1h' });
    req.session.save((saveError) => {
      if (saveError) return next(saveError);
      return res.json({ message: 'User successfully logged in.', username });
    });
  });
});

function requireLogin(req, res, next) {
  try {
    req.username = jwt.verify(req.session.token, jwtSecret).sub;
  } catch {
    return res.status(401).json({ message: 'Please log in first.' });
  }
  return next();
}

authenticated.put('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) {
    return res.status(404).json({ message: 'Book not found.' });
  }
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim()) {
    return res.status(400).json({ message: 'Provide a nonempty review.' });
  }
  const book = books[isbn];
  book.reviews = { ...book.reviews, [req.username]: review.trim() };
  return res.json({ message: 'Review added or updated.', reviews: book.reviews });
});

authenticated.delete('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) {
    return res.status(404).json({ message: 'Book not found.' });
  }
  const { reviews } = books[isbn];
  if (!Object.hasOwn(reviews, req.username)) {
    return res.status(404).json({ message: 'No review found for this user.' });
  }
  delete reviews[req.username];
  return res.json({ message: 'Review deleted successfully.', reviews });
});

module.exports = { authenticated, registerUser, requireLogin };
