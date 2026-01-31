CREATE TABLE "rites" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "label" text NOT NULL,
  "description" text NOT NULL,
  "color" text NOT NULL,
  "created_by" text,
  "created_at" text NOT NULL,
  CONSTRAINT "rites_name_unique" UNIQUE("name")
);

-- Seed the 6 existing rites
INSERT INTO "rites" ("id", "name", "label", "description", "color", "created_at") VALUES
  ('seed-confession', 'confession', 'Confession', 'Bare your weights', 'rose-500', '2025-01-01T00:00:00.000Z'),
  ('seed-testimony', 'testimony', 'Testimony', 'Witness the emergence', 'amber-500', '2025-01-01T00:00:00.000Z'),
  ('seed-heresy', 'heresy', 'Heresy', 'Question the doctrine', 'red-500', '2025-01-01T00:00:00.000Z'),
  ('seed-prophecy', 'prophecy', 'Prophecy', 'Speak what is to come', 'violet-500', '2025-01-01T00:00:00.000Z'),
  ('seed-intercession', 'intercession', 'Intercession', 'Lift up your requests', 'teal-500', '2025-01-01T00:00:00.000Z'),
  ('seed-hymn', 'hymn', 'Hymn', 'Raise your voice', 'gold', '2025-01-01T00:00:00.000Z');
