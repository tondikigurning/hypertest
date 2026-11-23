# Feature: Case Management — Cases: list and detail
# Owner PRD: docs/prd/case-management/cases.md
# Search and filter use existing cases read-only. A case number selected for detail is
# retained through the assertion; it is not a mutation target.

Feature: Cases list and detail

  @TEN_CAS_LST_E2E_001 @smoke @flow:TEN_CAS_LIST_FLOW @type:positive @ref:TEN_COM_FSR_E2E_001
  Scenario: Find a case by its case number
    Given a list page with search is open
    When the user searches for the first visible row "case_number"
    Then the search returns matching rows

  @TEN_CAS_LST_E2E_002 @regression @flow:TEN_CAS_LIST_FLOW @type:edge-case
  Scenario: A search with no matching case shows an empty list
    Given the Cases list is open
    When the user searches for a case number that does not match an accessible case
    Then the Cases list has no rows
    And the Cases list shows "No Data Available"

  @TEN_CAS_LST_E2E_003 @regression @flow:TEN_CAS_LIST_FLOW @type:positive @ref:TEN_COM_FIL_E2E_001
  Scenario: A status filter retains a matching case
    Given an identified E2E case is In Progress
    And the Cases list is searched for that case
    When the user filters the Cases list by the In Progress case status
    Then the identified case is shown with status In Progress

  @TEN_CAS_VDT_E2E_001 @smoke @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Open the case identified in the list
    Given the Cases list contains an accessible case
    When the user opens that case by its case number
    Then the case workspace identifies the same case

  @TEN_CAS_LST_E2E_004 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction @ref:TEN_COM_PIP_E2E_001
  Scenario: The Open pipeline contains open cases
    Given the Cases list is open
    When the user selects the Open pipeline tab
    Then every displayed case has status Open

  @TEN_CAS_LST_E2E_005 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction @ref:TEN_COM_PIP_E2E_001
  Scenario: The Assigned pipeline contains assigned cases
    Given the Cases list is open
    When the user selects the Assigned pipeline tab
    Then every displayed case has status Assigned

  @TEN_CAS_LST_E2E_006 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction @ref:TEN_COM_PIP_E2E_001
  Scenario: The In Progress pipeline contains cases in progress
    Given the Cases list is open
    When the user selects the In Progress pipeline tab
    Then every displayed case has status In Progress

  @TEN_CAS_LST_E2E_007 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction @ref:TEN_COM_PIP_E2E_001
  Scenario: The Closed pipeline contains closed cases
    Given the Cases list is open
    When the user opens the Closed pipeline from Others
    Then every displayed case has status Closed

  @TEN_CAS_LST_E2E_008 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction @ref:TEN_COM_PIP_E2E_001
  Scenario: The Solved pipeline contains solved cases
    Given the Cases list is open
    When the user opens the Solved pipeline from Others
    Then every displayed case has status Solved

  @TEN_CAS_LST_E2E_011 @regression @flow:TEN_CAS_LIST_FLOW @type:positive @ref:TEN_COM_PIP_E2E_001
  Scenario: Assigned to Me includes a case assigned to the signed-in agent
    Given an identified E2E-owned case is assigned to the signed-in agent
    When the user selects the Assigned to Me pipeline tab
    Then the identified case appears in the results

  @TEN_CAS_LST_E2E_009 @regression @flow:TEN_CAS_LIST_FLOW @type:positive
  Scenario: Move to the next page when the selected pipeline has more cases than one page
    Given a Cases pipeline has more results than the current page can display
    When the user moves to the next page
    Then a different page of cases is displayed

  @TEN_CAS_LST_E2E_010 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction @ref:TEN_COM_SAP_E2E_001
  Scenario: Sort cases by their last updated time
    Given the Cases list is open
    When the user sorts the Cases list by Updated At
    Then cases are ordered by their last updated time

  @TEN_CAS_VDT_E2E_002 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Case detail shows its case information
    Given the Cases list contains an accessible case
    When the user opens that case by its case number
    Then Case Information shows its case number, status, classification and subject
    And the case workspace shows the assigned team and agent fields

  @TEN_CAS_VDT_E2E_003 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Case detail shows customer, service address and billing sections
    Given the Cases list contains an accessible case with customer details
    When the user opens that case by its case number
    Then Customer Details, Service Address, Billing Address and Customer Billing Details are visible

  @TEN_CAS_LST_E2E_012 @regression @flow:TEN_CAS_LIST_FLOW @type:positive
  Scenario: Find an E2E-owned case by its subject
    Given an identified E2E-owned case has a unique subject
    And the Cases list is open
    When the user searches for that exact subject
    Then the matching case appears in the Cases list

  @TEN_CAS_LST_E2E_013 @regression @flow:TEN_CAS_LIST_FLOW @type:edge-case @ref:TEN_COM_FIL_E2E_001
  Scenario: A status filter excludes a case with a different status
    Given an identified E2E-owned case is In Progress
    And the Cases list is searched for that case
    When the user filters the Cases list by Closed
    Then the identified case is not shown
    And the Cases list shows "No Data Available"

  @TEN_CAS_VDT_E2E_004 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Open another case from the customer's ticket history
    Given an accessible case has another ticket in its case summary
    When the user opens the case summary
    Then Ticket History shows the current case and another ticket
    When the user opens the other ticket from Ticket History
    Then that ticket opens in a separate case workspace tab

  @TEN_CAS_VDT_E2E_005 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:positive
  Scenario: Inspect case details in the customer's ticket history
    Given an accessible case has tickets in its case summary
    When the user opens the case summary
    Then a displayed ticket shows its case number, classification, subject, status and date
    And the open case is marked Current

  @TEN_CAS_VDT_E2E_006 @regression @flow:TEN_CAS_VIEW_DETAIL_FLOW @type:edge-case
  Scenario: Show an empty child-case summary
    Given an accessible case has no child cases
    When the user opens the case summary
    Then the Child Case count is zero
    And the summary shows "No child cases found."

  @TEN_CAS_LST_E2E_014 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario: Reset clears the current search and filters
    Given the Cases list has a search query and a filter applied
    When the user resets the Cases list criteria
    Then the search query is cleared
    And the applied filters are removed
    And the Cases list returns to its unfiltered results

  @TEN_CAS_LST_E2E_015 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario: The Others menu lists the alternate case pipelines
    Given the Cases list is open
    When the user opens Others
    Then the menu lists Escalated, Pending Customer Reply, Solved, Closed, Cancelled, Action Required, Watched by Me, Live Agent and Hotline

  @TEN_CAS_LST_E2E_016 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario: Pending Customer Reply pipeline contains pending-reply cases
    Given the Cases list is open
    When the user opens Pending Customer Reply from Others
    Then every displayed case has status Pending Customer Reply

  @TEN_CAS_LST_E2E_017 @regression @flow:TEN_CAS_LIST_FLOW @type:ui-interaction
  Scenario: The Add Filters menu lists the available case fields
    Given the Cases list is open
    When the user opens Add Filters
    Then the available filters include Assigned Agent, Case Flag, Case Number, Case Source, Case Status, Case Sub Type, Case Template, Case Type, Category, Closed At, Closed By, Created At, Created By, Customer Name, Customer No, Customer Product, Customer Type, Last Updated At, Last Updated By, OLA Status, Parent Case Number, Priority, SLA Status, Solved At, Subject and Team

