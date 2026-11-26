import { z } from "zod";

// Zod probes Function("") for JIT, which the CSP reports as an eval violation.
z.config({ jitless: true });
