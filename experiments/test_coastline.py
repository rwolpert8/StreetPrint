"""Offline geometry checks: python -m unittest discover -s experiments -p 'test_*.py'."""
import unittest
from unittest.mock import patch

import geopandas as gpd

from shapely.geometry import LineString, Point, box
from shapely import union_all

from generate import coastal_water, load_water, local_crs
from osmnx._errors import InsufficientResponseError


class CoastalWaterTests(unittest.TestCase):
    def test_water_is_right_of_coast_and_clipped_to_frame(self):
        frame = box(-10, -10, 10, 10)
        water = union_all(coastal_water([LineString([(0, -20), (0, 20)])], frame))
        self.assertEqual(water.area, 200)
        self.assertTrue(water.contains(Point(5, 0)))
        self.assertFalse(water.contains(Point(-5, 0)))
        self.assertTrue(frame.covers(water))

    def test_island_stays_dry_inside_water(self):
        island = LineString([(-2, -2), (2, -2), (2, 2), (-2, 2), (-2, -2)])
        water = union_all(coastal_water([island], box(-10, -10, 10, 10)))
        self.assertEqual(water.area, 384)
        self.assertFalse(water.contains(Point(0, 0)))
        self.assertTrue(water.contains(Point(5, 0)))

    def test_joined_fragments_and_two_shores(self):
        coast = [LineString([(-3, -20), (-3, 0)]), LineString([(-3, 0), (-3, 20)]),
                 LineString([(3, 20), (3, -20)])]
        water = union_all(coastal_water(coast, box(-10, -10, 10, 10)))
        self.assertEqual(water.area, 120)
        self.assertTrue(water.contains(Point(0, 0)))
        self.assertFalse(water.contains(Point(6, 0)))

    def test_broken_or_missing_coastline_is_rejected(self):
        for coast in ([], [LineString([(0, -20), (0, 0)])]):
            with self.assertRaises(ValueError):
                coastal_water(coast, box(-10, -10, 10, 10))

    def test_harbour_polygon_without_coastline_is_kept(self):
        harbour = box(0, -500, 500, 500)
        features = gpd.GeoDataFrame({"natural": ["water"]}, geometry=[harbour], crs=local_crs(0, 0))
        with patch("generate.ox.features_from_polygon", return_value=features):
            water = union_all(load_water({"center": [0, 0]}, 1000, coastline=True))
        self.assertEqual(water.area, harbour.area)
        self.assertTrue(water.contains(Point(250, 0)))

    def test_no_water_is_allowed_but_other_api_failures_are_not_hidden(self):
        with patch("generate.ox.features_from_polygon", side_effect=InsufficientResponseError("No matching features. Check query location, tags, and log.")):
            self.assertEqual(load_water({"center": [0, 0]}, 1000, True), [])
        with patch("generate.ox.features_from_polygon", side_effect=InsufficientResponseError("Invalid server response")):
            with self.assertRaises(InsufficientResponseError):
                load_water({"center": [0, 0]}, 1000, True)

    def test_legacy_riverbank_without_natural_column(self):
        features = gpd.GeoDataFrame({"waterway": ["riverbank"]}, geometry=[box(0, -500, 500, 500)], crs=local_crs(0, 0))
        with patch("generate.ox.features_from_polygon", return_value=features):
            self.assertEqual(union_all(load_water({"center": [0, 0]}, 1000, True)).area, 500000)


if __name__ == "__main__":
    unittest.main()
