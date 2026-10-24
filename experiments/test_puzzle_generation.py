"""Exercise the new authoring workflow offline without downloading map data."""
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from shapely.geometry import LineString

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("puzzle_generator", ROOT / "scripts/generate-puzzle.py")
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)


class PuzzleGenerationTests(unittest.TestCase):
    def test_complete_output_and_changed_crop_uses_another_graph(self):
        puzzle = json.loads((ROOT / "puzzles.json").read_text(encoding="utf-8"))["puzzles"][-1]
        with TemporaryDirectory(prefix="streetprint-test-") as folder:
            output = Path(folder)
            with patch.object(generator, "load_streets", return_value=([LineString([(0, 0), (10, 10)])], None)) as streets:
                with patch.object(generator, "load_water", return_value=[]):
                    generator.generate_puzzle(puzzle, 1, True, output)
                    original_key = streets.call_args.args[0]["id"]
                    receipt = json.loads((output / f"{puzzle['id']}.json").read_text())
                    self.assertEqual(receipt["map"], puzzle["map"])
                    self.assertIn("<svg", (output / f"{puzzle['id']}.svg").read_text())
                    self.assertIn("Review copy", (output / f"{puzzle['id']}.html").read_text())
                    puzzle["map"]["center"][0] += 0.01
                    generator.generate_puzzle(puzzle, 1, True, output)
                    self.assertNotEqual(original_key, streets.call_args.args[0]["id"])
            before = (output / f"{puzzle['id']}.svg").read_bytes()
            with patch.object(generator, "load_streets", side_effect=RuntimeError("API unavailable")):
                with self.assertRaisesRegex(RuntimeError, "API unavailable"):
                    generator.generate_puzzle(puzzle, 1, True, output)
            self.assertEqual((output / f"{puzzle['id']}.svg").read_bytes(), before)


if __name__ == "__main__":
    unittest.main()
