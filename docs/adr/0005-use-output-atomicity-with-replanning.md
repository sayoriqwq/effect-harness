# Use Output Atomicity with replanning

Prelude guarantees Output Atomicity rather than a persistent transaction over
an entire Plan. If a later Output or install step fails, completed Outputs may
remain converged while the Integration is visibly incomplete; Prelude must not
run Checks or report success, and a fresh Plan resumes convergence from the
observed state. Each managed or pinned tree is still staged and replaced as a
whole. This accepts a temporary mixed state after failure in order to avoid
reintroducing backups, journals, receipts, crash recovery, and rollback
lifecycle ownership.
