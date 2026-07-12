# Diagnostics

Run `effect-tsgo patch` to prepare the backend and `tsgo --noEmit` for primary
Effect diagnostics. The language-service plugin treats errors, warnings,
suggestions, and messages as a zero-tolerance gate. Do not suppress or weaken
the configured policy to evade diagnostics.
