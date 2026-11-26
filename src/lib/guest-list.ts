import { z } from "zod";

const CategorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  emoji: z.string(),
});

const ItemBaseShape = {
  id: z.number().int(),
  title: z.string(),
  note: z.string(),
  categoryId: z.number().int(),
  emoji: z.string().nullable(),
  link: z.string().nullable(),
};

const GiftSchema = z.object({
  ...ItemBaseShape,
  kind: z.literal("gift"),
  qty: z.number().int(),
  taken: z.number().int(),
  takenBy: z.array(z.string()),
  takenOn: z.string().nullable(),
});

const FundSchema = z.object({
  ...ItemBaseShape,
  kind: z.literal("fund"),
  givers: z.number().int(),
});

const ItemSchema = z.discriminatedUnion("kind", [GiftSchema, FundSchema]);

export const GuestListSchema = z.object({
  title: z.string(),
  categories: z.array(CategorySchema),
  items: z.array(ItemSchema),
});

export type GuestListCategory = z.infer<typeof CategorySchema>;
export type GuestListGift = z.infer<typeof GiftSchema>;
export type GuestListFund = z.infer<typeof FundSchema>;
export type GuestListItem = z.infer<typeof ItemSchema>;
export type GuestList = z.infer<typeof GuestListSchema>;
