CREATE TABLE "automation_agent_prds" (
	"user_id" text NOT NULL,
	"module" text NOT NULL,
	"submodule" text NOT NULL,
	"state" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "automation_agent_prds_user_id_module_submodule_pk" PRIMARY KEY("user_id","module","submodule")
);
