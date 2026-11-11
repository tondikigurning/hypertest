export type ActivePage =
    | "users"
    | "user-groups"
    | "access-roles"
    | "permission-sets"
    | "work-orders"
    | "knowledge-management"
    | "cases"
    | "survey-template-manager"
    | "organizations"
    | "entities";

export type ListSurface = "list" | "create-wizard-entity";

export type PageContext = {
    currentPage: ActivePage;
    listSurface: ListSurface;
    /** Name of the article created by the "Given the user has created a knowledge article" step. */
    createdArticleName?: string | null;
    setCurrentPage: (nextPage: ActivePage) => void;
    setListSurface: (surface: ListSurface) => void;
    setCreatedArticleName: (name: string | null) => void;
};

/**
 * Dummy origin for `new URL(relative, base)` — only `pathname` is read.
 * Handles both absolute Playwright URLs and relative paths like `/user-management/users`.
 */
const URL_PARSE_BASE = "http://localhost";

export function inferActivePageFromPath(pathname: string): ActivePage | null {
    if (pathname.startsWith("/iam/permission-sets")) {
        return "permission-sets";
    }

    if (pathname.startsWith("/iam/access-roles")) {
        return "access-roles";
    }

    if (pathname.startsWith("/user-management/user-groups") || pathname.startsWith("/iam/user-groups")) {
        return "user-groups";
    }

    if (pathname.startsWith("/user-management/users")) {
        return "users";
    }

    if (pathname.startsWith("/workforce-management/work-orders")) {
        return "work-orders";
    }

    if (pathname.startsWith("/knowledge-management")) {
        return "knowledge-management";
    }

    if (pathname.startsWith("/case-management/cases")) {
        return "cases";
    }

    if (pathname.startsWith("/case-management/survey-template-manager")) {
        return "survey-template-manager";
    }

    if (pathname.startsWith("/organization-management")) {
        if (pathname.includes("/entities/")) {
            return "entities";
        }
        return "organizations";
    }

    return null;
}

export function inferActivePageFromUrl(url: string): ActivePage | null {
    try {
        const parsed = new URL(url, URL_PARSE_BASE);
        return inferActivePageFromPath(parsed.pathname);
    } catch {
        return null;
    }
}

export function inferActivePageFromTags(tags: readonly string[]): ActivePage | null {
    const normalized = tags.map((tag) => tag.toUpperCase());

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_ACR_")
                || tag.startsWith("@FLOW:TEN_ACR_"),
        )
    ) {
        return "access-roles";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_PMS_")
                || tag.startsWith("@FLOW:TEN_PMS_"),
        )
    ) {
        return "permission-sets";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_UGP_")
                || tag.startsWith("@FLOW:TEN_UGP_"),
        )
    ) {
        return "user-groups";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_USR_")
                || tag.startsWith("@FLOW:TEN_USR_"),
        )
    ) {
        return "users";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_WKO_")
                || tag.startsWith("@FLOW:TEN_WKO_"),
        )
    ) {
        return "work-orders";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_KNM_")
                || tag.startsWith("@FLOW:TEN_KNM_"),
        )
    ) {
        return "knowledge-management";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_CAS_")
                || tag.startsWith("@FLOW:TEN_CAS_"),
        )
    ) {
        return "cases";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_STM_")
                || tag.startsWith("@FLOW:TEN_STM_"),
        )
    ) {
        return "survey-template-manager";
    }

    if (
        normalized.some(
            (tag) =>
                tag.startsWith("@TEN_ORG_")
                || tag.startsWith("@FLOW:TEN_ORG_"),
        )
    ) {
        return "organizations";
    }

    return null;
}

export function syncPageContextFromUrl(pageContext: PageContext, url: string): ActivePage {
    const inferred = inferActivePageFromUrl(url);
    if (inferred) {
        pageContext.setCurrentPage(inferred);
        return inferred;
    }

    return pageContext.currentPage;
}

export function syncPageContextFromScenario(
    pageContext: PageContext,
    params: {
        url?: string;
        tags?: readonly string[];
    },
): ActivePage {
    // Component tests (@TEN_COM_*) should default to users page unless URL suggests otherwise
    const isComponentTest = params.tags?.some((tag) =>
        tag.toUpperCase().startsWith("@TEN_COM_"),
    ) ?? false;

    if (params.url) {
        const inferredFromUrl = inferActivePageFromUrl(params.url);
        if (inferredFromUrl) {
            pageContext.setCurrentPage(inferredFromUrl);
            return inferredFromUrl;
        }

        // For component tests without a clear URL path, default to users
        if (isComponentTest && pageContext.currentPage === "user-groups") {
            return pageContext.currentPage;
        }
    }

    if (params.tags?.length) {
        const inferredFromTags = inferActivePageFromTags(params.tags);
        if (inferredFromTags) {
            pageContext.setCurrentPage(inferredFromTags);
            return inferredFromTags;
        }
    }

    // For component tests, ensure we have a valid default
    if (isComponentTest && !pageContext.currentPage) {
        pageContext.setCurrentPage("users");
    }

    return pageContext.currentPage;
}

export function resolvePage<
    TUsersPage,
    TUserGroupsPage,
    TAccessRolesPage = never,
    TPermissionSetsPage = never,
    TWorkOrdersPage = never,
    TKnowledgeManagementPage = never,
    TCasesPage = never,
    TSurveyTemplateManagerPage = never,
    TOrganizationsPage = never,
    TEntitiesPage = never,
>(fixtures: {
    pageContext: PageContext;
    usersPage: TUsersPage;
    userGroupsPage: TUserGroupsPage;
    accessRolesPage?: TAccessRolesPage;
    permissionSetsPage?: TPermissionSetsPage;
    workOrdersPage?: TWorkOrdersPage;
    knowledgeManagementPage?: TKnowledgeManagementPage;
    casesPage?: TCasesPage;
    surveyTemplateManagerPage?: TSurveyTemplateManagerPage;
    organizationsPage?: TOrganizationsPage;
    entitiesPage?: TEntitiesPage;
    currentUrl?: string;
}): TUsersPage | TUserGroupsPage | TAccessRolesPage | TPermissionSetsPage | TWorkOrdersPage | TKnowledgeManagementPage | TCasesPage | TSurveyTemplateManagerPage | TOrganizationsPage | TEntitiesPage {
    if (fixtures.currentUrl) {
        syncPageContextFromUrl(fixtures.pageContext, fixtures.currentUrl);
    }

    if (fixtures.pageContext.currentPage === "user-groups") {
        return fixtures.userGroupsPage;
    }
    if (fixtures.pageContext.currentPage === "access-roles") {
        return fixtures.accessRolesPage as TAccessRolesPage;
    }
    if (fixtures.pageContext.currentPage === "permission-sets") {
        return fixtures.permissionSetsPage as TPermissionSetsPage;
    }
    if (fixtures.pageContext.currentPage === "work-orders") {
        return fixtures.workOrdersPage as TWorkOrdersPage;
    }
    if (fixtures.pageContext.currentPage === "knowledge-management") {
        return fixtures.knowledgeManagementPage as TKnowledgeManagementPage;
    }
    if (fixtures.pageContext.currentPage === "cases") {
        return fixtures.casesPage as TCasesPage;
    }
    if (fixtures.pageContext.currentPage === "survey-template-manager") {
        return fixtures.surveyTemplateManagerPage as TSurveyTemplateManagerPage;
    }
    if (fixtures.pageContext.currentPage === "entities") {
        return fixtures.entitiesPage as TEntitiesPage;
    }
    if (fixtures.pageContext.currentPage === "organizations") {
        return fixtures.organizationsPage as TOrganizationsPage;
    }
    return fixtures.usersPage;
}

export function resolveFilterablePage<
    TUsersPage,
    TUserGroupsPage,
    TAccessRolesPage = never,
    TPermissionSetsPage = never,
    TUsersCreatePage = never,
    TWorkOrdersPage = never,
    TKnowledgeManagementPage = never,
    TCasesPage = never,
    TSurveyTemplateManagerPage = never,
>(fixtures: {
    pageContext: PageContext;
    usersPage: TUsersPage;
    userGroupsPage: TUserGroupsPage;
    accessRolesPage?: TAccessRolesPage;
    permissionSetsPage?: TPermissionSetsPage;
    workOrdersPage?: TWorkOrdersPage;
    knowledgeManagementPage?: TKnowledgeManagementPage;
    usersCreatePage: TUsersCreatePage;
    casesPage?: TCasesPage;
    surveyTemplateManagerPage?: TSurveyTemplateManagerPage;
    currentUrl?: string;
}): TUsersPage | TUserGroupsPage | TAccessRolesPage | TPermissionSetsPage | TUsersCreatePage | TWorkOrdersPage | TKnowledgeManagementPage | TCasesPage | TSurveyTemplateManagerPage {
    if (fixtures.pageContext.listSurface === "create-wizard-entity") {
        return fixtures.usersCreatePage;
    }

    return resolvePage(fixtures);
}
