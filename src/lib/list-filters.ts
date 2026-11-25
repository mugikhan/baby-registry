import { z } from "zod";

const MAX_QUERY_LENGTH = 100;

const QuerySchema = z
  .union([z.string(), z.number(), z.boolean()])
  .transform((value) => String(value).trim().slice(0, MAX_QUERY_LENGTH))
  .transform((value) => value || undefined);

export const GuestListFiltersSchema = z.object({
  q: QuerySchema.optional().catch(undefined),
  category: z.coerce.number().int().positive().optional().catch(undefined),
  needed: z
    .union([z.literal(true), z.literal(1)])
    .transform(() => true as const)
    .optional()
    .catch(undefined),
});

export type GuestListFilters = z.infer<typeof GuestListFiltersSchema>;
