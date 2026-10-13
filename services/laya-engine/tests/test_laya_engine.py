"""
Tests for the PrepAI Laya decision service.

These run against the real convaiinnovations/laya checkpoint (loaded once per test run) and
the FastAPI app. They check schema/contract behaviour and coarse discrimination; Laya's
accuracy is measured separately by the benchmark suite (server/src/evals).
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402

import model  # noqa: E402
from app import app  # noqa: E402
from schemas import DECISION_LABELS, DECISION_VERSION  # noqa: E402

QUESTION = "What is a process in an operating system?"
CONCEPTS = ["program in execution", "process state", "PCB"]
GOOD = ("A process is a program in execution. The OS tracks it with a Process Control Block (PCB) "
        "that stores its state (ready, running, waiting), registers and memory information.")
WRONG = "A process is a type of CPU cable that connects the RAM to the keyboard."


class LayaServiceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        model.load_laya_agent()
        cls.client = TestClient(app)

    def test_health_reports_ready_model(self):
        res = self.client.get("/health").json()
        self.assertEqual(res["status"], "healthy")
        self.assertTrue(res["model_ready"])

    def test_single_decision_contract(self):
        res = self.client.post("/internal/laya/decision", json={
            "decision_type": "answer_state",
            "state": {"question": QUESTION, "expected_concepts": CONCEPTS, "student_answer": GOOD},
        })
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertIn(body["decision"], DECISION_LABELS["answer_state"])
        self.assertEqual(body["decision_version"], DECISION_VERSION)
        self.assertAlmostEqual(sum(body["probabilities"].values()), 1.0, places=2)
        self.assertGreaterEqual(body["confidence"], 0.0)
        self.assertLessEqual(body["confidence"], 1.0)

    def test_every_decision_type_returns_allowed_labels(self):
        for decision_type, labels in DECISION_LABELS.items():
            state = {"question": QUESTION, "expected_concepts": CONCEPTS, "student_answer": GOOD,
                     "concept": "PCB", "mastery": 82, "recent_scores": [80, 85, 78]}
            res = self.client.post("/internal/laya/decision", json={"decision_type": decision_type, "state": state})
            self.assertEqual(res.status_code, 200, decision_type)
            self.assertIn(res.json()["decision"], labels, decision_type)

    def test_unknown_decision_type_is_rejected(self):
        res = self.client.post("/internal/laya/decision", json={"decision_type": "write_essay", "state": {}})
        self.assertEqual(res.status_code, 400)

    def test_oversized_requests_are_rejected_before_inference(self):
        # 41 concepts would mean 41 extra model passes; the schema caps it at 40
        res = self.client.post("/internal/laya/batch", json={
            "question": "q", "student_answer": "a", "expected_concepts": [f"c{i}" for i in range(41)],
        })
        self.assertEqual(res.status_code, 422)
        res = self.client.post("/internal/laya/decision", json={
            "decision_type": "relevance", "state": {"question": "q", "student_answer": "x" * 8001},
        })
        self.assertEqual(res.status_code, 422)

    def test_batch_distinguishes_correct_from_wrong(self):
        good = self.client.post("/internal/laya/batch", json={"question": QUESTION, "expected_concepts": CONCEPTS, "student_answer": GOOD}).json()
        wrong = self.client.post("/internal/laya/batch", json={"question": QUESTION, "expected_concepts": CONCEPTS, "student_answer": WRONG}).json()
        p_good = good["decisions"]["answer_state"]["probabilities"]["CORRECT"]
        p_wrong = wrong["decisions"]["answer_state"]["probabilities"]["CORRECT"]
        self.assertGreater(p_good, p_wrong)
        self.assertEqual(len(good["concepts"]), len(CONCEPTS))

    def test_unloaded_model_returns_503_not_a_guess(self):
        saved = model._agent
        model._agent = None
        original_loader = model.load_laya_agent
        model.load_laya_agent = lambda: None
        try:
            res = self.client.post("/internal/laya/decision", json={
                "decision_type": "answer_state", "state": {"question": QUESTION, "student_answer": GOOD}})
            self.assertEqual(res.status_code, 503)
        finally:
            model._agent = saved
            model.load_laya_agent = original_loader

    def test_resume_extract_rejects_non_pdf(self):
        res = self.client.post("/internal/resume/extract", files={"file": ("a.txt", b"hello", "text/plain")})
        self.assertEqual(res.status_code, 400)


if __name__ == "__main__":
    unittest.main()
