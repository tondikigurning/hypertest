# Feature: Knowledge Management — article journeys
# Owning PRD: docs/prd/knowledge-management/knowledge-management.md
# Live mutations must target uniquely identified E2E-owned records.
# The user stated that no Knowledge Management operations are restricted in production;
# this does not authorize production execution or override data-safety rules.

Feature: Manage knowledge articles

  @TEN_KMG_CRT_E2E_001 @smoke @flow:TEN_KMG_CREATE_FLOW @type:positive
  Scenario: Create an internal knowledge article as a draft
    Given an authorized user opens the Knowledge Management create wizard
    When the user creates a uniquely named E2E-owned internal article with an entity, category, description and content
    Then the exact created article appears in the Draft list as version 1
    And the article detail displays the submitted content

  @TEN_KMG_CRT_E2E_002 @regression @flow:TEN_KMG_CREATE_FLOW @type:negative
  Scenario: Required article details prevent progression when empty
    Given an authorized user opens the Knowledge Management create wizard
    When the user continues without entering article details
    Then the Details step remains open
    And required errors are shown for Article Name, Entity, CTS Category, Description and Visibility

  @TEN_KMG_CRT_E2E_003 @regression @flow:TEN_KMG_CREATE_FLOW @type:negative
  Scenario: Empty article content prevents progression
    Given an authorized user has entered valid article details in the create wizard
    When the user continues from Content without entering article content
    Then the Content step remains open
    And the message "Please add some content to proceed." is displayed

  @TEN_KMG_CRT_E2E_004 @regression @flow:TEN_KMG_CREATE_FLOW @type:positive
  Scenario: Cancel a blank article creation and return to the list
    Given an authorized user opens the Knowledge Management create wizard
    When the user cancels without entering or submitting article details
    Then the article list is displayed
    And no article is created by the canceled attempt

  @TEN_KMG_REV_E2E_001 @smoke @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: Submit and approve a draft for immediate publication
    Given an authorized user has created an E2E-owned internal draft article
    When the user submits that exact draft for approval
    Then the article appears in Pending Approval
    When an authorized approver approves that exact article for immediate publication
    Then the article appears in Published with an Active badge

  @TEN_KMG_REV_E2E_002 @regression @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: Request revision for an article awaiting approval
    Given an authorized user has submitted an E2E-owned article version for approval
    When an authorized approver requests revision with a comment on that exact version
    Then that version appears in Need Revision with status Needs Revision

  @TEN_KMG_REV_E2E_003 @regression @flow:TEN_KMG_REVIEW_FLOW @type:positive
  Scenario: Resubmit a version that needs revision
    Given an E2E-owned article version has status Needs Revision
    When an authorized user resubmits that exact version for approval
    Then that version appears in Pending Approval

  @TEN_KMG_EDT_E2E_001 @smoke @flow:TEN_KMG_EDIT_FLOW @type:positive
  Scenario: Edit a published article into a new draft version
    Given an E2E-owned internal article is published as version 1
    When an authorized user edits and saves the description of that exact article
    Then version 2 appears in Draft with the updated description
    And version 1 remains in Published with an Active badge

  # Provisional actual behavior: source calls the old version archived; STT1 shows Superseded.
  @TEN_KMG_EDT_E2E_002 @regression @flow:TEN_KMG_EDIT_FLOW @type:positive
  Scenario: Publish a revised article version and supersede the previous version
    Given an E2E-owned article has an active published version 1 and a pending version 2
    When an authorized approver publishes version 2 of that exact article
    Then version 2 appears in Published with an Active badge
    And version 1 of that article appears in Superseded

  @TEN_KMG_ARC_E2E_001 @smoke @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
  Scenario: Archive an E2E-owned published article
    Given an E2E-owned internal article is published and identifiable by its exact title
    When an authorized user confirms Archive for that exact article
    Then the article is removed from the Published results
    And the exact article appears in the Archived list

  @TEN_KMG_ARC_E2E_002 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
  Scenario: Cancel archiving an E2E-owned published article
    Given an E2E-owned internal article is published and identifiable by its exact title
    When an authorized user opens Archive for that exact article and cancels confirmation
    Then the article remains in Published
    And the exact article does not move to Archived

  @TEN_KMG_ARC_E2E_003 @regression @flow:TEN_KMG_ARCHIVE_FLOW @type:positive
  Scenario: Unarchive an E2E-owned archived article
    Given an E2E-owned internal article is in Archived and identifiable by its exact title
    When an authorized user confirms Unarchive for that exact article
    Then the article is removed from Archived
    And the exact article returns to Published

  @TEN_KMG_LST_E2E_001 @smoke @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Find a published article by its exact title
    Given an E2E-owned internal article is published
    When an authorized user searches the Published list for that article's exact title
    Then the list includes that exact article with Published status

  @TEN_KMG_LST_E2E_002 @regression @flow:TEN_KMG_LIST_FLOW @type:negative
  Scenario: Show an empty list for an unmatched article search
    Given an authorized user opens the Knowledge Management article list
    When the user searches for a title known not to match any article
    Then the list shows "No Data Available"
    And the list shows "There are no items to display at this time."

  @TEN_KMG_LST_E2E_003 @regression @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Filter an internal article by visibility
    Given an E2E-owned internal article is published
    And an authorized user searches for that exact article in the Published list
    When the user applies the Visibility Equal False filter
    Then the exact article remains in the results with Internal visibility

  @TEN_KMG_LST_E2E_004 @regression @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Reset list filters and search criteria
    Given an authorized user has applied a search and visibility filter that narrow the article list
    When the user selects Reset
    Then the search and visibility filter are cleared
    And the list returns to unfiltered article results

  @TEN_KMG_LST_E2E_005 @regression @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Sort the article list by article number
    Given the Knowledge Management article list contains multiple articles
    When the user sorts the list by the Article No. column
    Then the sort control displays Article Number
    And the visible articles are ordered by article number

  @TEN_KMG_LST_E2E_006 @regression @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Sort the article list by title
    Given the Knowledge Management article list contains multiple articles
    When the user sorts the list by the Article column
    Then the sort control displays Title
    And the visible article titles are in alphabetical order

  @TEN_KMG_LST_E2E_007 @regression @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Navigate between pages of article results
    Given the article list has more results than fit on one page
    When the user goes to the next page
    Then a different range of article results is displayed
    When the user returns to the previous page
    Then the original range of article results is displayed

  @TEN_KMG_LST_E2E_008 @regression @flow:TEN_KMG_LIST_FLOW @type:positive
  Scenario: Browse articles by status tab
    Given the Knowledge Management article list displays status tabs
    When the user selects the Draft tab
    Then only draft articles appear in the results
    When the user selects the Archived tab
    Then only archived articles appear in the results

  @TEN_KMG_VDT_E2E_001 @regression @flow:TEN_KMG_DETAIL_FLOW @type:positive
  Scenario: Inspect an article's content, details and active revision
    Given an E2E-owned internal article has been published
    When an authorized user opens that exact article
    Then the Article tab displays its saved content
    And the Details tab displays its saved category, visibility, description and version
    And the Revision tab shows its active version
