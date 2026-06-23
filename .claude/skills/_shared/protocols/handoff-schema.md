# Handoff Schema

The data contract each transition must carry forward.

| Transition | Must include |
|------------|--------------|
| /learn → /explore | JTBD statement, occasion, job, outcome map, sizing estimate, confidence level |
| /explore → /assess | Chosen direction, variations explored, customer journey, prototype URLs |
| /assess → /prove | Metric tree (north star + inputs), kill criteria, baselines, instrumentation gaps |
| /prove → /ship | Feasibility scoring (Green/Yellow required), risk register, recommended direction |

A skill validates the handoff on entry: if a required field is missing, flag it before starting rather than inventing it.
