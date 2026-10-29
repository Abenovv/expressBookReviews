# AI-assisted local book review project — October 29, 2026

This is an AI-assisted implementation draft for learner review. No course AI-use permission, personal declaration, completed prerequisite lab, platform grade, fork, public URL, or certificate is implied by this local implementation. The coordinator owns browser/account work; this worker performs local coding and testing only.

## Source and scope

The actual public starter is https://github.com/ibm-developer-skills-network/expressBookReviews . The overview's singular `expressBookReview` spelling was unavailable, and the subsequent official lab confirmed the plural repository. The original `final_project/router/booksdb.js` catalog is preserved unchanged. Existing copyright/license material is retained.

Captured requirements: `study-system/agent-results/2026-10-29/wb5-project-overview.txt`, `wb5-project-breakdown.txt`, and the full official Markdown source `wb5-official-lab-source.md`. The paged UI captures repeat the introduction, but the full public source at https://cf-courses-data.static.labs.skills.network/X42GqzoGdgJyzOFInHDDyg/final-project-new-MARK-v1.md contains the detailed Tasks 1–14. These require catalog/ISBN/author/title/review reads, registration, login, owner-only review addition/modification/deletion, Session and JWT authentication, and four Axios methods with promises/callbacks/async-await. Task 8 explicitly sends review as a query parameter; both the implementation and recaptured curl evidence support this actual protocol.

## Implemented local behavior

- Public GET routes: `/`, `/isbn/:isbn`, `/author/:author`, `/title/:title`, `/review/:isbn`.
- `POST /register` and `POST /customer/login`. Passwords are hashed with asynchronous scrypt; JWTs are stored in server-side sessions and verified before protected requests.
- `PUT /customer/auth/review/:isbn` adds or updates the logged-in user's review; `DELETE` on the same route removes only that user's review. A supplied username cannot redirect a write to another user's review.
- Four exported Axios helpers in `final_project/router/general.js`: `getAllBooks(callback)`, `getBookByISBN`, `getBooksByAuthor`, and `getBooksByTitle`.
- Concurrent HTTP tests cover isolated users, duplicate-registration races, unauthorized writes, ownership, filters, missing books, and all four actual Axios HTTP calls.

This remains an in-memory course demo. Data and ephemeral signing/session secrets reset on restart; Express MemoryStore is not a production store. The development cookie is intended for local HTTP and is not a production HTTPS configuration. Test and evidence accounts are synthetic examples, not real account credentials.

## Run and verify

From `final_project`, run `npm ci --ignore-scripts`, `npm test`, and `npm start`. Dependencies include the starter's Express/session packages, jsonwebtoken 9, and the rubric-required Axios package. Installation lifecycle scripts were disabled. No global packages or `.env` files were created or edited.

The first test invocation could not access loopback networking in the restricted execution environment; the same tests passed when local network access was enabled. The successful run reported 6 tests passed and 0 failed; `node --check` also passed for the three implementation files. See `final_project/test-results.txt` for genuine test output. These are local tests, not Coursera grading.

`node scripts/capture-evidence.js` runs a temporary loopback-only server and captures real curl command/output files for `getallbooks`, `getbooksbyISBN`, `getbooksbyauthor`, `getbooksbytitle`, `getbookreview`, `register`, `login`, `reviewadded`, and `deletereview`. It also records actual Axios results. Capture commands are rendered using Git Bash/POSIX quoting; outputs are produced by actual requests, not invented. A generated cookie jar belongs only to the synthetic local demo and must not be published.

## Still pending

1. All fourteen lab requirements have been mapped below; the current grading form and permitted assistance rules still need inspection. No local mapping establishes a platform pass.
2. Verify any course-specific permitted AI-use rules before using this draft as assessed work. A grader using AI is not permission to claim AI-generated work as unaided work.
3. If authorized, create the learner's actual fork and publish reviewed changes; then capture its real parent full name and actual `general.js` public URL. Task 14 specifically queries `.parent.full_name`, whose expected real value is `ibm-developer-skills-network/expressBookReviews`; a clone URL is not the exact required output. No fork or URL evidence is fabricated locally.
4. Review and submit actual deliverables through the approved route only after personal declarations/terms are handled by the learner. Verify the real project grade and certificate separately.

No remote write, publication, push, or course submission was performed by this worker.

## Detailed task mapping

| Tasks | Required artifact or behavior | Local state |
|---|---|---|
| 1–5 | Five book-list/filter/review GET routes and named curl outputs | Implemented and genuinely captured as getallbooks, getbooksbyISBN, getbooksbyauthor, getbooksbytitle, getbookreview |
| 6 | Body username/password registration, duplicate/missing-input errors, register output | Implemented; real curl success evidence; errors tested |
| 7 | customer/login; session-level signed JWT; login output | Implemented; genuine login curl output; isolated user sessions tested |
| 8 | PUT review query parameter; add/update under session username; reviewadded output | Implemented; query-protocol evidence captured; ownership and concurrent users tested |
| 9 | DELETE auth/review/:isbn for the session user's review only; deletereview output | Implemented; genuine curl output and ownership tests |
| 10–13 | Four Axios promise/async methods in general.js; actual published general.js URL | Code implemented and actual local HTTP helper results captured; public URL remains pending |
| 14 | Actual public fork, committed/pushed implementation, githubrepo curl output of parent.full_name | No remote operation performed; genuinely pending |
