CREATE TABLE "automation_workspace_github_credentials" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"encrypted_access_token" text NOT NULL,
	"encrypted_refresh_token" text,
	"expires_at" timestamp with time zone,
	"refresh_expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_workspace_sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_workspace_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"github_id" text,
	"display_name" text NOT NULL,
	"username" text,
	"password_hash" text,
	"must_change_password" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_workspace_users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "automation_workspace_users_username_unique" UNIQUE("username"),
	CONSTRAINT "automation_workspace_user_role_check" CHECK ("automation_workspace_users"."role" in ('engineer', 'viewer')),
	CONSTRAINT "automation_workspace_user_status_check" CHECK ("automation_workspace_users"."status" in ('active', 'disabled')),
	CONSTRAINT "automation_workspace_user_identity_check" CHECK (("automation_workspace_users"."role" = 'engineer' and "automation_workspace_users"."github_id" is not null and "automation_workspace_users"."username" is null and "automation_workspace_users"."password_hash" is null and not "automation_workspace_users"."must_change_password") or ("automation_workspace_users"."role" = 'viewer' and "automation_workspace_users"."github_id" is null and "automation_workspace_users"."username" is not null and "automation_workspace_users"."password_hash" is not null)),
	CONSTRAINT "automation_workspace_username_normalized_check" CHECK ("automation_workspace_users"."username" is null or ("automation_workspace_users"."username" = lower(trim("automation_workspace_users"."username")) and length("automation_workspace_users"."username") > 0))
);
--> statement-breakpoint
ALTER TABLE "automation_workspace_github_credentials" ADD CONSTRAINT "automation_workspace_github_credentials_user_id_automation_workspace_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."automation_workspace_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_workspace_sessions" ADD CONSTRAINT "automation_workspace_sessions_user_id_automation_workspace_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."automation_workspace_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "automation_workspace_sessions_user_idx" ON "automation_workspace_sessions" USING btree ("user_id");