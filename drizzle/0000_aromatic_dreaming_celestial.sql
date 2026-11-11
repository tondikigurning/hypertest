CREATE TABLE IF NOT EXISTS "automation_latest_results" (
	"environment_id" text NOT NULL,
	"scenario_id" text NOT NULL,
	"run_id" uuid NOT NULL,
	"status" text NOT NULL,
	"executed_at" timestamp with time zone NOT NULL,
	"duration_ms" integer NOT NULL,
	"evidence_url" text,
	"upload_status" text NOT NULL,
	CONSTRAINT "automation_latest_results_environment_id_scenario_id_pk" PRIMARY KEY("environment_id","scenario_id"),
	CONSTRAINT "automation_result_status_check" CHECK ("automation_latest_results"."status" in ('passed', 'failed', 'skipped')),
	CONSTRAINT "automation_result_duration_check" CHECK ("automation_latest_results"."duration_ms" >= 0),
	CONSTRAINT "automation_result_upload_check" CHECK ("automation_latest_results"."upload_status" in ('uploaded', 'unavailable', 'failed'))
);
