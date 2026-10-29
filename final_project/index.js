// AI-assisted implementation of the IBM course starter; see DRAFT_REVIEW.md.
const express = require('express');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const { createAuthenticatedRouter, requireAuthentication } = require('./router/auth_users');
const { createGeneralRouter } = require('./router/general');
const originalBooks = require('./router/booksdb');

function createApp() {
  const app = express();
  const store = { books: JSON.parse(JSON.stringify(originalBooks)), users: new Map() };
  app.locals.store = store;
  // Ephemeral lab secrets; no checked-in credential or production configuration.
  app.locals.jwtSecret = randomBytes(32).toString('hex');
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use('/customer', session({
    secret: randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'strict', maxAge: 60 * 60 * 1000 }
  }));
  app.use('/customer/auth', requireAuthentication);
  app.use('/customer', createAuthenticatedRouter(store));
  app.use('/', createGeneralRouter(store));
  app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.type === 'entity.parse.failed' ? 400 : 500;
    return res.status(status).json({ message: status === 400 ? 'Invalid JSON' : 'Request failed' });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT || 5000);
  createApp().listen(port, '127.0.0.1', () => console.log(`Book review lab listening on port ${port}`));
}

module.exports = { createApp };
