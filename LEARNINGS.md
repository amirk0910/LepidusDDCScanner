# What I learned

After each phase, the Agent asks the developer for one useful learning and records it briefly.

Drafted by the agent from defects and decisions that actually happened in this build. **Developer: review and edit these in your own words.**

- **Planning:** Read the briefs and the design contract before coding. The contract's React chart package was not on npm, so I asked and recorded an approved exception instead of silently substituting.
- **Detection:** Boundary rules decide accuracy. A supplied fixture exposed that a full stop after a valid card hid it; consuming whole numeric runs and handling sentence punctuation fixed it, with regression tests.
- **Security/persistence:** Enforce privacy in the database as well as the app: one write path through a function, constraints that reject unmasked examples, and RLS. Prove rollback and isolation on real PostgreSQL, then on the live project.
- **UI:** Use the semantic token that matches the surface. A navigation text token was black in high contrast on a black panel and hid the headline; check every theme. A persistent layout removed the per-page loading screen.
- **Testing/deployment:** Diagnose from evidence. Server logs and a connectivity check showed TLS inspection breaking Node's trust, fixed by using the OS certificate store rather than disabling verification. Vercel needed the framework pinned. Test the deployed API black-box, not only locally.
- **What I'd do differently:** Update `WORK_LOG.md` at every milestone (it went stale), run the live RLS and deployed tests earlier, add browser (Playwright) tests, and keep the repository private.
