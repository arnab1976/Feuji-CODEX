"""Clinical concept dictionary used by the rule-based (demo) coding engine.

Each entry: group, regex, ICD-10-CM code, description, CMS-HCC V28 category (or None), HCC label.
Entries are ordered most-specific first inside a group; the engine keeps the first match per group.
Edit / extend freely. Production CODEX replaces this with BioBERT NER + the fine-tuned LLM coder.
"""
import re

DICT = [
    {'g': 'dm', 're': 'type\\s*(2|ii)\\s*diabetes[^.;\\n]*?(chronic kidney|ckd|nephropathy)|diabetic (chronic kidney|ckd|nephropathy)', 'c': 'E11.22', 'd': 'Type 2 diabetes mellitus with diabetic chronic kidney disease', 'h': '37', 'hn': 'Diabetes with Chronic Complications'},
    {'g': 'dm', 're': 'type\\s*(2|ii)\\s*diabetes[^.;\\n]*?neuropathy|diabetic (poly)?neuropathy', 'c': 'E11.40', 'd': 'Type 2 diabetes mellitus with diabetic neuropathy, unspecified', 'h': '37', 'hn': 'Diabetes with Chronic Complications'},
    {'g': 'dm', 're': 'type\\s*(2|ii)\\s*diabetes|\\bt2dm\\b|\\bdm2\\b|diabetes mellitus', 'c': 'E11.9', 'd': 'Type 2 diabetes mellitus without complications', 'h': '38', 'hn': 'Diabetes with Glycemic, Unspecified, or No Complications'},
    {'g': 'ckd', 're': 'ckd\\s*(stage\\s*)?5|chronic kidney disease,?\\s*stage\\s*5|end[- ]stage renal|\\besrd\\b', 'c': 'N18.6', 'd': 'End stage renal disease', 'h': '326', 'hn': 'Chronic Kidney Disease, Stage 5'},
    {'g': 'ckd', 're': 'ckd\\s*(stage\\s*)?4|chronic kidney disease,?\\s*stage\\s*4', 'c': 'N18.4', 'd': 'Chronic kidney disease, stage 4 (severe)', 'h': '327', 'hn': 'Chronic Kidney Disease, Severe (Stage 4)'},
    {'g': 'ckd', 're': 'ckd\\s*(stage\\s*)?3b|chronic kidney disease,?\\s*stage\\s*3b', 'c': 'N18.32', 'd': 'Chronic kidney disease, stage 3b', 'h': '328', 'hn': 'Chronic Kidney Disease, Moderate (Stage 3B)'},
    {'g': 'ckd', 're': 'ckd\\s*(stage\\s*)?3a|chronic kidney disease,?\\s*stage\\s*3a', 'c': 'N18.31', 'd': 'Chronic kidney disease, stage 3a', 'h': '329', 'hn': 'Chronic Kidney Disease, Moderate (Stage 3, Except 3B)'},
    {'g': 'ckd', 're': 'ckd\\s*(stage\\s*)?3\\b|chronic kidney disease,?\\s*stage\\s*3\\b', 'c': 'N18.30', 'd': 'Chronic kidney disease, stage 3 unspecified', 'h': '329', 'hn': 'Chronic Kidney Disease, Moderate (Stage 3, Except 3B)'},
    {'g': 'ckd', 're': 'chronic kidney disease|\\bckd\\b', 'c': 'N18.9', 'd': 'Chronic kidney disease, unspecified', 'h': None, 'hn': 'No V28 HCC (stage required)', 'spec': 1},
    {'g': 'hf', 're': 'acute on chronic[^.;\\n]*?(heart failure|\\bhf\\b)', 'c': 'I50.23', 'd': 'Acute on chronic systolic (congestive) heart failure', 'h': '224', 'hn': 'Acute on Chronic Heart Failure'},
    {'g': 'hf', 're': 'chronic systolic[^.;\\n]*?heart failure|\\bhfref\\b|heart failure with reduced', 'c': 'I50.22', 'd': 'Chronic systolic (congestive) heart failure', 'h': '226', 'hn': 'Heart Failure, Except End-Stage and Acute'},
    {'g': 'hf', 're': 'chronic diastolic[^.;\\n]*?heart failure|\\bhfpef\\b|heart failure with preserved', 'c': 'I50.32', 'd': 'Chronic diastolic (congestive) heart failure', 'h': '226', 'hn': 'Heart Failure, Except End-Stage and Acute'},
    {'g': 'hf', 're': 'heart failure|\\bchf\\b', 'c': 'I50.9', 'd': 'Heart failure, unspecified', 'h': '226', 'hn': 'Heart Failure, Except End-Stage and Acute', 'spec': 1},
    {'g': 'copd', 're': '\\bcopd\\b|chronic obstructive', 'c': 'J44.9', 'd': 'Chronic obstructive pulmonary disease, unspecified', 'h': '280', 'hn': 'COPD, Interstitial Lung Disorders and Other Chronic Lung Disorders'},
    {'g': 'af', 're': 'paroxysmal atrial fibrillation|paroxysmal a-?fib', 'c': 'I48.0', 'd': 'Paroxysmal atrial fibrillation', 'h': '238', 'hn': 'Specified Heart Arrhythmias'},
    {'g': 'af', 're': 'persistent atrial fibrillation', 'c': 'I48.19', 'd': 'Other persistent atrial fibrillation', 'h': '238', 'hn': 'Specified Heart Arrhythmias'},
    {'g': 'af', 're': 'permanent atrial fibrillation', 'c': 'I48.21', 'd': 'Permanent atrial fibrillation', 'h': '238', 'hn': 'Specified Heart Arrhythmias'},
    {'g': 'af', 're': 'atrial fibrillation|\\ba-?fib\\b', 'c': 'I48.91', 'd': 'Unspecified atrial fibrillation', 'h': '238', 'hn': 'Specified Heart Arrhythmias', 'spec': 0.4},
    {'g': 'obes', 're': 'morbid(ly)?\\s*(\\(severe\\)\\s*)?obes|severe obesity', 'c': 'E66.01', 'd': 'Morbid (severe) obesity due to excess calories', 'h': '48', 'hn': 'Morbid Obesity'},
    {'g': 'dep', 're': '(major depressive disorder|mdd|depression)[^.;\\n]*?recurrent[^.;\\n]*?severe|recurrent[^.;\\n]*?severe[^.;\\n]*?depress', 'c': 'F33.2', 'd': 'Major depressive disorder, recurrent, severe without psychotic features', 'h': '155', 'hn': 'Major Depression, Moderate or Severe, without Psychosis'},
    {'g': 'dep', 're': '(major depressive disorder|mdd|depression)[^.;\\n]*?recurrent[^.;\\n]*?moderate|recurrent[^.;\\n]*?moderate[^.;\\n]*?depress', 'c': 'F33.1', 'd': 'Major depressive disorder, recurrent, moderate', 'h': '155', 'hn': 'Major Depression, Moderate or Severe, without Psychosis'},
    {'g': 'dep', 're': '(major depressive disorder|mdd)[^.;\\n]*?single episode[^.;\\n]*?moderate', 'c': 'F32.1', 'd': 'Major depressive disorder, single episode, moderate', 'h': '155', 'hn': 'Major Depression, Moderate or Severe, without Psychosis'},
    {'g': 'dep', 're': 'depress', 'c': 'F32.A', 'd': 'Depression, unspecified', 'h': None, 'hn': 'No V28 HCC (severity not documented)', 'spec': 0.2},
    {'g': 'alz', 're': "alzheimer'?s?[^.;\\n]*?late onset|late[- ]onset alzheimer", 'c': 'G30.1', 'd': "Alzheimer's disease with late onset", 'h': '127', 'hn': 'Dementia, Mild or Unspecified (hierarchy applies)'},
    {'g': 'alz', 're': 'alzheimer', 'c': 'G30.9', 'd': "Alzheimer's disease, unspecified", 'h': '127', 'hn': 'Dementia, Mild or Unspecified (hierarchy applies)'},
    {'g': 'dem', 're': 'dementia[^.;\\n]*?severe', 'c': 'F03.C0', 'd': 'Unspecified dementia, severe, without behavioural disturbance', 'h': '125', 'hn': 'Dementia, Severe'},
    {'g': 'dem', 're': 'dementia[^.;\\n]*?(moderate|\\bmod\\b\\.?)', 'c': 'F03.B0', 'd': 'Unspecified dementia, moderate, without behavioural disturbance', 'h': '126', 'hn': 'Dementia, Moderate'},
    {'g': 'dem', 're': 'dementia', 'c': 'F03.90', 'd': 'Unspecified dementia, unspecified severity, without behavioural disturbance', 'h': '127', 'hn': 'Dementia, Mild or Unspecified'},
    {'g': 'brca', 're': 'breast (ca|cancer|carcinoma)\\b|breast ca\\b', 'c': 'C50.919', 'd': 'Malignant neoplasm of unspecified site of unspecified female breast', 'h': '23', 'hn': 'Prostate, Breast, and Other Cancers and Tumors', 'cancer': 1, 'histC': 'Z85.3', 'histD': 'Personal history of malignant neoplasm of breast'},
    {'g': 'lungca', 're': 'lung (ca|cancer|carcinoma)\\b|\\bnsclc\\b', 'c': 'C34.90', 'd': 'Malignant neoplasm of unspecified part of unspecified bronchus or lung', 'h': '20', 'hn': 'Lung and Other Severe Cancers', 'cancer': 1, 'histC': 'Z85.118', 'histD': 'Personal history of other malignant neoplasm of bronchus and lung'},
    {'g': 'prost', 're': 'prostate (ca|cancer|carcinoma)\\b', 'c': 'C61', 'd': 'Malignant neoplasm of prostate', 'h': '23', 'hn': 'Prostate, Breast, and Other Cancers and Tumors', 'cancer': 1, 'histC': 'Z85.46', 'histD': 'Personal history of malignant neoplasm of prostate'},
    {'g': 'ra', 're': 'rheumatoid arthritis', 'c': 'M06.9', 'd': 'Rheumatoid arthritis, unspecified', 'h': '93', 'hn': 'Rheumatoid Arthritis and Other Specified Inflammatory Rheumatic Disorders'},
    {'g': 'scz', 're': 'schizophrenia', 'c': 'F20.9', 'd': 'Schizophrenia, unspecified', 'h': '151', 'hn': 'Schizophrenia'},
    {'g': 'hiv', 're': '\\bhiv\\b', 'c': 'B20', 'd': 'Human immunodeficiency virus [HIV] disease', 'h': '1', 'hn': 'HIV/AIDS'},
    {'g': 'htn', 're': 'hypertension|\\bhtn\\b', 'c': 'I10', 'd': 'Essential (primary) hypertension', 'h': None, 'hn': 'No V28 HCC'},
    {'g': 'lipid', 're': 'hyperlipid|dyslipid|hypercholesterol', 'c': 'E78.5', 'd': 'Hyperlipidemia, unspecified', 'h': None, 'hn': 'No V28 HCC'},
    {'g': 'pvd', 're': 'peripheral vascular disease|peripheral arterial disease|\\bpvd\\b|\\bpad\\b|claudication', 'c': 'I73.9', 'd': 'Peripheral vascular disease, unspecified', 'h': None, 'hn': 'No V28 HCC (V24: HCC 108)'},
    {'g': 'thy', 're': 'hypothyroid', 'c': 'E03.9', 'd': 'Hypothyroidism, unspecified', 'h': None, 'hn': 'No V28 HCC'},
]
for _e in DICT:
    _e["rx"] = re.compile(_e["re"], re.I)

CODEINFO = {e["c"]: {"d": e["d"], "h": e["h"]} for e in DICT}
CODEINFO.update({'I13.0': {'d': 'Hypertensive heart and CKD with heart failure', 'h': '226'}, 'I11.0': {'d': 'Hypertensive heart disease with heart failure', 'h': '226'}, 'Z68.41': {'d': 'BMI 40.0–44.9, adult', 'h': '48'}, 'F02.B0': {'d': 'Dementia in other diseases, moderate', 'h': '126'}, 'C50.912': {'d': 'Malignant neoplasm of left female breast', 'h': '23'}, 'C50.911': {'d': 'Malignant neoplasm of right female breast', 'h': '23'}})

# medications that corroborate treatment (T in MEAT) per condition group
MEDG = {k: re.compile(v, re.I) for k, v in {'dm': 'metformin|insulin|glipizide|empagliflozin|dapagliflozin|semaglutide|dulaglutide|sitagliptin', 'hf': 'furosemide|carvedilol|spironolactone|sacubitril|metoprolol succinate|torsemide', 'copd': 'tiotropium|albuterol|fluticasone|umeclidinium|budesonide', 'af': 'apixaban|rivaroxaban|warfarin|dabigatran|metoprolol|diltiazem', 'dep': 'sertraline|escitalopram|fluoxetine|bupropion|venlafaxine|duloxetine', 'alz': 'donepezil|memantine|rivastigmine', 'dem': 'donepezil|memantine|rivastigmine', 'brca': 'anastrozole|letrozole|exemestane|tamoxifen', 'prost': 'leuprolide|enzalutamide|bicalutamide|abiraterone', 'ra': 'methotrexate|adalimumab|etanercept|hydroxychloroquine', 'htn': 'lisinopril|losartan|amlodipine|hydrochlorothiazide|valsartan', 'lipid': 'atorvastatin|rosuvastatin|simvastatin', 'thy': 'levothyroxine', 'ckd': 'empagliflozin|dapagliflozin|nephrology'}.items()}

# knowledge-graph context sentences shown in stage 01
KGTXT = {
    "dm": "Diabetes → V28 HCC 36–38 family; complication codes (E11.2x/E11.4x) map to HCC 37",
    "ckd": "CKD → stage-specific N18.3x/N18.4/N18.6 (HCC 326–329); N18.9 carries no HCC",
    "hf": "Heart failure → I50.x (HCC 222–226); type and acuity drive specificity",
    "copd": "COPD → J44.x (HCC 280); RxNorm inhalers corroborate treatment",
    "af": "Atrial fibrillation → I48.x (HCC 238); anticoagulant corroborates",
    "obes": "Morbid obesity → E66.01 + Z68.4x (HCC 48) only with clinician-documented diagnosis",
    "dep": "Depression → only specified severity maps in V28 (F32.1/F32.2/F33.x → HCC 155); F32.A has no HCC",
    "alz": "Alzheimer's → G30.x with F02.xx dementia code; severity drives HCC 125–127",
    "dem": "Dementia severity (mild/moderate/severe) selects HCC 127/126/125",
    "brca": "Breast cancer → C50.x if under active treatment (e.g. aromatase inhibitor), else Z85.3 history",
    "lungca": "Lung cancer → C34.x (HCC 20) if active",
    "prost": "Prostate cancer → C61 (HCC 23) if active",
    "ra": "Rheumatoid arthritis → M06.x (HCC 93); DMARD corroborates",
    "scz": "Schizophrenia → F20.x (HCC 151)",
    "hiv": "HIV → B20 (HCC 1)",
    "htn": "Hypertension with HF/CKD → combination codes I11/I12/I13 per ICD-10-CM I.C.9.a",
    "lipid": "Hyperlipidemia → E78.x (no HCC)",
    "pvd": "PVD unspecified I73.9 has no V28 HCC (was HCC 108 in V24)",
    "thy": "Hypothyroidism → E03.9 (no HCC)"
}

# evidence patterns: Monitor / Evaluate / Assess / Treat, negation, history, meds, labs
ACTIVE_TX = re.compile(r"anastrozole|letrozole|exemestane|tamoxifen|chemo|radiation|on treatment|leuprolide|enzalutamide|active surveillance|immunotherapy", re.I)
NEG = re.compile(r"\b(denies|denied|no (evidence|history|hx|signs?|symptoms?) of|negative for|rule out|r/o|ruled out|resolved)\b", re.I)
HIST = re.compile(r"\b(history of|hx of|h/o|hx|s/p)\b", re.I)
MRE = re.compile(r"\b(stable|monitor|follow[- ]?up|f/u|controlled|unchanged|tolerat|improv|worsen|symptom|reports?|euvolemic|rate controlled)", re.I)
ERE = re.compile(r"\b(a1c|hba1c|egfr|creatinine|bp|ef|lvef|echo|exam|mmse|phq-?9|pft|labs?|bmi|psa|inr|uacr)\b|\d+(\.\d+)?\s*%", re.I)
ARE = re.compile(r"\b(assess|diagnos|uncontrolled|above goal|at goal|consistent with|severity|stage)", re.I)
TRE = re.compile(r"\b(continue|cont\.|increase|decrease|start|stop|refer|referral|prescrib|order|counsel|dose|therapy|surveillance|program)|\d+\s*(mg|mcg|units)\b", re.I)
MEDRE = re.compile(r"\b(metformin|insulin|glipizide|empagliflozin|dapagliflozin|semaglutide|lisinopril|losartan|amlodipine|carvedilol|metoprolol|furosemide|spironolactone|atorvastatin|rosuvastatin|apixaban|rivaroxaban|warfarin|tiotropium|albuterol|fluticasone|sertraline|escitalopram|fluoxetine|bupropion|donepezil|memantine|anastrozole|letrozole|tamoxifen|levothyroxine|methotrexate|prednisone|aspirin|clopidogrel|gabapentin|diltiazem|leuprolide)\b(\s*\d+(\.\d+)?\s*(mg|mcg|units?))?", re.I)
LABRE = re.compile(r"\b(hba1c|a1c|egfr|creatinine|lvef|bmi|phq-?9|mmse|uacr|psa|ldl)\b[^,;\n]{0,12}?\d+(\.\d+)?\s*(%|mg/dl|mg/g|/30)?", re.I)
CLAIM_CODE = re.compile(r"\b[A-TV-Z]\d{2}(?:\.[0-9A-Z]{1,4})?\b")
