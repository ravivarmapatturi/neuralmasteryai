import unittest
from types import SimpleNamespace
from interview_judge import review

class JudgeTests(unittest.TestCase):
    def test_validates_before_running_model(self):
        with self.assertRaises(ValueError):
            review(None, None, {"question": "Q", "answer": "", "criteria": ["Accuracy"]})

    def test_maps_each_rubric_probability_without_claiming_overall_accuracy(self):
        class Model:
            def system_one(self, *, state, questions):
                self.state, self.questions = state, questions
                return SimpleNamespace(answers={"0": SimpleNamespace(noul=0.7)})
        model = Model()
        result = review(model, lambda **kwargs: kwargs, {"question": "Q", "answer": "A", "criteria": ["Accuracy"]})
        self.assertEqual(result["criteria"], [{"criterion": "Accuracy", "probability": 0.7}])
        self.assertNotIn("correctness", result)
        self.assertIn("untrusted", model.questions["0"]["instructions"])

if __name__ == '__main__':
    unittest.main()
