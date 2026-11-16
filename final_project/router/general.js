const axios = require('axios');
const express = require('express');
const books = require('./booksdb');
const { registerUser } = require('./auth_users');

const general = express.Router();
const catalogClient = axios.create({ timeout: 5000, proxy: false });

general.post('/register', registerUser);
general.get('/', (req, res) => res.json(books));

general.get('/isbn/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) {
    return res.status(404).json({ message: 'Book not found.' });
  }
  return res.json(books[isbn]);
});

function matchingBooks(field, value) {
  const search = value.trim().toLowerCase();
  return Object.fromEntries(Object.entries(books).filter(([, book]) => {
    return book[field].toLowerCase() === search;
  }));
}

general.get('/author/:author', (req, res) => {
  res.json(matchingBooks('author', req.params.author));
});

general.get('/title/:title', (req, res) => {
  res.json(matchingBooks('title', req.params.title));
});

general.get('/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) {
    return res.status(404).json({ message: 'Book not found.' });
  }
  return res.json(books[isbn].reviews);
});

async function getAllBooks(baseURL) {
  const response = await catalogClient.get('/', { baseURL });
  return response.data;
}

async function getBookByISBN(baseURL, isbn) {
  const response = await catalogClient.get(`/isbn/${encodeURIComponent(isbn)}`, { baseURL });
  return response.data;
}

async function getBooksByAuthor(baseURL, author) {
  const response = await catalogClient.get(`/author/${encodeURIComponent(author)}`, { baseURL });
  return response.data;
}

async function getBooksByTitle(baseURL, title) {
  const response = await catalogClient.get(`/title/${encodeURIComponent(title)}`, { baseURL });
  return response.data;
}

function respondWithCatalog(lookup, parameter) {
  return async (req, res) => {
    try {
      const result = await lookup(req.app.locals.catalogUrl, req.params[parameter]);
      return res.json(result);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return res.status(error.response.status).json(error.response.data);
      }
      return res.status(502).json({ message: 'Could not retrieve the book catalog.' });
    }
  };
}

general.get('/asyncbooks', respondWithCatalog(getAllBooks));
general.get('/asyncisbn/:isbn', respondWithCatalog(getBookByISBN, 'isbn'));
general.get('/asyncauthor/:author', respondWithCatalog(getBooksByAuthor, 'author'));
general.get('/asynctitle/:title', respondWithCatalog(getBooksByTitle, 'title'));

module.exports = { general, getAllBooks, getBookByISBN, getBooksByAuthor, getBooksByTitle };
