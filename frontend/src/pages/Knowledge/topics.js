// Plain-language knowledge bank. Figures in "Who pays whom" are illustrations, not CMS rates.
export const TOPICS = [
  {
    id: 'terms',
    title: 'Journey terms',
    kicker: 'Definitions',
    lead: 'The words on the screens, from the chart you receive to the file you send back. Each line is the meaning used in this application.',
    blocks: [
      {
        h: 'The codes',
        terms: [
          { term: 'ICD-10', means: 'International Classification of Diseases, 10th Revision. The standard list that gives a disease a short code so a chart, a claim, and a payment rule all name the same illness.' },
          { term: 'ICD-10-CM', means: 'ICD-10, Clinical Modification. The United States version used on medical records and claims. CODEX assigns these codes. C50.919 is the ICD-10-CM code for a breast cancer whose exact site is not stated.' },
          { term: 'CMS', means: 'Centers for Medicare & Medicaid Services. The United States government agency that runs Medicare and Medicaid and publishes the rules for risk-adjustment payment.' },
          { term: 'HCC', means: 'Hierarchical Condition Category. A payment group, not a second name for the disease. Related ICD-10 codes sit in one category. Hierarchical means that if several categories describe the same illness, only the most severe one counts toward payment.' },
          { term: 'HCC code', means: 'The category number shown next to a diagnosis, such as HCC 23 for breast cancer or HCC 280 for COPD. It says which payment group the ICD-10 code belongs to. Some ICD-10 codes, such as essential hypertension by itself, have no HCC.' },
          { term: 'CMS-HCC', means: 'The Hierarchical Condition Category list published by CMS. It is the Medicare Advantage model that turns documented illnesses into a risk score and a monthly payment.' },
          { term: 'CMS-HCC V28', means: 'Centers for Medicare & Medicaid Services — Hierarchical Condition Category, Version 28. V28 is the current version of that model. CODEX maps each supported ICD-10-CM code to a V28 category, or marks the code as having no V28 category. An older version, V24, is not the list this application uses.' },
        ],
      },
      {
        h: 'The chart and the visit',
        terms: [
          { term: 'Chart', means: 'One patient’s note for one visit: an office note, a pathology report, a prescription, a claim, or a home-visit note. CODEX codes the chart. It does not write a new diagnosis.' },
          { term: 'Encounter', means: 'That same visit, identified by an encounter ID, a date of service, a member, and a rendering provider. Codes are submitted for the encounter, not for the patient in general.' },
          { term: 'Member', means: 'The person covered by the health plan. The member ID ties the chart to the insurance record.' },
          { term: 'Eligibility', means: 'The visit checks that must pass before any code can be submitted. An acceptable clinician is an MD, DO, NP, or PA. The visit must be face-to-face or video. The note must be signed, the date must be present, and an encounter ID is required. A failed check keeps the codes as a problem list only.' },
        ],
      },
      {
        h: 'The three coding stages',
        terms: [
          { term: 'Layout extraction', means: 'Stage 1. CODEX splits the note into sections and lines and gives the page a layout confidence. Those lines are the input to the next stage.' },
          { term: 'Entity extraction', means: 'Stage 2. CODEX finds the conditions, medicines, and labs in those lines, and it skips a phrase the note says the patient does not have.' },
          { term: 'HCC coder', means: 'Stage 3. CODEX turns each supported condition into an ICD-10-CM code, maps it to CMS-HCC V28, applies combination rules, and compares the note with diagnoses already on the claim. In this demo the coder is a fixed rules program. A fine-tuned language model is the planned production coder and is not called here.' },
          { term: 'MEAT', means: 'Monitored, Evaluated, Assessed, Treated. The evidence that the condition was addressed in this record. A mention alone is weak. More of these four makes the code stronger.' },
        ],
      },
      {
        h: 'The decision and the file you send',
        terms: [
          { term: 'Confidence', means: 'CODEX’s score for one code, based on the evidence in the note. 78% means the support is real but incomplete. The score belongs to that code. Moving the bar does not change it.' },
          { term: 'Auto-submit threshold', means: 'The bar your organization sets, such as 88%. A code at or above the bar can be sent with no person, when the visit is eligible. A code below the bar waits for a coder. 78% against an 88% bar means a person must decide.' },
          { term: 'Coder review', means: 'The waiting lane. A person reads the chart sentence and presses Accept or Reject.' },
          { term: 'Accept', means: 'Put the code on the submission for this encounter.' },
          { term: 'Reject', means: 'Leave the code off the submission.' },
          { term: 'Held', means: 'Still waiting for Accept or Reject. A held code is not in the file you send.' },
          { term: 'Delete', means: 'A diagnosis that is on the claim and is not supported by the note. The next action is to remove it from the claim.' },
          { term: 'Physician query', means: 'A question to the doctor when the chart hints at a condition that is not documented well enough to code. The condition is not added from a lab or a score alone.' },
          { term: 'EDS', means: 'Encounter Data System. Medicare’s encounter submission. The output file lists the codes to add and the codes to delete for one encounter. Return that file to the system that sent the chart. CODEX does not treat the patient.' },
        ],
      },
    ],
  },
  {
    id: 'icd10',
    title: 'ICD-10',
    kicker: 'The diagnosis code',
    lead: 'ICD-10 is the standard list of codes for diagnoses. CODEX reads a visit note and assigns one of these codes to each condition the note supports.',
    blocks: [
      {
        h: 'What the letters stand for',
        p: 'ICD-10 means the International Classification of Diseases, 10th Revision. The World Health Organization maintains it. In the United States, clinical coding uses ICD-10-CM, the Clinical Modification, which adds detail for medical records and claims.',
      },
      {
        h: 'What a code looks like',
        items: [
          'Each code is a short set of letters and numbers that names one condition.',
          'E11.65 is type 2 diabetes with hyperglycemia. I48.0 is a type of atrial fibrillation.',
          'Coders, insurers, and software use the same codes so a chart, a claim, and a risk score all mean the same illness.',
        ],
      },
      {
        h: 'What CODEX does with it',
        items: [
          'CODEX reads the chart and picks the ICD-10 code that matches the words in the note.',
          'It keeps the line of text that supports the code, so a person can check the work.',
          'The ICD-10 code is then mapped to an HCC category when the buyer is a US Medicare Advantage plan.',
        ],
      },
    ],
  },
  {
    id: 'hcc',
    title: 'HCC',
    kicker: 'The payment category',
    lead: 'HCC means Hierarchical Condition Category. It is a Medicare payment group. CODEX is the software that produces the code. The HCC is one line in the result.',
    blocks: [
      {
        h: 'What an HCC code is',
        items: [
          'Medicare groups related ICD-10 diagnoses into one bucket. That bucket is the HCC.',
          'The bucket stands for how costly that illness tends to be. It changes the monthly amount Medicare pays the insurer for that member.',
          'Hierarchical means that when several codes describe the same illness at different levels of severity, only the most severe category counts.',
        ],
      },
      {
        h: 'How it sits next to ICD-10',
        items: [
          'ICD-10 names the diagnosis. HCC is the group that diagnosis falls into for payment.',
          'A documented heart-rhythm problem may be ICD-10 I48.0, and that code maps to HCC 238.',
          'A vague depression code can map to no HCC. A more specific one, such as recurrent moderate depression, can map to HCC 155.',
          'CODEX uses CMS-HCC V28. That name means Centers for Medicare & Medicaid Services — Hierarchical Condition Category, Version 28. CMS is the US agency that runs Medicare. V28 is the current version of its payment model. An older version, V24, is not the list this application uses.',
        ],
      },
      {
        h: 'What CODEX adds around the code',
        items: [
          'CODEX shows the line in the note that supports the code.',
          'It then routes the code: submit it, hold it for a coder, delete it, or ask the clinician.',
          'A code with no support in the note is removed. The product is built to keep codes that the chart can defend.',
        ],
      },
    ],
  },
  {
    id: 'chart',
    title: 'Chart',
    kicker: 'One visit note',
    lead: 'In CODEX, a chart is one patient’s medical note for one visit. It is the document the clinician wrote. It is not a graph.',
    blocks: [
      {
        h: 'What counts as a chart',
        items: [
          'A typed visit summary, a PDF, a scanned page, a handwritten home-visit note, or a discharge summary.',
          'One patient can have many charts, because each visit creates its own note.',
          'A chatbot conversation and an aide visit that only records vitals are not charts CODEX codes.',
        ],
      },
      {
        h: 'What “per chart” means in a price',
        p: 'When a pitch says per chart, the buyer pays once for each note that CODEX reads and codes. A plan that sends 100,000 visit notes is buying 100,000 charts of work.',
      },
      {
        h: 'What has to be on it before a code can be submitted',
        items: [
          'A real encounter: face to face or video, with an acceptable clinician such as a doctor, NP, or PA.',
          'The clinician’s signature, and an encounter ID so the code stays tied to that visit.',
          'Words in the note that show the condition was monitored, evaluated, assessed, or treated.',
        ],
      },
    ],
  },
  {
    id: 'medicare',
    title: 'Medicare Advantage',
    kicker: 'The best-fit buyer',
    lead: 'A Medicare Advantage health plan is a private insurance company in the United States that covers people age 65 and older, and some younger people with a disability, under a government contract.',
    blocks: [
      {
        h: 'How it relates to an insurer',
        items: [
          'Original Medicare is the government program. A person can instead join a plan sold by a private insurer.',
          'That insurer must cover at least the same hospital and doctor care, and often adds drugs, dental, or vision.',
          'Well-known sellers include UnitedHealthcare, Humana, Aetna, and Blue Cross Blue Shield plans.',
        ],
      },
      {
        h: 'Why this insurer is the lead customer for CODEX',
        items: [
          'Medicare pays the plan a monthly amount per member. The amount is higher when the member’s illnesses are documented with HCC codes.',
          'The plan holds the charts, the coding cost, and the duty to submit codes that an audit can defend.',
          'It can buy CODEX on its own, as a standalone coder for the charts it already holds.',
        ],
      },
      {
        h: 'Which insurers are a later or weaker pitch',
        items: [
          'An insurer that only sells employer or individual policies is a weak fit. Those policies pay for the treatment, not through an HCC risk score.',
          'Affordable Care Act and Medicaid plans have a similar coding problem and a different code model. The product treats them as a second phase.',
          'An Indian health insurer needs diagnosis codes on a claim. It is not paid through US Medicare HCC, so it is not the customer this product leads with.',
        ],
      },
    ],
  },
  {
    id: 'payment',
    title: 'Who pays whom',
    kicker: 'How the money moves',
    lead: 'The doctor group does not get a fee from CODEX. Medicare pays the insurer, and the insurer pays the doctor group. The monthly amount is higher when the chart shows how sick the patient really is.',
    flow: [
      ['1', 'Medicare', 'Pays the insurance company a fixed amount every month for each member.'],
      ['2', 'The insurer', 'Pays the doctor group a fixed amount every month for each member on the group’s list.'],
      ['3', 'The doctor group', 'Uses that money to see the patient, order tests, and pay for care.'],
    ],
    blocks: [
      {
        h: 'Why the amount changes',
        items: [
          'A member with heart failure and diabetes is expected to need more care than a member with neither, so Medicare’s monthly cheque is larger.',
          'The insurer passes a larger monthly amount to the doctor group, because the group has agreed to look after that member.',
          'Illustration, not a real rate: with no long-term illness written down, the group might receive $800 while care costs $1,100. With the illnesses documented and coded, the group might receive $1,100, which covers the care.',
          'A missing code leaves the group treating a sick patient on a healthy patient’s budget.',
        ],
      },
      {
        h: 'What each payer gets in return',
        items: [
          'Medicare pays more so that insurers and doctors will still enroll and treat sick people. If every sick member paid the same as a healthy one, plans would prefer healthy members.',
          'The insurer pays the doctor group more because the group is taking on the care. The government payment the insurer receives goes up as well, the patient is actually seen, and each code is tied to a real visit.',
          'A code with no support in the note can be taken back in an audit. The insurer wants the documented codes, including removals when the chart does not support a code.',
        ],
      },
      {
        h: 'Who does not pay',
        p: 'The patient does not pay CODEX and never sees it. A coding company that subscribes pays CODEX a platform fee plus a per-chart price, then still charges the insurer for the coding service.',
      },
    ],
  },
  {
    id: 'india',
    title: 'India record types',
    kicker: 'The same job, Indian documents',
    lead: 'CODEX as built codes US Medicare charts. In India the clinical note is the same kind of document, and the systems around it are different. Payment there is ICD-10 on a claim and package rates, not a US HCC score.',
    blocks: [
      {
        h: 'Types of record',
        items: [
          'Discharge summary. The main inpatient document: why the patient was admitted, what was found, the treatment, and the diagnosis at discharge.',
          'OPD consultation note. The outpatient visit: complaints, examination, diagnosis, and advice.',
          'Prescription. Medicines advised, in the format set by the Pharmacy Council of India.',
          'Lab and radiology reports. Blood tests, scans, and the written findings.',
          'Immunization records, wellness and vital signs, and old paper files the patient uploads.',
          'Handwritten OPD slips, inpatient case sheets, and referral letters. These are still common.',
          'Bills and claim papers. Itemized hospital and pharmacy bills, implant invoices, and the signed claim form.',
        ],
      },
      {
        h: 'Where the record comes from',
        items: [
          'The hospital medical records department and the hospital system, including government systems such as eHospital.',
          'The doctor’s clinic, on paper or in clinic software.',
          'Labs and scan centres, often as a PDF.',
          'The patient’s ABHA record. Ayushman Bharat Digital Mission shares eight standard types: discharge summary, OPD consult, prescription, diagnostic report, immunization, wellness record, a general health document, and an invoice.',
          'The insurer path: National Health Claims Exchange, private insurers, and third-party administrators. A claim carries an ICD-10 diagnosis and attached PDFs.',
          'Government schemes: Ayushman Bharat PM-JAY, CGHS, ESIC, and state health schemes.',
        ],
      },
      {
        h: 'Which code lists apply',
        items: [
          'ICD-10 on the insurance claim.',
          'SNOMED CT for clinical terms inside ABDM records.',
          'LOINC for lab tests.',
          'The PM-JAY package list for scheme billing.',
          'A US HCC category is not the payment unit for these records.',
        ],
      },
    ],
  },
]
