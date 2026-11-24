DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM automation_agent_prds GROUP BY module, menu HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Multiple PRDs exist for the same module and menu. Preserve and reconcile these records before migrating.';
  END IF;
END $$;--> statement-breakpoint
CREATE TABLE "automation_agent_prds_legacy_backup" AS TABLE "automation_agent_prds";--> statement-breakpoint
ALTER TABLE "automation_agent_prds" DROP CONSTRAINT "automation_agent_prds_user_id_module_menu_pk";--> statement-breakpoint
ALTER TABLE "automation_agent_prds" ADD CONSTRAINT "automation_agent_prds_module_menu_pk" PRIMARY KEY("module","menu");