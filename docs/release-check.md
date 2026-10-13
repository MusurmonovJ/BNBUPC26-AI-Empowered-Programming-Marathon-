# Contest release check

Checked on 13 October 2026 for the three-minute film and playable episode release.

## Verification

- 256 tests across 26 files passed; TypeScript checking passed.
- All three simulations passed with the established outcomes: daily 25/25, lazy 14/16, none 11/25.
- Production build passed. Vite reports the existing large-chunk advisory; rendering architecture was preserved for this release.
- The full film completed both seasons in isolated Chrome. The first rooftop became a seed; the second remained a ghost through its new connection. The ending exposed the gardening actions. No runtime exceptions were observed.
- A missing favicon request found during capture was fixed with an empty favicon declaration, preserving the interface's no-icons rule.
- Fresh screenshots cover the opening, quotation, planting, tending, quiet seed, ghost rooftop and ending.
- The npm audit of production dependencies reported zero vulnerabilities.

## Repository hygiene

The local audit scanned reachable text blobs, candidate source and documentation files, and production output for credential patterns and exact locally configured secret values. It found no suspected secret matches. Only `.env.example` is tracked; local environment files, deployment state and build output remain excluded.

Private QA files, isolated browser profiles, Office scratch files and local recordings are now ignored. Documentation and presentation materials remain in the repository but are excluded from the deployment upload. The source design system stays available to the build.

The audit is a bounded repository and bundle check, not a claim that every possible credential format is detectable. Secret values were not printed or copied into the report.

## Submission materials

The README now presents the current episode and film, controls, privacy, local setup and curated screenshots. `SUBMISSION.md` includes the creator's declaration that all code, design and content were created during the competition. The film and playable links use the established production hostname.

## Human checks still to complete

- Listen to the final mix on the speakers used for recording.
- Record and upload the video, then add its actual public URL to `SUBMISSION.md`.
- Add the organizer's voting destination when it becomes available.
- Run the unfamiliar-visitor check; do not mark it complete without participants.

The website currently uses English copy. Chinese presentation wording is supplied in the presentation plan; it is not an implemented Chinese interface in this release.
