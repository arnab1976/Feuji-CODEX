from app.agents.pipeline import gate_agent, run_pipeline
from app.engine.curated import chart_text
from app.engine.parser import default_meta, norm_meta, parse_text
from app.engine.simulator import sample_pack, sim_chart


def run(text):
    hm, _ = parse_text(text)
    meta = default_meta(norm_meta(hm))
    return meta, run_pipeline(text, meta)


def codes(chart):
    return [c["icd10"] for c in chart["codes"]]


def test_chart_a_text_combination_and_bmi():
    _, c = run(chart_text("A"))
    assert {"E11.22", "N18.32", "I50.22", "I13.0", "E66.01", "Z68.41", "E78.5"} <= set(codes(c))
    assert "I10" not in codes(c)                          # replaced by I13.0
    assert {"DIABETES × HF", "HF × KIDNEY"} <= set(c["interactions"])


def test_chart_b_two_way_and_gap():
    _, c = run(chart_text("B"))
    assert {"J44.9", "I48.0", "F32.A", "I73.9"} <= set(codes(c))
    assert [d["icd10"] for d in c["deletes"]] == ["I50.9"]   # unsupported claim dx
    assert c["gap"]["code"] == "N18.32"                     # lab-only CKD → query, not a code
    assert "N18.32" not in codes(c)


def test_chart_c_cancer_active_and_dementia():
    _, c = run(chart_text("C"))
    assert {"G30.1", "F02.B0", "C50.912", "Z79.811"} <= set(codes(c))


def test_negation_and_history():
    _, c = run("Assessment & plan:\n1. Denies heart failure.\n2. History of prostate cancer, no current treatment.")
    assert "I50.9" not in codes(c)
    assert "Z85.46" in codes(c) and "C61" not in codes(c)


def test_eligibility_blocks_rn_and_routes():
    meta, c = run("Provider type: RN\nAssessment & plan:\n1. COPD: stable, continue tiotropium 18 mcg.")
    e = gate_agent.eligibility(meta)
    assert not e["passed"]
    lanes = gate_agent.route(c, e, 0.9, {})
    assert all(x["lane"] == "blocked" for x in lanes)


def test_simulator_and_pack():
    s = sim_chart(7)
    assert "Assessment & plan:" in s["text"]
    pack = sample_pack()
    assert "batch_5_records.csv" in pack and pack["batch_5_records.csv"].count("\nREC-") == 5
