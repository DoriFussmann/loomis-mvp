export interface EmployerFieldDef {
  id: string;
  label: string;
  aliases: string[];
}

export interface EmployerSectionDef {
  id: string;
  title: string;
  fields: EmployerFieldDef[];
}

export const EMPLOYER_APPLICATION_SCHEMA: EmployerSectionDef[] = [
  {
    id: "employer_group_information",
    title: "Employer Group Information",
    fields: [
      { id: "legal_employer_name", label: "Legal Name of Employer", aliases: ["legal name of employer", "fu lega name of employer"] },
      { id: "federal_tax_id", label: "Federal Tax ID", aliases: ["federal tax id"] },
      { id: "sic_code", label: "SIC", aliases: ["sic"] },
      { id: "eligible_employees_count", label: "# Eligible Employees", aliases: ["eligible employees", "# eligible employees"] },
      { id: "effective_date", label: "Effective Date (MM/DD/YYYY)", aliases: ["effective date"] },
      { id: "renewal_date", label: "Renewal Date (MM/DD/YYYY)", aliases: ["renewal date"] },
      { id: "employer_name_1", label: "1. Employer Name", aliases: ["1. employer name", "employer name 1"] },
      { id: "employer_name_2", label: "2. Employer Name", aliases: ["2. employer name", "employer name 2"] },
      { id: "street_address_1", label: "Street Address (Location 1)", aliases: ["street address", "address 1"] },
      { id: "city_state_zip_1", label: "City / State / Zip (Location 1)", aliases: ["city state zip 1", "city  state  zip"] },
      { id: "street_address_2", label: "Street Address (Location 2)", aliases: ["street address 2", "address 2"] },
      { id: "city_state_zip_2", label: "City / State / Zip (Location 2)", aliases: ["city state zip 2"] },
      { id: "federal_tax_id_2", label: "Federal Tax ID (Location 2)", aliases: ["federal tax id 2"] },
      { id: "name_on_id_cards", label: "Name on ID Cards (if different from above)", aliases: ["name on id cards", "name on id card"] },
    ],
  },
  {
    id: "billing_contact",
    title: "Billing Contact",
    fields: [
      { id: "billing_contact_name", label: "Name", aliases: ["billing contact name"] },
      { id: "billing_contact_title", label: "Title", aliases: ["billing contact title"] },
      { id: "billing_contact_phone", label: "Phone Number", aliases: ["billing contact phone", "phone number"] },
      { id: "billing_contact_email", label: "Email Address", aliases: ["billing contact email", "email address"] },
      { id: "billing_contact_address", label: "Billing Address", aliases: ["billing address"] },
      { id: "billing_contact_city_state_zip", label: "City / State / Zip", aliases: ["billing city state zip"] },
    ],
  },
  {
    id: "premium_payment",
    title: "Premium Payment",
    fields: [
      { id: "bank_name", label: "Bank", aliases: ["bank"] },
      { id: "routing_number", label: "Routing Number", aliases: ["routing number"] },
      { id: "account_number", label: "Account Number", aliases: ["account number"] },
      { id: "name_on_checking_account", label: "Name on Checking Account", aliases: ["name on checking account"] },
      { id: "nature_of_business", label: "Nature of Business", aliases: ["nature of business"] },
      { id: "cobra_currently", label: "Do you have employees currently on COBRA? (Yes/No)", aliases: ["employees currently on cobra"] },
      { id: "other_divisions_locations", label: "Other Divisions/Locations?", aliases: ["other divisions/locations"] },
    ],
  },
  {
    id: "eligibility_contact",
    title: "Eligibility Contact",
    fields: [
      { id: "eligibility_contact_name", label: "Name", aliases: ["eligibility contact name", "eligibility contact"] },
      { id: "eligibility_contact_title", label: "Title", aliases: ["eligibility contact title"] },
      { id: "eligibility_contact_email", label: "Email Address", aliases: ["eligibility contact email", "eligi pemail"] },
      { id: "eligibility_contact_phone", label: "Phone Number", aliases: ["eligibility contact phone", "eligi phone"] },
      { id: "business_type", label: "Business Type", aliases: ["business type"] },
      { id: "website_address", label: "Website Address", aliases: ["website address"] },
      { id: "year_established", label: "Year Established", aliases: ["year established"] },
      { id: "full_time_employees", label: "Number of Full-Time Employees", aliases: ["full-time employees"] },
      { id: "part_time_employees", label: "Number of Part-Time Employees", aliases: ["part-time employees"] },
      { id: "situs_state", label: "Name of situs state", aliases: ["name of situs state", "name of s tus state"] },
      {
        id: "employees_outside_situs",
        label: "Are there employees residing outside of the situs state? (Yes/No)",
        aliases: ["employees residing outside of the situs state"],
      },
      { id: "outside_state_list", label: "State(s) and number of employees residing in each", aliases: ["state number of employees"] },
    ],
  },
  {
    id: "authorized_representative",
    title: "Authorized Representative",
    fields: [
      { id: "authorized_rep_name", label: "Name of Authorized Representative", aliases: ["name of authorized representative", "name of authorized rep"] },
      { id: "authorized_rep_title", label: "Title", aliases: ["authorized representative title", "tit e"] },
      { id: "authorized_rep_email", label: "Email Address", aliases: ["authorized representative email"] },
      { id: "authorized_rep_phone", label: "Phone Number", aliases: ["authorized representative phone"] },
      { id: "authorized_rep_street", label: "Street Address", aliases: ["authorized representative street address"] },
      { id: "authorized_rep_city_state_zip", label: "City / State / Zip", aliases: ["authorized representative city state zip"] },
    ],
  },
  {
    id: "eligibility_and_effective_date",
    title: "Eligibility and Employee Effective Date",
    fields: [
      { id: "contribution_strategy_fixed", label: "Employer Contribution Strategy - Fixed Dollar Amount", aliases: ["fixed dollar amount"] },
      { id: "contribution_strategy_percent", label: "Employer Contribution Strategy - Percent of Premium", aliases: ["percent of premium"] },
      { id: "bill_type", label: "Bill Type", aliases: ["bill type"] },
      { id: "pay_frequency", label: "Pay Frequency", aliases: ["pay frequency"] },
      {
        id: "current_waiting_period",
        label: "Current Employee Waiting Period",
        aliases: ["current employee waiting period", "date of hire", "30 days", "60 days"],
      },
      {
        id: "new_hire_waiting_period",
        label: "New Hire Waiting Period",
        aliases: ["new hire waiting period", "date of hire 2", "30 days 2", "60 days 2"],
      },
      { id: "eligibility_hours", label: "Eligibility Hours (15/20/25/30)", aliases: ["eligibility actively at work", "15 hours", "20 hours", "25", "30"] },
    ],
  },
  {
    id: "benefit_selection",
    title: "Benefit Selection and Enrollment Information",
    fields: [
      { id: "plan_mec_basic_selected", label: "MEC Basic selected", aliases: ["mec basic", "basic"] },
      { id: "plan_mec_plus_selected", label: "MEC Plus selected", aliases: ["mec plus", "plus"] },
      { id: "plan_mec_plus_adv_selected", label: "MEC Plus Advantage selected", aliases: ["mec plus advantage", "adv"] },
      { id: "spreadsheet_attached", label: "Spreadsheet enrollment attached (Yes/No)", aliases: ["spreadsheet enrollment", "spread enrollment"] },
      { id: "payroll_vendor", label: "Payroll system file feed vendor", aliases: ["payroll vendor"] },
      { id: "third_party_vendor", label: "Third party electronic enrollment vendor", aliases: ["third party vendor"] },
      { id: "enrollment_start_date", label: "Enrollment Start Date", aliases: ["enrollment start"] },
      { id: "enrollment_end_date", label: "Enrollment End Date", aliases: ["enrollment end"] },
      { id: "enrollment_submit_date", label: "Date enrollment will be submitted", aliases: ["enrollment submit"] },
    ],
  },
  {
    id: "benefit_broker_writing_agent",
    title: "Benefit Broker / Writing Agent Information",
    fields: [
      { id: "writing_agent_name", label: "Agent Name", aliases: ["agent name"] },
      { id: "writing_agent_phone", label: "Phone Number", aliases: ["phone number_4", "phone number_5"] },
      { id: "writing_agent_agency_name", label: "Agency Name", aliases: ["agency name"] },
      { id: "writing_agent_address", label: "Address", aliases: ["address", "address_2"] },
      { id: "writing_agent_city_state_zip", label: "City / State / Zip", aliases: ["city_5", "state_5", "zip_5", "city_6", "state_6", "zip_6"] },
      { id: "writing_agent_email", label: "Email Address", aliases: ["email", "ema address_4", "ema address_5"] },
      { id: "writing_agent_states_licensed", label: "States Licensed In", aliases: ["states licensed in", "states l censed in"] },
      { id: "other_agent_general_agency", label: "Other Agent/General Agency", aliases: ["other agent/general agency"] },
    ],
  },
  {
    id: "contribution_tables",
    title: "Contribution Tables",
    fields: [
      { id: "mec_basic_ee_only_contribution", label: "MEC Basic - EE Only Employer Contribution", aliases: ["basic full ee"] },
      { id: "mec_basic_ee_spouse_contribution", label: "MEC Basic - EE + Spouse Employer Contribution", aliases: ["basic full es"] },
      { id: "mec_basic_ee_children_contribution", label: "MEC Basic - EE + Child(ren) Employer Contribution", aliases: ["basic full ec"] },
      { id: "mec_basic_family_contribution", label: "MEC Basic - EE + Family Employer Contribution", aliases: ["basic full fam"] },
      { id: "mec_plus_ee_only_contribution", label: "MEC Plus - EE Only Employer Contribution", aliases: ["plus full ee"] },
      { id: "mec_plus_ee_spouse_contribution", label: "MEC Plus - EE + Spouse Employer Contribution", aliases: ["plus full es"] },
      { id: "mec_plus_ee_children_contribution", label: "MEC Plus - EE + Child(ren) Employer Contribution", aliases: ["plus full ec"] },
      { id: "mec_plus_family_contribution", label: "MEC Plus - EE + Family Employer Contribution", aliases: ["plus full fam"] },
      { id: "mec_plus_adv_ee_only_contribution", label: "MEC Plus Advantage - EE Only Employer Contribution", aliases: ["adv full ee"] },
      { id: "mec_plus_adv_ee_spouse_contribution", label: "MEC Plus Advantage - EE + Spouse Employer Contribution", aliases: ["adv full es"] },
      { id: "mec_plus_adv_ee_children_contribution", label: "MEC Plus Advantage - EE + Child(ren) Employer Contribution", aliases: ["adv full ec"] },
      { id: "mec_plus_adv_family_contribution", label: "MEC Plus Advantage - EE + Family Employer Contribution", aliases: ["adv full fam"] },
    ],
  },
  {
    id: "rate_cap_and_signatures",
    title: "Rate Cap Agreement / Signatures",
    fields: [
      { id: "rate_cap_agreement_date", label: "Rate Cap Agreement Date", aliases: ["rate cap agreement date"] },
      { id: "rate_cap_effective_date", label: "Rate Cap Effective Date", aliases: ["effective date of this agreement"] },
      { id: "rate_cap_contribution_start_date", label: "Monthly Contribution Start Date", aliases: ["beginning on"] },
      { id: "employer_signature_name", label: "Employer Signature Name", aliases: ["employer signature name", "by:", "name:"] },
      { id: "employer_signature_title", label: "Employer Signature Title", aliases: ["employer signature title", "title:"] },
      { id: "employer_signed_date", label: "Employer Signed Date", aliases: ["employer signed date"] },
      { id: "apex_signer_name", label: "Apex Signer Name", aliases: ["jeffrey l. bemoras", "matthew kincaid"] },
      { id: "apex_signer_title", label: "Apex Signer Title", aliases: ["principal", "manager"] },
    ],
  },
];

export interface EmployerFieldResult extends EmployerFieldDef {
  value: string;
  isMissing: boolean;
}

export interface EmployerSectionResult {
  id: string;
  title: string;
  fields: EmployerFieldResult[];
  filled: number;
  total: number;
  percent: number;
}

export interface EmployerExtractionResult {
  sections: EmployerSectionResult[];
  totalFilled: number;
  totalFields: number;
  totalPercent: number;
  extractionMethod: "form-fields" | "hybrid-ai-fallback";
}
