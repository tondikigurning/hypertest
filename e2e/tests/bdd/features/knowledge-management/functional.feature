# Feature: Knowledge Management — functional
#
# ID prefix: TEN_KMG_<FLG>_E2E_NNN (NNN resets for each flow)
# PRD: docs/prd/knowledge-management/knowledge-management.md
# Evidence: PRD observations KM-create-01, KM-lifecycle-01, KM-review-version-01, KM-archive-01, KM-entry-01 and KM-detail-01; current STT1 observations E1 (list/filter entry), E2 (wizard/cancel), E3 (search/filter/detail reads), and E4 (review, revision, edit, archive decisions).
# Production eligibility for all mutation scenarios is unknown because production mutation restrictions remain unanswered. Do not run mutation scenarios against production until resolved.
# Use E2E-owned article records for every mutation. Do not mutate seed articles.
# Cleanup: archive the scenario-owned article and verify it appears in Archived; permanent delete behavior is not evidenced.
Feature: Knowledge Management — functional

  @TEN_KMG_CRT_E2E_001 @smoke @flow:TEN_KMG_CREATE_FLOW @type:positive
  Scenario: Author creates a draft article
    Given the author has selected an available entity and CTS category
    When the author creates an internal article with a unique E2E title, description, and content
    Then the article list shows that title as version 1 Draft
    And the article detail shows the saved content

  @TEN_KMG_CRT_E2E_004 @regression @flow:TEN_KMG_CREATE_FLOW @type:ui-interaction
  Scenario: Selecting an entity enables the article category field
    Given the author is on the article creation Details step
    And the CTS Category field is disabled
    When the author selects the available Converge entity
    Then the CTS Category field becomes enabled

  @TEN_KMG_CRT_E2E_002 @regression @flow:TEN_KMG_CREATE_FLOW @type:negative
  Scenario: Article details cannot advance when required fields are empty
    Given the author is on the article creation Details step
    When the author selects Next with all Details fields empty
    Then the Details step remains open
    And the form shows "Article Name is required"
    And the form shows "Entity is required"
    And the form shows "CTS Category is required"
    And the form shows "Description is required"
    And the form shows "Visibility is required"

  @TEN_KMG_CRT_E2E_005 @regression @flow:TEN_KMG_CREATE_FLOW @type:ui-interaction
  Scenario: Author cancels article creation before saving
    Given the author is on the article creation Details step
    When the author selects Cancel without submitting the form
    Then the article creation wizard closes
    And the article list is shown

  @TEN_KMG_CRT_E2E_003 @regression @flow:TEN_KMG_CREATE_FLOW @type:negative
  Scenario: Article content cannot advance when empty
    Given the author has completed article Details and is on the Content step
    When the author selects Next without adding content
    Then the Content step remains open
    And the form shows "Please add some content to proceed."

  @TEN_KMG_REV_E2E_001 @smoke @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: Author submits a draft for approval
    Given an E2E-owned article is in Draft status
    When the author confirms Approval for that article
    Then the same article appears in Pending Approval

  @TEN_KMG_REV_E2E_002 @smoke @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: Approver publishes a draft immediately
    Given an E2E-owned draft article is awaiting approval
    When the approver saves the immediate approval and publication decision
    Then the same article appears as Published with an Active badge

  @TEN_KMG_REV_E2E_003 @regression @flow:TEN_KMG_REVIEW_FLOW @type:ui-interaction
  Scenario: User cancels draft submission for approval
    Given an E2E-owned article is in Draft status
    When the user cancels the Submit For Approval confirmation
    Then the same article remains in Draft

  @TEN_KMG_REV_E2E_004 @regression @flow:TEN_KMG_REVIEW_FLOW @type:ui-interaction
  Scenario: User cancels a pending approval decision
    Given an E2E-owned article is in Pending Approval
    When the user cancels the Approval Article decision
    Then the same article remains in Pending Approval

  @TEN_KMG_REV_E2E_005 @regression @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: User requests a revision with feedback
    Given an E2E-owned article is in Pending Approval
    When the user requests a revision with a comment
    Then the article appears as Needs Revision
    And the comment appears in the article's edit comments

  @TEN_KMG_REV_E2E_006 @regression @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: User resubmits an article after revision
    Given an E2E-owned article is in Needs Revision with updated content
    When the user confirms Submit For Approval
    Then the same article appears in Pending Approval

  @TEN_KMG_EDT_E2E_001 @smoke @flow:TEN_KMG_EDIT_FLOW @type:positive
  Scenario: Publishing an updated article creates an active later version
    Given an E2E-owned article has a Published version 1
    When the author creates and publishes version 2 with updated content
    Then version 2 appears Published with an Active badge
    And version 1 appears in Superseded

  @TEN_KMG_EDT_E2E_002 @regression @flow:TEN_KMG_EDIT_FLOW @type:positive
  Scenario: User updates an article after a revision request
    Given an E2E-owned article is in Needs Revision with reviewer feedback
    When the user saves updated article content
    Then the article detail shows the updated content
    And the article remains in Needs Revision

  @TEN_KMG_ARC_E2E_001 @smoke @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
  Scenario: Author archives a published article
    Given an E2E-owned article is Published
    When the author confirms Archive for that article
    Then the article disappears from Published
    And the same article appears in Archived
    And the success message is "Article \"<article title>\" archived successfully."

  @TEN_KMG_ARC_E2E_002 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
  Scenario: Author restores an archived article
    Given an E2E-owned article is Archived
    When the author confirms Unarchive for that article
    Then the same article appears in Published
    And the article disappears from Archived

  @TEN_KMG_ARC_E2E_003 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:ui-interaction
  Scenario: User cancels archiving a published article
    Given an E2E-owned article is Published
    When the user cancels the Archive confirmation
    Then the same article remains in Published

  @TEN_KMG_ARC_E2E_004 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:ui-interaction
  Scenario: User cancels restoring an archived article
    Given an E2E-owned article is Archived
    When the user cancels the Unarchive confirmation
    Then the same article remains in Archived

  @TEN_KMG_LST_E2E_001 @smoke @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
  Scenario: Article list exposes its lifecycle status views
    When the user opens the Knowledge Management article list
    Then the list offers Published, All, Draft, Pending Approval, Need Revision, Superseded, and Archived views

  @TEN_KMG_LST_E2E_002 @smoke @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
  Scenario: Article detail shows the content saved in its draft
    Given an E2E-owned article has been created as a draft
    When the user opens that article's detail
    Then the detail shows the content saved for the article

  @TEN_KMG_LST_E2E_003 @regression @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
  Scenario: Article revision history identifies the active version
    Given an E2E-owned article has a Published version 2 and a Superseded version 1
    When the user opens the article's Revision tab
    Then the revision history lists versions 1 and 2
    And version 2 is marked Active

  @TEN_KMG_LST_E2E_004 @regression @flow:TEN_KMG_LIST_DETAIL_FLOW @type:positive
  Scenario: User previews content from an earlier article version
    Given an E2E-owned article has more than one version
    When the user selects an earlier version in the revision history
    Then the version preview shows that version's saved content

  @TEN_KMG_SFI_E2E_001 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:ui-interaction
  Scenario: Article list exposes search and status filtering
    When the user opens Add Filters on the article list
    Then the filter choices include Status
    And the article list provides a search field

  @TEN_KMG_SFI_E2E_002 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:positive
  Scenario: User searches for an E2E-owned article by title
    Given an E2E-owned article has a known unique title
    When the user searches for that exact title
    Then the matching article appears in the search results

  @TEN_KMG_SFI_E2E_003 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:negative
  Scenario: Search with no matching article shows an empty state
    When the user searches for a title that matches no article
    Then the article list shows "No Data Available"
    And the list has no article results

  @TEN_KMG_SFI_E2E_004 @regression @flow:TEN_KMG_SEARCH_FILTER_FLOW @type:positive
  Scenario: User filters the article list by Published status
    Given the user is viewing the All article list
    When the user applies the Status filter for Published
    Then the results include Published articles
    And the results exclude Superseded articles

  @TEN_KMG_ORG_E2E_001 @regression @flow:TEN_KMG_ORGANIZE_FLOW @type:positive
  Scenario: User filters articles by category
    Given an E2E-owned article belongs to a category under Complaint
    When the user filters the article list by the Complaint category
    Then the results include the E2E-owned article
    And its category path is under Complaint

  @TEN_KMG_CNS_E2E_001 @regression @flow:TEN_KMG_CONSUME_FLOW @type:positive
  Scenario: User reads the content of a published article
    Given an E2E-owned article is Published with saved content
    When the user opens the article's Article tab
    Then the article tab shows the published content









