# Contest release check

## Language-only update — 14 October 2026

English, Simplified Chinese, and bilingual display modes are available from the opening screen and existing settings, with direct `lang=en`, `lang=zh`, and `lang=bi` links. Bilingual film titles/captions and authored memory quotations retain their English text with Chinese alongside it. Other controls use the selected language; bilingual controls use Chinese. Visitors' own writing remains verbatim.

- The full test suite, nine new language regression tests, typechecking, and the production build pass.
- Simulations retain daily 25/25, lazy 14/16, and none 11/25.
- Full bilingual films completed in isolated Chrome and Edge at 1440 × 900. Caption beats, both seasons, closing lines, and playable ending were checked. No runtime exceptions or failed requests occurred on these completed runs. Edge's first unattended run stopped progressing; the repeat with background throttling disabled passed. The application's clock was not changed.
- Chinese opening, fragment selection, and readonly planting text were checked. Switching language on the opening does not start the film. Chinese ghost/lost quotations use the existing word-loss renderer rather than exposing the whole translation.
- Diff checks confirm no changes to engine, store, scene, sound, tagging, server/API, authored data, film timeline, or the original word-loss rules. Styles added only support translated text and language selection. No new dependencies were added.
- Existing recordings and the separate presentation prompt were left untouched.

The report below describes the earlier 13 October release.

Checked on 13 October 2026 for the three-minute film and playable episode release.

## Verification

- 256 tests across 26 files passed; TypeScript checking passed.
- All three simulations passed with the established outcomes: daily 25/25, lazy 14/16, none 11/25.
- Production build passed. Vite reports the existing large-chunk advisory; rendering architecture was preserved for this release.
- The full film completed both seasons in isolated Chrome. The first rooftop became a seed; the second remained a ghost through its new connection. The ending exposed the gardening actions. No runtime exceptions were observed.
- A missing favicon request found during capture was fixed with an empty favicon declaration, preserving the interface's no-icons rule.
- Fresh screenshots cover the opening, quotation, planting, tending, quiet seed, ghost rooftop and ending.
- The npm audit of production dependencies reported zero vulnerabilities.
- The production site at `https://lethe-nine.vercel.app` was checked anonymously after deployment. Its full three-minute film completed with no runtime exceptions or failed requests. The homepage, client assets and preview image returned 200; invalid tagging input returned 400 and the configured Groq endpoint returned valid tags with 200.
- Public probes for local environment files, Git metadata, private QA and presentation artifacts returned 404. No locally configured secret values were found in the deployed client.

The deployed application comes from commit `80a98c3`. The subsequent changes to this report and the recording guide are documentation only. Both repositories contain matching release file trees, with their existing branch histories preserved.

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
