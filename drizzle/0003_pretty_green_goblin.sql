CREATE TABLE "automation_agent_model_checks" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"tool_calling_verified" boolean DEFAULT false NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_agent_model_checks_user_id_provider_model_id_pk" PRIMARY KEY("user_id","provider","model_id")
);
--> statement-breakpoint
CREATE TABLE "automation_agent_provider_credentials" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"base_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_agent_provider_credentials_user_id_provider_pk" PRIMARY KEY("user_id","provider"),
	CONSTRAINT "automation_agent_provider_check" CHECK ("automation_agent_provider_credentials"."provider" in ('openai', 'anthropic', 'google', 'openai-compatible'))
);
--> statement-breakpoint
CREATE TABLE "automation_agent_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" text NOT NULL,
	"provider" text NOT NULL,
	"model_id" text NOT NULL,
	"purpose" text DEFAULT 'agent' NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_agent_usage_input_tokens_check" CHECK ("automation_agent_usage"."input_tokens" >= 0),
	CONSTRAINT "automation_agent_usage_output_tokens_check" CHECK ("automation_agent_usage"."output_tokens" >= 0)
);
--> statement-breakpoint
CREATE INDEX "automation_agent_usage_user_session_idx" ON "automation_agent_usage" USING btree ("user_id","session_id");--> statement-breakpoint
CREATE INDEX "automation_agent_usage_user_created_idx" ON "automation_agent_usage" USING btree ("user_id","created_at");