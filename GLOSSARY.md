# Automation Domain Language

The Automation explorer organizes authored scenarios around the target application's product areas.

## Navigation

**Module**:
A top-level product area that contains menus.

**Menu**:
A navigable product area directly under a module. A menu owns its scenario files and PRD; test groups and files may be nested beneath it.
_Avoid_: Submodule

**Test group**:
An organizational grouping of scenario files beneath a menu. A test group is not a product navigation item.
