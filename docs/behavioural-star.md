# 11. Behavioural STAR bank and interview-day checklist

Prepare eight real stories and you can answer almost any behavioural question by adapting one of them. Each story should take under two minutes, with most of the time on your actions and a measurable result.

## 11.1 Map your stories to common questions

| Question theme | Typical wording | Story from this guide to adapt |
| --- | --- | --- |
| Technical challenge | "Tell me about the hardest bug you fixed." | 1.13 race condition, 3.9 render loop |
| Performance | "Tell me about a time you improved performance." | 9.8 listing page |
| Leading change | "Tell me about a time you introduced a new tool or practice." | 2.8 TypeScript migration, 4.9 TanStack Query |
| Quality and reliability | "Tell me about a production incident." | 5.9 error boundaries, 8.11 XSS |
| Cross-team work | "Tell me about working with other teams." | 7.10 design system |
| Users and inclusion | "Tell me about building for users with different needs." | 6.7 accessibility audit |
| Conflict | "Tell me about a disagreement with a colleague." | 11.2 below |
| Failure | "Tell me about a mistake you made." | 11.3 below |
| Deadline pressure | "Tell me about delivering under a tight deadline." | 11.4 below |
| Mentoring | "Tell me about helping someone grow." | 11.5 below |

## 11.2 Conflict: disagreeing on technical direction

- **Situation**: A senior colleague wanted to add Redux to a new project from day one; I thought it was too heavy for what we knew so far.
- **Task**: We had to agree on an approach before the sprint started, without damaging the working relationship.
- **Action**: I asked to understand their concerns first: they had been burned by prop drilling in a previous project. I suggested we list the state we expected and classify it. Most of it was server data. We agreed on TanStack Query plus context for auth, with a written decision record that said we would add a store if client state grew past an agreed point.
- **Result**: We shipped the first release on time with a small codebase. Six months later we added Zustand for the editor, exactly as the record anticipated. My colleague and I now review each other's architecture proposals by default.

## 11.3 Failure: a release that broke the checkout

- **Situation**: I shipped a refactor of the address form that passed tests but broke checkout for users with saved addresses from an old format.
- **Task**: As the author, I owned the fix and the follow-up.
- **Action**: I turned off the feature flag within 20 minutes of the first alert, confirmed orders recovered, and told the team and support exactly what happened. I wrote a migration for the old format and a test using real anonymised data shapes. In the postmortem I owned the gap: I had tested only the new data shape.
- **Result**: The fix shipped the next day. We added production-like fixtures to the test suite and a rule that risky checkout changes roll out to 5% of users first. I now ask "what old data could hit this?" for every form change.

## 11.4 Tight deadline: scoping down to ship

- **Situation**: A client demo was moved two weeks earlier, and our team had a reporting dashboard half built.
- **Task**: As frontend lead, I had to decide what we could ship well in the time.
- **Action**: I met the product manager and ranked features by what the demo actually needed. We cut export and custom date ranges, kept three core charts, and agreed that everything shown would be production quality, not mocked. I split the work into parallel tasks, used MSW mocks so the frontend did not wait on backend, and held a 10-minute daily check on blockers.
- **Result**: We delivered the demo on time and the client signed. The cut features shipped in the following sprint. The prioritisation template we used became our standard for deadline changes.

## 11.5 Mentoring a junior developer

- **Situation**: A junior developer on my team was struggling with React hooks and their pull requests needed several review rounds.
- **Task**: I wanted them to become independent on features within a quarter.
- **Action**: We paired twice a week, with them driving. I wrote short review comments that explained *why*, linking to docs, and picked tickets that stretched them one step at a time. I asked them to present a hooks topic at our team session, which made them learn it deeply.
- **Result**: By the end of the quarter, their pull requests usually passed in one round, and they owned a full feature. They later mentored the next new joiner.

## 11.6 Tips for telling STAR stories

- Say "I", not "we", for your actions. Interviewers are hiring you.
- Quantify results: time saved, errors reduced, metrics improved, users affected.
- Include what you learned, especially for failures.
- Keep situation and task short; spend 60% of the time on action.
- Be honest. Expect follow-ups like "what would you do differently?" and "what did others think?".

## 11.7 Interview-day checklist

**Before**

- [ ] Read the job description and map each requirement to a story or skill.
- [ ] Research the company's product; open it in DevTools and note one thing you would improve.
- [ ] Rehearse eight STAR stories out loud.
- [ ] Practise `debounce`, `throttle`, `Promise.all`, a `useFetch` hook and a todo app without help.
- [ ] Practise one system design question out loud with the RADIO framework.
- [ ] Test your camera, microphone, screen sharing and editor setup.

**During the coding round**

- [ ] Repeat the problem back and ask clarifying questions.
- [ ] Talk through your approach before typing.
- [ ] Start simple and working, then improve.
- [ ] Handle edge cases: empty input, errors, loading, accessibility.
- [ ] Test your own code and say what you would add with more time.

**During behavioural and design rounds**

- [ ] Use STAR; keep each answer under two minutes.
- [ ] State trade-offs explicitly ("I chose X over Y because...").
- [ ] Ask two or three thoughtful questions at the end (10.9).

**After**

- [ ] Write down every question you were asked and how you answered.
- [ ] Send a short thank-you note if appropriate.
- [ ] Update this guide with what you learned.
