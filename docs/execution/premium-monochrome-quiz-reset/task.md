# premium monochrome quiz reset

## target

- replace the beige editorial quiz shell with a premium monochrome, sans-only, mobile-first renderer.
- hard-cut the quiz contract to `quiz-funnel.v2`.
- ship the live funnel on slug `symptom-profile-v2`.
- make admin preview use the exact production renderer in `preview` mode with analytics disabled.

## implementation notes

- canonical spec: `content/quizzes/symptom-profile-v2.json`
- schema: `lib/quizzes/schema.ts`
- shared renderer: `components/quiz/QuizExperience.tsx`
- live wrapper: `components/quiz/QuizPlayerClient.tsx`
- admin preview/editor: `app/admin/quizzes/[id]/page.tsx`
- live slug constant: `lib/quizzes/constants.ts`

## local verification

- `npm run lint`
- `npm run quiz:validate -- content/quizzes/symptom-profile-v2.json`
- `npm run quiz:preview -- symptom-profile-v2`
- `npm run build`
- `npm run quiz:publish -- content/quizzes/symptom-profile-v2.json --env production`
- `BASE_URL=http://127.0.0.1:3300 REGRESSION_QUIZ_SLUG=symptom-profile-v2 REGRESSION_ARTICLE_SLUG=what-i-discovered-about-bacteria-changed-efv22a npm run test:regression`
- `BASE_URL=http://127.0.0.1:3300 REGRESSION_QUIZ_SLUG=symptom-profile-v2 REGRESSION_ARTICLE_SLUG=what-i-discovered-about-bacteria-changed-efv22a npm run test:perf`
- `BASE_URL=http://127.0.0.1:3300 ADMIN_EMAIL=<temp> ADMIN_PASSWORD=<temp> npm run test:admin:geometry`
- `BASE_URL=http://127.0.0.1:3300 SNAPSHOT_SET=quiz-monochrome-local REGRESSION_QUIZ_SLUG=symptom-profile-v2 ADMIN_EMAIL=<temp> ADMIN_PASSWORD=<temp> npm run test:admin:visual`

## production cutover

- push committed github state.
- wait for deployment to complete on the canonical domain.
- verify `https://news.tophealthinsider.com/quiz/symptom-profile-v2`.
- archive the old `symptom-profile` definition after the new production links are live so the old parser path does not remain published.
