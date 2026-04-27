# Mask Game persona catalog

The public repo ships **only the schema template** — see [`TEMPLATE.md`](./TEMPLATE.md).

Real-people briefs are **local-only by convention** (enforced by [`.gitignore`](../../.gitignore))
because a named brief in a public repo would surface in google results for that name.
Read the **Privacy posture** section of [`README.md`](./README.md) before adding briefs.

## What lives here in your local clone

| Slug | Source | Notes |
|---|---|---|
| `template` | [`TEMPLATE.md`](./TEMPLATE.md) | Fictional. Schema example. Useful for `bin/mask --list` smoke tests. |
| *(your local briefs)* | `<your-slug>.md` | Gitignored. Yours alone. Use with `bin/mask <your-slug>`. |

## Bridging real briefs into the public panel library

If you want a real-grounded archetype to ship in `personas/library.md` for `/tumble-dry`,
run `bin/mask anonymize <your-slug>` (added in PR #3). The anonymizer strips identity
before any content reaches a committed file.

See [opt-outs.md](./opt-outs.md) for people who have asked not to be simulated.
