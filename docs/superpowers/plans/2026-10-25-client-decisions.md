# Client decision presentation implementation plan

> Execute in the existing checkout with the user's explicit main-branch workflow; use test-driven-development and one final independent review.

**Goal:** Explain the bank's current decision, actual offer and next step without exposing internal scoring information.

**Architecture:** Keep the existing application list/card and contract flow. Share status labels and offer eligibility between presentation components. Render the API's client-facing explanations directly; never infer decisions from scoring or scrub arbitrary server text.

**Tech Stack:** React, TypeScript, Vitest, existing HTTP adapter and Docker.

**Spec:** User requirements of 25 October 2026, summarized below.

## Requirements and constraints

- Determine current state from `application.status.code`; use `decision.type/isFinal` for decision details and `availableActions` for buttons.
- Approved: “Одобрено”; conditions: “Одобрено с условиями”; manual: “Заявку рассматривает менеджер”; refused: “Банк не одобрил заявку”. Preserve later statuses.
- Actual figures come from `offer`. Compare only requested and offered amount/term, highlighting real differences. Name additional requirements “Условия предложения”.
- Keep polling, simulated-manager disclosure, missing-data fallbacks, nullable totals and the contract/signature/payout flow.
- Client reasons/history/feed are supplied by backend `ff73937` on `codex/logreg-integration`; preserve the deployed `rules-0.3` model and do not modify backend source.
- Do not render scoring, machine reason codes or intermediate recommended offers. Existing frontend has no feed or bank UI; verify feed and employee scoring through their API endpoints.

## Review focus

Non-final recommendations with an approved type must stay pending; conditions may require documents with unchanged amount; old applications may omit optional details; later statuses must supersede the original approval; reason codes must stay internal.

## Tasks

### 1. Shared presentation rules and safe examples

Files: `src/features/application/clientDecision.ts`, `src/api/mockDecisionData.ts`, corresponding tests.

- [x] Add failing tests for four outcome labels, later statuses, finality, missing offer and nullable totals.
- [x] Implement shared helpers and client-safe example decisions; preserve the API contract and existing mocks.
- [x] Run targeted tests.

### 2. Card, list and history

Files: `ApplicationPage.tsx`, `ApplicationsListPage.tsx`, `DecisionDetails.tsx`, `desktop.css`, card/list tests.

- [x] Add failing tests for unchanged amounts with document requirements, highlighted amount/term changes, manual-to-final refresh and legacy omissions.
- [x] Display client labels consistently, use actual offer values, render API requirements/reasons with honest fallbacks, keep later states/actions.
- [x] Run the complete suite with one worker and production build.

### 3. API integration and delivery

Files: `README.md`, this checklist; runtime evidence stays outside the repository.

- [x] Run the published backend branch locally with unchanged scoring configuration and database.
- [x] Verify client card/history/feed texts and employee scoring; browser-check the existing flow.
- [x] Request a fresh read-only review and fix material findings.
- [x] Confirm tests/build/Docker and prepare the reviewed frontend changes for the authorized main push and delivery report.

## Verification record

- 110 frontend tests pass; TypeScript/Vite production build and API Docker build pass.
- Live API: AC-000016 approved and completed the browser contract/signature/payout path; AC-000020 approved with conditions and unchanged amount/term; AC-000018 progressed through ManualReview to a simulated refusal; AC-000019 refused.
- The stored client_medium company differs from the latest seed example: the live conditional-approval check used 300,000 RUB over 24 months. Stored financial data and scoring configuration were preserved. Reduced amount and extra document requirements are covered by frontend fixtures/tests.
- Client legacy card/history and 100 feed items checked; employee scoring stays available, with External/rules-0.3. No standalone feed/bank UI was added.
- Independent review found an intermediate-offer cancellation edge case; fixed with a red/green regression. Final review has no remaining Important/Critical findings.
