CREATE TABLE "contest_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contest_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"submitted_at" timestamp,
	"total_score" integer DEFAULT 0,
	"tab_switches" integer DEFAULT 0,
	"is_disqualified" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "contests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"duration_minutes" integer NOT NULL,
	"is_active" boolean DEFAULT false,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mcq_questions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contest_id" varchar NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_answers" jsonb NOT NULL,
	"is_multiple_choice" boolean DEFAULT false,
	"points" integer NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "problems" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contest_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text NOT NULL,
	"difficulty" varchar NOT NULL,
	"points" integer NOT NULL,
	"time_limit_ms" integer DEFAULT 5000 NOT NULL,
	"memory_limit_mb" integer DEFAULT 256 NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"problem_id" varchar,
	"mcq_question_id" varchar,
	"contest_id" varchar NOT NULL,
	"code" text,
	"language" varchar,
	"selected_answers" jsonb,
	"status" varchar NOT NULL,
	"score" integer DEFAULT 0,
	"execution_time_ms" integer,
	"memory_usage_mb" integer,
	"submitted_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"problem_id" varchar NOT NULL,
	"input" text NOT NULL,
	"expected_output" text NOT NULL,
	"is_visible" boolean DEFAULT false NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" varchar NOT NULL,
	"email" varchar NOT NULL,
	"first_name" varchar NOT NULL,
	"last_name" varchar NOT NULL,
	"password" varchar NOT NULL,
	"profile_image_url" varchar,
	"role" varchar DEFAULT 'student' NOT NULL,
	"student_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contests" ADD CONSTRAINT "contests_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcq_questions" ADD CONSTRAINT "mcq_questions_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problems" ADD CONSTRAINT "problems_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_mcq_question_id_mcq_questions_id_fk" FOREIGN KEY ("mcq_question_id") REFERENCES "public"."mcq_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_contest_id_contests_id_fk" FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");