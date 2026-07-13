# Cut over to V2 without a V1 adapter

The successor Effect Harness and Prelude baseline is V2-only: the new host
accepts the V2 config, Module, Plan, locator, and execution-hash shapes and does
not dual-load or implicitly adapt released V1 integrations. This makes an
upgrade temporarily breaking for integrations such as Psychogram until they
migrate, but avoids carrying two planning semantics into the recovered
baseline and keeps the old published V1 line as the explicit historical
compatibility boundary.
