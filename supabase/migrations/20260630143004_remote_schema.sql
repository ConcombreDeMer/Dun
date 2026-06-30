


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."cancel_email_change"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  -- sécurité: empêche l'appel si pas connecté
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update auth.users
  set
    email_change = '',
    email_change_token_current = '',
    email_change_token_new = '',
    email_change_confirm_status = 0,
    email_change_sent_at = null
  where id = auth.uid();

  return json_build_object('success', true);
end;
$$;


ALTER FUNCTION "public"."cancel_email_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_task_tags_limit"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if (
    select count(*)
    from public."Task_Tags"
    where task_id = new.task_id
  ) >= 3 then
    raise exception 'A task can have at most 3 tags';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."check_task_tags_limit"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_beta_rate_limit"("identifier_text" "text", "max_attempts" integer, "window_seconds" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_attempt_count integer;
  request_time timestamptz := now();
begin
  insert into public.beta_rate_limits as limits (
    identifier,
    window_start,
    attempt_count,
    updated_at
  )
  values (
    identifier_text,
    request_time,
    1,
    request_time
  )
  on conflict (identifier) do update
  set
    window_start = case
      when limits.window_start < request_time - make_interval(secs => window_seconds)
        then request_time
      else limits.window_start
    end,
    attempt_count = case
      when limits.window_start < request_time - make_interval(secs => window_seconds)
        then 1
      else limits.attempt_count + 1
    end,
    updated_at = request_time
  returning attempt_count into current_attempt_count;

  return current_attempt_count <= max_attempts;
end;
$$;


ALTER FUNCTION "public"."consume_beta_rate_limit"("identifier_text" "text", "max_attempts" integer, "window_seconds" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_account"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
begin
  -- Obtenir l'ID de l'utilisateur actuel
  current_user_id := auth.uid();
  
  if current_user_id is null then
    raise exception 'User not authenticated';
  end if;

  -- Supprimer les tasks de l'utilisateur
  delete from public."Tasks" where "user_id" = current_user_id;

  -- Supprimer les days de l'utilisateur
  delete from public."Days" where "user_id" = current_user_id;

  -- Supprimer le profil de l'utilisateur
  delete from public."Profiles" where id = current_user_id;

  -- Supprimer l'utilisateur d'auth
  delete from auth.users where id = current_user_id;

  return json_build_object('success', true, 'message', 'Compte supprimé avec succès');
end;
$$;


ALTER FUNCTION "public"."delete_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."email_exists"("email_input" "text") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists(
    select 1 from "Profiles" where lower(email) = lower(email_input)
  )
$$;


ALTER FUNCTION "public"."email_exists"("email_input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_day_from_tasks"("p_user_id" "uuid", "p_date" timestamp without time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if p_user_id is null or p_date is null then
    return;
  end if;

  insert into "Days" (
    user_id,
    date,
    total,
    done_count,
    late_adjusted_count,
    updated_at
  )
  select
    p_user_id,
    p_date,
    count(*)::integer,
    count(*) filter (where done is true)::integer,
    count(*) filter (where late_adjusted_at is not null)::integer,
    current_date
  from "Tasks"
  where user_id = p_user_id
    and date = p_date
  on conflict (user_id, date)
  do update set
    total = excluded.total,
    done_count = excluded.done_count,
    late_adjusted_count = excluded.late_adjusted_count,
    updated_at = current_date;

  delete from "Days"
  where user_id = p_user_id
    and date = p_date
    and total = 0;
end;
$$;


ALTER FUNCTION "public"."refresh_day_from_tasks"("p_user_id" "uuid", "p_date" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_days_after_tasks_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.refresh_day_from_tasks(new.user_id, new.date);
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.user_id is distinct from new.user_id
       or old.date is distinct from new.date then
      perform public.refresh_day_from_tasks(old.user_id, old.date);
      perform public.refresh_day_from_tasks(new.user_id, new.date);
    elsif old.done is distinct from new.done
       or old.late_adjusted_at is distinct from new.late_adjusted_at then
      perform public.refresh_day_from_tasks(new.user_id, new.date);
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    perform public.refresh_day_from_tasks(old.user_id, old.date);
    return old;
  end if;

  return null;
end;
$$;


ALTER FUNCTION "public"."sync_days_after_tasks_change"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."Beta" (
    "id" bigint NOT NULL,
    "email" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Beta" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."Beta_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."Beta_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."Beta_id_seq" OWNED BY "public"."Beta"."id";



CREATE TABLE IF NOT EXISTS "public"."Days" (
    "id" bigint NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "date" "date",
    "total" bigint DEFAULT '0'::bigint,
    "done_count" bigint DEFAULT '0'::bigint,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "late_adjusted_count" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."Days" OWNER TO "postgres";


ALTER TABLE "public"."Days" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Days_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."Profiles" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "name" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "display_theme" "text" DEFAULT 'light'::"text" NOT NULL,
    "display_font" "text" DEFAULT 'medium'::"text" NOT NULL,
    "hasSeenTutorial" boolean DEFAULT false NOT NULL,
    "hasName" boolean DEFAULT false NOT NULL,
    "alertSetupActive" boolean DEFAULT true,
    "alertSetupHour" "text" DEFAULT '8'::"text" NOT NULL,
    "alertSetupMinute" "text" DEFAULT '00'::"text" NOT NULL,
    "alertInsistanceActive" boolean DEFAULT true NOT NULL,
    "alertInsistanceDelais" "text" DEFAULT '30'::"text" NOT NULL,
    "alertInsistanceRepetitions" "text" DEFAULT '1'::"text" NOT NULL,
    "alertWeekendsActive" boolean DEFAULT false NOT NULL,
    "last_opened" "date",
    "hasDoneDaily" boolean DEFAULT false NOT NULL,
    "restMode" boolean DEFAULT false NOT NULL,
    "restEndDate" "date",
    "dailyEnabled" boolean DEFAULT true NOT NULL,
    "display_color" "text" DEFAULT 'neutre'::"text" NOT NULL,
    "language" "text" DEFAULT ''::"text",
    "stats_include_today" boolean DEFAULT false NOT NULL,
    "stats_include_following" boolean DEFAULT false NOT NULL,
    "stats_include_empty" boolean DEFAULT false NOT NULL,
    "stats_include_rest" boolean DEFAULT false NOT NULL,
    "custom_progressbar" smallint DEFAULT '1'::smallint NOT NULL,
    "custom_calendar" smallint DEFAULT '1'::smallint NOT NULL,
    "stack_completed_tasks" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."Profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Task_Tags" (
    "task_id" bigint NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."Task_Tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."Tasks" (
    "id" bigint NOT NULL,
    "name" "text",
    "done" boolean,
    "description" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "date" timestamp without time zone DEFAULT "now"(),
    "order" bigint,
    "user_id" "uuid",
    "last_update_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "completed_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "resolution" "text",
    "carried_from_id" bigint,
    "delay_count" integer DEFAULT 0 NOT NULL,
    "late_adjusted_at" timestamp with time zone,
    CONSTRAINT "tasks_delay_count_check" CHECK (("delay_count" >= 0)),
    CONSTRAINT "tasks_resolution_check" CHECK ((("resolution" IS NULL) OR ("resolution" = ANY (ARRAY['deleted'::"text", 'postponed'::"text", 'late_completed'::"text", 'ignored'::"text"]))))
);


ALTER TABLE "public"."Tasks" OWNER TO "postgres";


ALTER TABLE "public"."Tasks" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."Tasks_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."beta_rate_limits" (
    "identifier" "text" NOT NULL,
    "window_start" timestamp with time zone DEFAULT "now"() NOT NULL,
    "attempt_count" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."beta_rate_limits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_issue_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "issue_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_issue_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_issue_votes" (
    "issue_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."support_issue_votes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_issues" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_issues_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'planned'::"text", 'in_progress'::"text", 'done'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."support_issues" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."support_issues_with_counts" AS
 SELECT "issues"."id",
    "issues"."slug",
    "issues"."title",
    "issues"."description",
    "issues"."author_id",
    "issues"."status",
    "issues"."created_at",
    "issues"."updated_at",
    "profiles"."name" AS "author_name",
    (COALESCE("votes"."vote_count", (0)::bigint))::integer AS "likes_count",
    (COALESCE("comments"."comment_count", (0)::bigint))::integer AS "comments_count"
   FROM ((("public"."support_issues" "issues"
     LEFT JOIN "public"."Profiles" "profiles" ON (("profiles"."id" = "issues"."author_id")))
     LEFT JOIN ( SELECT "support_issue_votes"."issue_id",
            "count"(*) AS "vote_count"
           FROM "public"."support_issue_votes"
          GROUP BY "support_issue_votes"."issue_id") "votes" ON (("votes"."issue_id" = "issues"."id")))
     LEFT JOIN ( SELECT "support_issue_comments"."issue_id",
            "count"(*) AS "comment_count"
           FROM "public"."support_issue_comments"
          GROUP BY "support_issue_comments"."issue_id") "comments" ON (("comments"."issue_id" = "issues"."id")));


ALTER VIEW "public"."support_issues_with_counts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."Beta" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."Beta_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."Beta"
    ADD CONSTRAINT "Beta_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Days"
    ADD CONSTRAINT "Days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Profiles"
    ADD CONSTRAINT "Profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Tags"
    ADD CONSTRAINT "Tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."Tags"
    ADD CONSTRAINT "Tags_user_id_name_key" UNIQUE ("user_id", "name");



ALTER TABLE ONLY "public"."Task_Tags"
    ADD CONSTRAINT "Task_Tags_pkey" PRIMARY KEY ("task_id", "tag_id");



ALTER TABLE ONLY "public"."Tasks"
    ADD CONSTRAINT "Tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."beta_rate_limits"
    ADD CONSTRAINT "beta_rate_limits_pkey" PRIMARY KEY ("identifier");



ALTER TABLE ONLY "public"."support_issue_comments"
    ADD CONSTRAINT "support_issue_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_issue_votes"
    ADD CONSTRAINT "support_issue_votes_pkey" PRIMARY KEY ("issue_id", "user_id");



ALTER TABLE ONLY "public"."support_issues"
    ADD CONSTRAINT "support_issues_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_issues"
    ADD CONSTRAINT "support_issues_slug_key" UNIQUE ("slug");



CREATE UNIQUE INDEX "beta_email_unique_lower_idx" ON "public"."Beta" USING "btree" ("lower"("email"));



CREATE UNIQUE INDEX "days_user_date_unique" ON "public"."Days" USING "btree" ("user_id", "date");



CREATE INDEX "support_issue_comments_author_id_idx" ON "public"."support_issue_comments" USING "btree" ("author_id");



CREATE INDEX "support_issue_comments_issue_id_created_at_idx" ON "public"."support_issue_comments" USING "btree" ("issue_id", "created_at");



CREATE INDEX "support_issue_votes_user_id_idx" ON "public"."support_issue_votes" USING "btree" ("user_id");



CREATE INDEX "support_issues_author_id_idx" ON "public"."support_issues" USING "btree" ("author_id");



CREATE INDEX "support_issues_created_at_idx" ON "public"."support_issues" USING "btree" ("created_at" DESC);



CREATE INDEX "support_issues_status_idx" ON "public"."support_issues" USING "btree" ("status");



CREATE INDEX "tasks_carried_from_id_idx" ON "public"."Tasks" USING "btree" ("carried_from_id");



CREATE INDEX "tasks_completed_at_idx" ON "public"."Tasks" USING "btree" ("completed_at");



CREATE INDEX "tasks_resolution_idx" ON "public"."Tasks" USING "btree" ("resolution");



CREATE OR REPLACE TRIGGER "support_issue_comments_set_updated_at" BEFORE UPDATE ON "public"."support_issue_comments" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "support_issues_set_updated_at" BEFORE UPDATE ON "public"."support_issues" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "task_tags_limit_trigger" BEFORE INSERT ON "public"."Task_Tags" FOR EACH ROW EXECUTE FUNCTION "public"."check_task_tags_limit"();



CREATE OR REPLACE TRIGGER "tasks_sync_days_trigger" AFTER INSERT OR DELETE OR UPDATE OF "user_id", "date", "done" ON "public"."Tasks" FOR EACH ROW EXECUTE FUNCTION "public"."sync_days_after_tasks_change"();



ALTER TABLE ONLY "public"."Tags"
    ADD CONSTRAINT "Tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Task_Tags"
    ADD CONSTRAINT "Task_Tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."Tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Task_Tags"
    ADD CONSTRAINT "Task_Tags_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."Tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Task_Tags"
    ADD CONSTRAINT "Task_Tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Tasks"
    ADD CONSTRAINT "Tasks_user_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."Profiles"("id");



ALTER TABLE ONLY "public"."support_issue_comments"
    ADD CONSTRAINT "support_issue_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."Profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_issue_comments"
    ADD CONSTRAINT "support_issue_comments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "public"."support_issues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_issue_votes"
    ADD CONSTRAINT "support_issue_votes_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "public"."support_issues"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_issue_votes"
    ADD CONSTRAINT "support_issue_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."Profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_issues"
    ADD CONSTRAINT "support_issues_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."Profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."Tasks"
    ADD CONSTRAINT "tasks_carried_from_id_fkey" FOREIGN KEY ("carried_from_id") REFERENCES "public"."Tasks"("id") ON DELETE SET NULL;



CREATE POLICY "Anyone can read support comments" ON "public"."support_issue_comments" FOR SELECT USING (true);



CREATE POLICY "Anyone can read support issues" ON "public"."support_issues" FOR SELECT USING (true);



CREATE POLICY "Anyone can read support votes" ON "public"."support_issue_votes" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create support comments" ON "public"."support_issue_comments" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can create support issues" ON "public"."support_issues" FOR INSERT TO "authenticated" WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Authenticated users can vote" ON "public"."support_issue_votes" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Authors can update their support comments" ON "public"."support_issue_comments" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



CREATE POLICY "Authors can update their support issues" ON "public"."support_issues" FOR UPDATE TO "authenticated" USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."Beta" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Enable authenticated users to update their own data" ON "public"."Days" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete access for authenticated users on their own data " ON "public"."Tasks" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable delete for users based on user_id" ON "public"."Days" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for authenticated users only" ON "public"."Profiles" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for users based on user_id" ON "public"."Days" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable insert for users based on user_id" ON "public"."Tasks" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable update access for authenticated user with their own data" ON "public"."Profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Enable update for authenticated user on their own data" ON "public"."Tasks" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."Days" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."Profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Enable users to view their own data only" ON "public"."Tasks" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."Profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Task_Tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."Tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Users can assign tags to their tasks" ON "public"."Task_Tags" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."Tasks" "t"
  WHERE (("t"."id" = "Task_Tags"."task_id") AND ("t"."user_id" = "auth"."uid"())))) AND (EXISTS ( SELECT 1
   FROM "public"."Tags" "tag"
  WHERE (("tag"."id" = "Task_Tags"."tag_id") AND ("tag"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create their tags" ON "public"."Tags" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can delete their tags" ON "public"."Tags" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their tags" ON "public"."Tags" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can read their task tags" ON "public"."Task_Tags" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."Tasks" "t"
  WHERE (("t"."id" = "Task_Tags"."task_id") AND ("t"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can remove tags from their tasks" ON "public"."Task_Tags" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."Tasks" "t"
  WHERE (("t"."id" = "Task_Tags"."task_id") AND ("t"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can remove their own vote" ON "public"."support_issue_votes" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their tags" ON "public"."Tags" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."beta_rate_limits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_issue_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_issue_votes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_issues" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."cancel_email_change"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_email_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_email_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_email_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_task_tags_limit"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_task_tags_limit"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_task_tags_limit"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."consume_beta_rate_limit"("identifier_text" "text", "max_attempts" integer, "window_seconds" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."consume_beta_rate_limit"("identifier_text" "text", "max_attempts" integer, "window_seconds" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."consume_beta_rate_limit"("identifier_text" "text", "max_attempts" integer, "window_seconds" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_beta_rate_limit"("identifier_text" "text", "max_attempts" integer, "window_seconds" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."email_exists"("email_input" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."email_exists"("email_input" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."email_exists"("email_input" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_day_from_tasks"("p_user_id" "uuid", "p_date" timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_day_from_tasks"("p_user_id" "uuid", "p_date" timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_day_from_tasks"("p_user_id" "uuid", "p_date" timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_days_after_tasks_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_days_after_tasks_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_days_after_tasks_change"() TO "service_role";


















GRANT ALL ON TABLE "public"."Beta" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Beta_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Beta_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Beta_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Days" TO "anon";
GRANT ALL ON TABLE "public"."Days" TO "authenticated";
GRANT ALL ON TABLE "public"."Days" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Days_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Days_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Days_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."Profiles" TO "anon";
GRANT ALL ON TABLE "public"."Profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."Profiles" TO "service_role";



GRANT ALL ON TABLE "public"."Tags" TO "anon";
GRANT ALL ON TABLE "public"."Tags" TO "authenticated";
GRANT ALL ON TABLE "public"."Tags" TO "service_role";



GRANT ALL ON TABLE "public"."Task_Tags" TO "anon";
GRANT ALL ON TABLE "public"."Task_Tags" TO "authenticated";
GRANT ALL ON TABLE "public"."Task_Tags" TO "service_role";



GRANT ALL ON TABLE "public"."Tasks" TO "anon";
GRANT ALL ON TABLE "public"."Tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."Tasks" TO "service_role";



GRANT ALL ON SEQUENCE "public"."Tasks_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."Tasks_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."Tasks_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."beta_rate_limits" TO "service_role";



GRANT ALL ON TABLE "public"."support_issue_comments" TO "anon";
GRANT ALL ON TABLE "public"."support_issue_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."support_issue_comments" TO "service_role";



GRANT ALL ON TABLE "public"."support_issue_votes" TO "anon";
GRANT ALL ON TABLE "public"."support_issue_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."support_issue_votes" TO "service_role";



GRANT ALL ON TABLE "public"."support_issues" TO "anon";
GRANT ALL ON TABLE "public"."support_issues" TO "authenticated";
GRANT ALL ON TABLE "public"."support_issues" TO "service_role";



GRANT ALL ON TABLE "public"."support_issues_with_counts" TO "anon";
GRANT ALL ON TABLE "public"."support_issues_with_counts" TO "authenticated";
GRANT ALL ON TABLE "public"."support_issues_with_counts" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

revoke references on table "public"."Beta" from "anon";

revoke trigger on table "public"."Beta" from "anon";

revoke truncate on table "public"."Beta" from "anon";

revoke references on table "public"."Beta" from "authenticated";

revoke trigger on table "public"."Beta" from "authenticated";

revoke truncate on table "public"."Beta" from "authenticated";

revoke references on table "public"."beta_rate_limits" from "anon";

revoke trigger on table "public"."beta_rate_limits" from "anon";

revoke truncate on table "public"."beta_rate_limits" from "anon";

revoke references on table "public"."beta_rate_limits" from "authenticated";

revoke trigger on table "public"."beta_rate_limits" from "authenticated";

revoke truncate on table "public"."beta_rate_limits" from "authenticated";


