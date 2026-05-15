export type FormType = "UB-04" | "CMS-1500" | "unknown";

export interface ClaimsExtractionResult {
  formType: FormType;
  memberId: string;
  payerName: string;
  patientLastName: string;
  patientFirstName: string;
  patientDob: string;
}

export interface ClientRecord {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  memberId: string;
  insurerName: string;
}

export type MatchStep =
  | "member-id"          // member ID + last name + DoB all confirmed
  | "member-id-mismatch" // member ID matched but last name differs
  | "name-dob"           // last name + DoB both confirmed
  | "name-no-dob"        // last name found but DoB did not match (not a success)
  | "none";

export interface ValidationResult {
  formType: FormType;
  extractedFields: ClaimsExtractionResult;
  matchStep: MatchStep;
  matchedClient: ClientRecord | null;
  partialClient?: ClientRecord;  // populated on name-no-dob: last name found but DoB didn't match
  insurerMatched: boolean;
  lastNameMatched: boolean;
  dobMatched: boolean;
}
