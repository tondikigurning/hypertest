CREATE TABLE "automation_scenario_catalog" (
	"scenario_key" text PRIMARY KEY NOT NULL,
	"scenario_id" text NOT NULL,
	"module" text NOT NULL,
	"feature" text NOT NULL,
	"file" text NOT NULL,
	"source_line" integer NOT NULL,
	"catalog_position" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "automation_scenario_catalog_id_idx" ON "automation_scenario_catalog" USING btree ("scenario_id");--> statement-breakpoint
CREATE INDEX "automation_scenario_catalog_module_file_idx" ON "automation_scenario_catalog" USING btree ("module","file","source_line");--> statement-breakpoint
CREATE UNIQUE INDEX "automation_scenario_catalog_position_idx" ON "automation_scenario_catalog" USING btree ("catalog_position");