# Phase 3: CORE-HARDEN - Context

**Mode:** Auto-generated

<domain>
## Phase Boundary
Cross-cutting hardening of v0.4.2 core before larger artifacts (FORMAT) and larger blast radius (CODE) compound bugs. Six items derived from PITFALLS research.

**HARDEN-01..06 in REQUIREMENTS.md.**
</domain>

<decisions>
Implementation at Claude's discretion. Defaults grounded in:
- PITFALLS.md Pitfall 17 (convergence by claim-suppression) → HARDEN-01/02
- PITFALLS.md Pitfall 19 (markdown-aware drift) → HARDEN-02
- PITFALLS.md Pitfall 20 (token-Jaccard brittleness) → HARDEN-03
- ARCHITECTURE.md "filesystem is IPC" → HARDEN-04 (round-N briefs reference round-(N-1) aggregate)
- PITFALLS.md trace retention → HARDEN-05
- PITFALLS.md `.gitignore` bootstrap → HARDEN-06
</decisions>
