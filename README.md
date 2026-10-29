# Online Book Review — local course draft

An AI-assisted implementation based on IBM's `expressBookReviews` starter. It supplies the course's Express REST routes, session/JWT authentication, owner-scoped reviews, and four asynchronous Axios client methods. The original book catalog is unchanged.

From `final_project`:

```sh
npm ci --ignore-scripts
npm test
npm start
```

The server listens only on `127.0.0.1`, on port 5000 unless `PORT` is provided. The application uses in-memory data and development sessions; it is a course demo rather than a production service.

`npm test` exercises actual local HTTP requests, concurrent users, access restrictions, and the Axios methods. `node scripts/capture-evidence.js` creates genuine local curl output in `final_project/local-evidence`; its synthetic session-cookie file is excluded from Git.

This implementation and supporting documentation were prepared with AI assistance. The learner must review permitted assistance rules and any personal declarations before assessed use. Local code, tests, and captured HTTP responses do not establish platform grades or completion. See `DRAFT_REVIEW.md` for provenance and outstanding review items.
