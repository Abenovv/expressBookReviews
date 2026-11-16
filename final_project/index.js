const express = require('express');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const { authenticated, requireLogin } = require('./router/auth_users');
const { general } = require('./router/general');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' },
}));
app.use('/customer/auth', requireLogin);
app.use('/customer', authenticated);
app.use('/', general);

const server = app.listen(Number(process.env.PORT || 5000), () => {
  const { port } = server.address();
  app.locals.catalogUrl = `http://127.0.0.1:${port}`;
  console.log(`Book review API listening on port ${port}`);
});
