# Claims Cache

Persist data findings across skills so a number is pulled once.

- Store every sourced finding in `pipeline/{slug}/.claims.json`: `[{ text, value, source, sourceUrl, pulledBy, at }]`.
- Before pulling data, check the cache for an existing finding. Reuse it (cite the original source) rather than re-querying.
- Claims feed the conviction engine's Evidence dimension — a cached claim keeps its `source`, so the rigor gate still holds.
