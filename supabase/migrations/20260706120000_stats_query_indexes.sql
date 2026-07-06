CREATE INDEX IF NOT EXISTS "days_user_date_desc_idx"
  ON "public"."Days" ("user_id", "date" DESC);

CREATE INDEX IF NOT EXISTS "task_tags_user_id_idx"
  ON "public"."Task_Tags" ("user_id");

CREATE INDEX IF NOT EXISTS "tasks_user_date_idx"
  ON "public"."Tasks" ("user_id", "date");
