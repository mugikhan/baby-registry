// Synthetic demo data. Slice 1 replaces it with D1 rows.
export type Category = {
  id: string;
  name: string;
  emoji: string;
};

export type RegistryItem = {
  id: number;
  type: "gift" | "fund";
  title: string;
  note: string;
  categoryId: string;
  emoji?: string;
  photoUrl?: string;
  link?: string;
  qty: number;
  takenBy: string[];
  takenOn?: string;
  yours?: boolean;
  givers?: number;
};

export const sampleCategories: Category[] = [
  { id: "sleep", name: "Sleep", emoji: "🛏️" },
  { id: "bath", name: "Bath", emoji: "🛁" },
  { id: "feeding", name: "Feeding", emoji: "🍼" },
  { id: "out", name: "Out & about", emoji: "🚗" },
];

export const sampleItems: RegistryItem[] = [
  {
    id: 1,
    type: "gift",
    title: "Hooded towels",
    note: "Soft cotton, any pale colour.",
    categoryId: "bath",
    qty: 3,
    takenBy: ["Aunty Naledi"],
    takenOn: "12 Nov",
  },
  {
    id: 2,
    type: "fund",
    title: "Pram fund",
    note: "Towards a pram that folds small enough for a Polo boot.",
    categoryId: "out",
    emoji: "💰",
    qty: 1,
    takenBy: [],
    givers: 3,
  },
  {
    id: 3,
    type: "gift",
    title: "Night light",
    note: "A warm, dim one with an auto-off timer.",
    categoryId: "sleep",
    emoji: "🌙",
    qty: 1,
    takenBy: ["Gran"],
    takenOn: "25 Nov",
  },
  {
    id: 4,
    type: "gift",
    title: "Swaddle blankets",
    note: "Breathable muslin, 100 cm square or bigger.",
    categoryId: "sleep",
    emoji: "🧣",
    link: "https://example.com/swaddle-blankets",
    qty: 4,
    takenBy: [],
  },
  {
    id: 5,
    type: "gift",
    title: "Bottle steriliser",
    note: "Electric, fits at least four bottles.",
    categoryId: "feeding",
    emoji: "🍼",
    link: "https://example.com/bottle-steriliser",
    qty: 1,
    takenBy: [],
  },
  {
    id: 6,
    type: "gift",
    title: "Muslin cloths",
    note: "A pack of six is plenty.",
    categoryId: "feeding",
    emoji: "🧺",
    qty: 2,
    takenBy: ["You"],
    yours: true,
  },
  {
    id: 7,
    type: "gift",
    title: "Travel cot",
    note: "Light enough to carry up the stairs.",
    categoryId: "sleep",
    emoji: "🧸",
    qty: 2,
    takenBy: ["Uncle Sipho", "Aunty Zinhle"],
    takenOn: "20 Nov",
  },
  {
    id: 8,
    type: "gift",
    title: "Baby bath tub",
    note: "With a newborn insert, if you can find one.",
    categoryId: "bath",
    emoji: "🛁",
    qty: 1,
    takenBy: [],
  },
  {
    id: 9,
    type: "gift",
    title: "Car window shades",
    note: "Two, with suction cups.",
    categoryId: "out",
    qty: 1,
    takenBy: [],
  },
];
