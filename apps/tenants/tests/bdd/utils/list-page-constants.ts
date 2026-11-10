/** Shared list-page paths and filter API endpoints (avoids circular imports with page objects). */
export const USERS_LIST_PATH = "/user-management/users";
export const USERS_FILTER_API = "/iam/tenant/users/filter";

export const USER_GROUPS_LIST_PATH = "/user-management/user-groups";
export const USER_GROUPS_FILTER_API = "/iam/tenant/user-groups/filter";

export const CASES_LIST_PATH = "/case-management/cases";
// The cases list table + search use the "regular/filter" endpoint (useGetCaseByRegularFilter),
// NOT the plain "/filter" one — the search assertion waits on this URL, so it must be exact.
export const CASES_FILTER_API = "/casemgmt/tenant/cases/regular/filter";

export const SURVEY_TEMPLATE_MANAGER_LIST_PATH = "/case-management/survey-template-manager";
export const SURVEY_TEMPLATE_MANAGER_FILTER_API = "/casemgmt/tenant/survey/list";

export const ACCESS_ROLES_LIST_PATH = "/iam/access-roles";
export const ACCESS_ROLES_FILTER_API = "/iam/tenant/access-roles/filter";
export const ACCESS_ROLES_CREATE_API = /\/iam\/tenant\/access-roles(?:\?|$)/;
export const ACCESS_ROLES_DELETE_API = /\/iam\/tenant\/access-roles\/[^/]+(?:\?|$)/;

export const PERMISSION_SETS_LIST_PATH = "/iam/permission-sets";
export const PERMISSION_SETS_FILTER_API = "/iam/tenant/permission-sets/filter";
export const PERMISSION_SETS_CREATE_API = /\/iam\/tenant\/permission-sets(?:\/wizard)?(?:\?|$)/;

export const WORK_ORDERS_LIST_PATH = "/workforce-management/work-orders";
export const WORK_ORDERS_FILTER_API = "/workforcemgmt/tenant/work-orders/filter";
export const WORK_ORDERS_CREATE_API = "/workforcemgmt/tenant/work-orders";
export const WORK_ORDERS_TABS_API = /\/workforcemgmt\/tenant\/work-orders\/list\/status\/count/;

// ─── Knowledge Management ────────────────────────────────────────────────
export const KNOWLEDGE_MANAGEMENT_LIST_PATH = "/knowledge-management";
export const KNOWLEDGE_MANAGEMENT_FILTER_API = "/knowledge/tenant/articles/filter";
export const KNOWLEDGE_MANAGEMENT_CREATE_API = /\/knowledge\/tenant\/articles(?:\?|$)/;
export const KNOWLEDGE_MANAGEMENT_DELETE_API =
    /\/knowledge\/tenant\/articles\/[^/]+\/locales\/[^/]+\/versions\/[^/]+(?:\?|$)/;
export const KNOWLEDGE_MANAGEMENT_UPDATE_API =
    /\/knowledge\/tenant\/articles\/[^/]+\/locales\/[^/]+\/versions\/[^/]+(?:\?|$)/;
export const KNOWLEDGE_MANAGEMENT_PUBLISH_API =
    /\/knowledge\/tenant\/articles\/[^/]+\/locales\/[^/]+\/versions\/[^/]+\/publish/;
export const KNOWLEDGE_MANAGEMENT_SUBMIT_APPROVAL_API =
    /\/knowledge\/tenant\/articles\/[^/]+\/locales\/[^/]+\/versions\/[^/]+\/submit-for-approval/;
export const KNOWLEDGE_MANAGEMENT_REQUEST_REVISION_API =
    /\/knowledge\/tenant\/articles\/[^/]+\/locales\/[^/]+\/versions\/[^/]+\/request-revision/;

// ─── System Settings / Profanity ─────────────────────────────────────────
export const PROFANITY_SETTINGS_PATH = "/system-settings/profanity";
export const PROFANITY_WORDS_FILTER_API = "/organization/tenant/profanity-words/filter";
/** POST/GET match for the word list, search, filter and sort (all share the filter endpoint). */
export const PROFANITY_WORDS_FILTER_URL = /\/organization\/tenant\/profanity-words\/filter(?:\?|$)/;
/** Update (PUT) and delete (DELETE) by uuid — excludes the /filter list endpoint. */
export const PROFANITY_WORD_BY_UUID_API =
    /\/organization\/tenant\/profanity-words\/(?!filter(?:\?|$))[^/?#]+(?:\?.*)?$/;
export const PROFANITY_FILTER_SETTING_API = /\/organization\/tenant\/profanity-settings(?:\?|$)/;

/** Final confirm on the create-user wizard (Summary → Confirm). */
export const CREATE_USER_WIZARD_API = /\/iam\/tenant\/users\/wizards$/;

/** Entity picker table on create-user wizard step 2 (Organization & Entity). */
export const ENTITIES_UNITS_FILTER_API = "/units/filter";
/** Matches both `/units/filter` and `/units/filter-for-user-creation`. */
export const ENTITIES_UNITS_FILTER_URL =
    /\/organization\/tenant\/sub-tenants\/[^/]+\/units\/filter(?:-for-user-creation)?(?:\?|$)/;
