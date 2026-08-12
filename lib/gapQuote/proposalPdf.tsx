import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import type { PricedGroup } from "./schema";

const NAVY = "#0B3A5B";
const GREEN = "#2E7D32";
const RULE = "#C5BBA8";
const MUTED = "#5C564C";
const ROW = "#F7F4EE";

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#2C2924",
  },
  coverPage: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: "#2C2924",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
  },
  logo: { height: 28, width: 120, objectFit: "contain" },
  tagline: { fontSize: 8, color: MUTED, letterSpacing: 0.6, textAlign: "right" },
  company: { fontSize: 9, color: NAVY, fontFamily: "Helvetica-Bold", textAlign: "right" },
  coverLogo: { height: 36, width: 154, objectFit: "contain", marginBottom: 36 },
  kicker: {
    fontSize: 11,
    letterSpacing: 3,
    color: NAVY,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  coverTitle: { fontSize: 28, color: NAVY, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  coverSubtitle: { fontSize: 14, color: MUTED, marginBottom: 36 },
  metaLabel: { fontSize: 8, letterSpacing: 1.4, color: MUTED, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  metaValue: { fontSize: 13, color: NAVY, marginBottom: 18, fontFamily: "Helvetica-Bold" },
  sectionTitle: { fontSize: 14, color: NAVY, fontFamily: "Helvetica-Bold", marginBottom: 8 },
  body: { fontSize: 9.5, lineHeight: 1.45, color: "#2C2924", marginBottom: 10 },
  bulletRow: { flexDirection: "row", gap: 8, marginBottom: 5, alignItems: "flex-start" },
  check: { color: GREEN, fontFamily: "Helvetica-Bold", fontSize: 10, width: 12 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.4 },
  nested: { marginLeft: 20, fontSize: 9, color: MUTED, marginBottom: 2 },
  table: { borderWidth: 1, borderColor: RULE, marginTop: 8, marginBottom: 12 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE },
  tableRowAlt: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE, backgroundColor: ROW },
  tableLabel: { width: "48%", padding: 7, fontSize: 9, color: MUTED },
  tableValue: { width: "52%", padding: 7, fontSize: 9, fontFamily: "Helvetica-Bold" },
  planHeader: {
    backgroundColor: NAVY,
    color: "#FFFFFF",
    padding: 8,
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  groupHeader: {
    backgroundColor: "#E8E2D6",
    padding: 6,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: NAVY,
  },
  gridRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: RULE },
  gridLabel: { width: "55%", padding: 6, fontSize: 9 },
  gridValue: { width: "45%", padding: 6, fontSize: 9, textAlign: "right", fontFamily: "Helvetica-Bold" },
  disclaimer: { fontSize: 8, color: MUTED, lineHeight: 1.4, marginTop: 10 },
  footer: {
    position: "absolute",
    left: 48,
    right: 48,
    bottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: MUTED,
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 8,
  },
  signLine: { borderBottomWidth: 1, borderBottomColor: NAVY, height: 22, marginTop: 6, marginBottom: 14 },
  bindBox: { borderWidth: 1, borderColor: RULE, padding: 12, marginTop: 12 },
});

function money(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function Header({ logoSrc }: { logoSrc?: string }) {
  return (
    <View style={styles.headerRow}>
      {logoSrc ? <Image src={logoSrc} style={styles.logo} /> : <Text style={styles.company}>THE LOOMIS COMPANY</Text>}
      <View>
        <Text style={styles.company}>THE LOOMIS COMPANY</Text>
        <Text style={styles.tagline}>A LEGACY OF TRUST, COMMITMENT AND SERVICE</Text>
      </View>
    </View>
  );
}

function Footer({ page }: { page: number }) {
  return (
    <View style={styles.footer} fixed>
      <Text>The Loomis Company | Underwritten by SiriusPoint America Insurance Company</Text>
      <Text>Page {page}</Text>
    </View>
  );
}

function InfoRow({ label, value, alt }: { label: string; value: string; alt?: boolean }) {
  return (
    <View style={alt ? styles.tableRowAlt : styles.tableRow}>
      <Text style={styles.tableLabel}>{label}</Text>
      <Text style={styles.tableValue}>{value || "—"}</Text>
    </View>
  );
}

function PlanRow({ label, value, alt }: { label: string; value: string; alt?: boolean }) {
  return (
    <View style={alt ? styles.gridRow : styles.gridRow}>
      <Text style={[styles.gridLabel, alt ? { backgroundColor: ROW } : {}]}>{label}</Text>
      <Text style={[styles.gridValue, alt ? { backgroundColor: ROW } : {}]}>{value}</Text>
    </View>
  );
}

export function GapQuoteProposalPdf({
  group,
  issuedDate,
  logoSrc,
}: {
  group: PricedGroup;
  issuedDate: string;
  logoSrc?: string;
}) {
  const planLabel = group.planDesignLabel || `${money(group.deductible)} / ${money(group.benefit)}`;
  const issued = issuedDate || group.issuedDate;
  const total = {
    eeOnly: group.baseRates.eeOnly + group.adminFee,
    eeSpouse: group.baseRates.eeSpouse + group.adminFee,
    eeChildren: group.baseRates.eeChildren + group.adminFee,
    family: group.baseRates.family + group.adminFee,
  };

  return (
    <Document title={`GAP Quote Proposal — ${group.employerName}`}>
      <Page size="LETTER" style={styles.coverPage}>
        {logoSrc ? <Image src={logoSrc} style={styles.coverLogo} /> : <Text style={styles.coverTitle}>LOOMIS</Text>}
        <Text style={styles.kicker}>QUOTE PROPOSAL</Text>
        <Text style={styles.coverTitle}>GAP Medical Plan</Text>
        <Text style={styles.coverSubtitle}>Prepared exclusively for the employer group below.</Text>
        <Text style={styles.metaLabel}>PREPARED FOR</Text>
        <Text style={styles.metaValue}>{group.employerName}</Text>
        <Text style={styles.metaLabel}>PRESENTED BY</Text>
        <Text style={styles.metaValue}>{group.presentedBy || "—"}</Text>
        <Text style={styles.metaLabel}>UNDERWRITTEN BY</Text>
        <Text style={styles.metaValue}>SiriusPoint America Insurance Company</Text>
        <Footer page={1} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Header logoSrc={logoSrc} />
        <Text style={styles.sectionTitle}>GAP Medical</Text>
        <Text style={styles.body}>
          The Loomis Company partners with the Accident & Health (A&H) Division of SiriusPoint to deliver customized specialty products designed for individual, association, and group markets. Together we offer our clients the peace of mind needed when faced with unexpected health events — and the financial stress that goes along with those events.
        </Text>
        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Why Partner with The Loomis Company & SiriusPoint?</Text>
        <Text style={[styles.body, { marginBottom: 8 }]}>Meaningful, affordable coverage — built for the way today's workforce works.</Text>
        {[
          "25+ years of combined Accident & Health underwriting experience",
          "Tailored insurance solutions and expert guidance to meet your unique and evolving needs",
          "Customizable limits and deductibles",
          "Seasoned, responsive underwriters",
          "Experienced and high-quality claims servicing",
          "Robust financial strength, evidenced by leading carrier ratings:",
        ].map((item) => (
          <View key={item} style={styles.bulletRow}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.bulletText}>{item}</Text>
          </View>
        ))}
        <Text style={styles.nested}>A.M. Best: A</Text>
        <Text style={styles.nested}>Standard & Poor's: A</Text>
        <Text style={styles.nested}>Fitch: A</Text>
        <Text style={styles.nested}>Moody's: A3</Text>
        <Footer page={2} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Header logoSrc={logoSrc} />
        <Text style={styles.sectionTitle}>Quote Proposal Terms & Conditions</Text>
        <Text style={styles.body}>
          Please note that coverage and/or terms being offered may not be the same as requested. This proposal provides a brief description of the important features of the policy. Please request or refer to the Specimen Policy for complete policy details, including exclusions.
        </Text>
        <Text style={[styles.sectionTitle, { marginTop: 6 }]}>Policyholder Information</Text>
        <View style={styles.table}>
          <InfoRow label="Employer Group" value={group.employerName} />
          <InfoRow label="Employer Situs" value={group.situsStateCode || group.situsState} alt />
          <InfoRow label="Effective Date of Coverage" value={group.effectiveDate} />
          <InfoRow label="Date of Quote Proposal Issuance" value={issued} alt />
          <InfoRow label="Rate Guarantee" value={group.rateGuarantee || "1 Year"} />
          <InfoRow label="Pre-existing Condition Limitation" value={group.preExistingLimitation || "N/A"} alt />
          <InfoRow label="Classes of Eligible Persons" value={group.classesOfEligible || "Class 1 – Active Full Time Employees"} />
          <InfoRow label="Waiver of Premium" value={group.waiverOfPremium || "N/A"} alt />
          <InfoRow label="Coverage Type" value={group.coverageType || "24 Hour"} />
          <InfoRow label="Underwriting Basis" value={group.underwritingBasis || "Guaranteed Issue"} alt />
          <InfoRow label="Employer Contribution" value={group.employerContribution || "100%"} />
        </View>
        <Footer page={3} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Header logoSrc={logoSrc} />
        <Text style={styles.sectionTitle}>GAP Medical Plan Details</Text>
        <View style={{ borderWidth: 1, borderColor: RULE }}>
          <Text style={styles.planHeader}>{planLabel}</Text>
          <Text style={styles.groupHeader}>Plan Deductible</Text>
          <PlanRow label="Deductible Per Person" value={money(group.deductible)} />
          <PlanRow label="Deductible Maximum Per Family" value="2x Individual Deductible" alt />
          <Text style={styles.groupHeader}>Core Benefit</Text>
          <PlanRow label="Combined Inpatient & Outpatient Benefit" value={money(group.benefit)} />
          <PlanRow label="Maximum Benefit Per Family" value="2x Individual Benefit" alt />
          <PlanRow label="Ambulance Benefit" value="Covered by Outpatient Benefit" />
          <PlanRow label="Durable Medical Equipment Benefit" value="Covered by Outpatient Benefit" alt />
          <PlanRow label="Laboratory Testing Benefit" value="Covered by Outpatient Benefit" />
          <Text style={styles.groupHeader}>Monthly Rates</Text>
          <PlanRow label="Employee Only" value={money(group.baseRates.eeOnly)} alt />
          <PlanRow label="Employee + Spouse" value={money(group.baseRates.eeSpouse)} />
          <PlanRow label="Employee + Child(ren)" value={money(group.baseRates.eeChildren)} alt />
          <PlanRow label="Family" value={money(group.baseRates.family)} />
          <PlanRow label="Admin Fee" value={money(group.adminFee)} alt />
          <PlanRow label="Employee Only Total" value={money(total.eeOnly)} />
          <PlanRow label="Employee + Spouse Total" value={money(total.eeSpouse)} alt />
          <PlanRow label="Employee + Child(ren) Total" value={money(total.eeChildren)} />
          <PlanRow label="Family Total" value={money(total.family)} alt />
        </View>
        <Text style={styles.disclaimer}>
          This Coverage supplements the Covered Person's Health Benefit Plan and is available only while an underlying Health Benefit Plan is continuously maintained.
        </Text>
        <Text style={styles.disclaimer}>
          This Coverage is not a substitute for a Health Benefit Plan or intended to cover all medical expenses.
        </Text>
        <Footer page={4} />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Header logoSrc={logoSrc} />
        <Text style={styles.sectionTitle}>Request to Bind Quote Proposal</Text>
        <Text style={styles.body}>
          It is understood and agreed that it is our objective to accept the proposal offered by SiriusPoint America Insurance Company. We are agreeable to accepting your acceptance to this Proposal via email in lieu of printing this sheet and signing.
        </Text>
        <Text style={[styles.body, { fontFamily: "Helvetica-Bold" }]}>
          Please note, this quote is valid for 90 days from the Date of Quote Proposal Issuance or the Effective Date of Coverage, whichever occurs first.
        </Text>
        <View style={styles.bindBox}>
          <Text style={styles.metaLabel}>EFFECTIVE DATE OF COVERAGE</Text>
          <Text style={[styles.metaValue, { marginBottom: 12 }]}>{group.effectiveDate || "—"}</Text>
          <Text style={styles.metaLabel}>PLANS SELECTED</Text>
          <Text style={[styles.metaValue, { marginBottom: 16 }]}>{planLabel}</Text>
          <Text style={styles.metaLabel}>SIGNATURE</Text>
          <View style={styles.signLine} />
          <Text style={styles.metaLabel}>TODAY'S DATE</Text>
          <View style={styles.signLine} />
        </View>
        <Text style={[styles.disclaimer, { marginTop: 24 }]}>THE LOOMIS COMPANY</Text>
        <Text style={styles.disclaimer}>Underwritten by SiriusPoint America Insurance Company</Text>
        <Text style={styles.disclaimer}>
          SiriusPoint Administrative Office: One World Trade Center, 285 Fulton Street, 47th Floor, New York, NY 10007
        </Text>
        <Footer page={5} />
      </Page>
    </Document>
  );
}
