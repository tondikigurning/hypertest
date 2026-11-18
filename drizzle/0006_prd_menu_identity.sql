ALTER TABLE "automation_agent_prds" RENAME COLUMN "submodule" TO "menu";--> statement-breakpoint
ALTER TABLE "automation_agent_prds" DROP CONSTRAINT "automation_agent_prds_user_id_module_submodule_pk";--> statement-breakpoint
ALTER TABLE "automation_agent_prds" ADD CONSTRAINT "automation_agent_prds_user_id_module_menu_pk" PRIMARY KEY("user_id","module","menu");