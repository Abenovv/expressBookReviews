// AI-assisted implementation of the IBM course starter.
const express = require('express');
const axios = require('axios');
const { registerUser } = require('./auth_users');

function createGeneralRouter(store) {
  const router = express.Router();
  router.post('/register', (req, res, next) => {
    const { username, password } = req.body || {};
    registerUser(store, username, password)
      .then(result => res.status(result.status).json({ message: result.message }))
      .catch(next);
  });
  router.get('/', (req, res) => res.json(store.books));
  router.get('/isbn/:isbn', (req, res) => {
    if (!Object.hasOwn(store.books, req.params.isbn)) return res.status(404).json({ message: 'Book not found' });
    return res.json(store.books[req.params.isbn]);
  });
  for (const field of ['author', 'title']) {
    router.get(`/${field}/:${field}`, (req, res) => {
      const query = req.params[field].toLocaleLowerCase();
      const matches = Object.fromEntries(Object.entries(store.books)
        .filter(([, book]) => book[field].toLocaleLowerCase().includes(query)));
      return res.json(matches);
    });
  }
  router.get('/review/:isbn', (req, res) => {
    if (!Object.hasOwn(store.books, req.params.isbn)) return res.status(404).json({ message: 'Book not found' });
    return res.json(store.books[req.params.isbn].reviews);
  });
  return router;
}

// Four nonblocking Axios methods requested by the project rubric.
// These client helpers call the REST routes, whose handlers read the book data.
function createBookClient(baseURL) {
  const client = axios.create({ baseURL, timeout: 5000, proxy: false });
  return {
    async getAllBooks(callback) {
      try {
        const data = (await client.get('/')).data;
        if (callback) callback(null, data);
        return data;
      } catch (error) {
        if (callback) callback(error);
        throw error;
      }
    },
    getBookByISBN(isbn) {
      return client.get(`/isbn/${encodeURIComponent(isbn)}`).then(response => response.data);
    },
    async getBooksByAuthor(author) {
      return (await client.get(`/author/${encodeURIComponent(author)}`)).data;
    },
    async getBooksByTitle(title) {
      return (await client.get(`/title/${encodeURIComponent(title)}`)).data;
    }
  };
}

module.exports = { createGeneralRouter, createBookClient };
