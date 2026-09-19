/**
 * Maps spreadsheet headers -> internal fields.
 * Header matching is case-insensitive and ignores spaces/underscores,
 * so "Policy Number", "policy_number" and "policyNumber" all match.
 * Add aliases here if your sheet uses different names.
 */
const COLUMN_ALIASES = {
  // Agent
  agentName: ['agent', 'agentname', 'agent_name'],
  // User
  firstName: ['firstname', 'first_name', 'first name', 'name'],
  dob: ['dob', 'dateofbirth', 'date_of_birth'],
  address: ['address'],
  phone: ['phone', 'phonenumber', 'phone_number', 'mobile'],
  state: ['state'],
  zipCode: ['zip', 'zipcode', 'zip_code', 'postalcode'],
  city: ['city'],
  email: ['email', 'emailaddress'],
  gender: ['gender'],
  userType: ['usertype', 'user_type'],
  // Account
  accountName: ['accountname', 'account_name', 'account'],
  accountType: ['accounttype', 'account_type'],
  // LOB
  categoryName: ['categoryname', 'category_name', 'category', 'lob', 'policycategory'],
  // Carrier
  companyName: ['companyname', 'company_name', 'company', 'carrier'],
  // Policy
  policyNumber: ['policynumber', 'policy_number', 'policyno'],
  policyStartDate: ['policystartdate', 'policy_start_date', 'startdate'],
  policyEndDate: ['policyenddate', 'policy_end_date', 'enddate'],
  premiumAmount: ['premiumamount', 'premium_amount', 'premium'],
  policyType: ['policytype', 'policy_type'],
  policyMode: ['policymode', 'policy_mode'],
  premiumAmountWritten: ['premiumamountwritten', 'premium_amount_written'],
  producer: ['producer'],
  csr: ['csr'],
  primary: ['primary'],
  applicantId: ['applicantid', 'applicant_id', 'applicant id'],
  agencyId: ['agencyid', 'agency_id'],
  hasActiveClientPolicy: ['hasactiveclientpolicy', 'hasactive clientpolicy', 'has_active_client_policy'],
};

const normalize = (h) => String(h || '').toLowerCase().replace(/[\s_\-]/g, '');

// Build header -> field lookup once
const LOOKUP = {};
for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
  for (const a of aliases) LOOKUP[normalize(a)] = field;
}

/** Convert a raw sheet row (header: value) into a normalized record. */
function mapRow(raw) {
  const out = {};
  for (const [header, value] of Object.entries(raw)) {
    const field = LOOKUP[normalize(header)];
    if (field) out[field] = value;
  }
  return out;
}

module.exports = { mapRow, COLUMN_ALIASES };
