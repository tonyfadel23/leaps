# Handoff Schema

The data contract each transition must carry forward.

| Transition | Must include |
|------------|--------------|
| /1 → /2 | JTBD statement, occasion, job, outcome map, sizing estimate, confidence level |
| /2 → /3 | Chosen direction, variations explored, customer journey, prototype URLs |
| /3 → /4 | Metric tree (north star + inputs), kill criteria, baselines, instrumentation gaps |
| /4 → /5 | Feasibility scoring (Green/Yellow required), risk register, recommended direction |

A skill validates the handoff on entry: if a required field is missing, flag it before starting rather than inventing it.
