import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location("import_cities", Path(__file__).with_name("import-cities.py"))
importer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(importer)


def row(gid, name="Example", population=60000, feature="PPL", country="US"):
    return [str(gid), name, name, "", "40", "-75", "P", feature, country, "", "PA", "", "", "",
            str(population), "", "", "", "2026-11-21"]


class ImportCitiesTests(unittest.TestCase):
    def build(self, rows, overrides=None):
        return importer.build_catalogue(rows, {"US": ["United States", "North America", "USA"]},
                                        {"US.PA": "Pennsylvania"}, overrides or [])

    def test_population_capitals_and_feature_filter(self):
        result = self.build([row(1), row(2, population=49999), row(3, population=1000, feature="PPLC"),
                             row(4, feature="PPLX"), row(5, feature="PPLQ"), row(6, population=50000)])
        self.assertEqual([city[0] for city in result["cities"]], ["geonames-1", "geonames-3", "geonames-6"])

    def test_pinned_city_preserves_identity_and_aliases_below_threshold(self):
        source = row(1, name="Source Name", population=1000)
        source[3] = "Old Name,OLD NAME,Alternate Name"
        result = self.build([source], [{"geonameId": 1, "id": "us-existing", "name": "Old Name",
                                       "countryCode": "us", "latitude": 41, "longitude": -74,
                                       "aliases": ["Local Name"]}])
        city = result["cities"][0]
        self.assertEqual(city[:2], ["us-existing", "Old Name"])
        self.assertEqual(city[4:6], [41, -74])
        self.assertEqual(city[7], ["Local Name", "Source Name", "Alternate Name"])

    def test_missing_or_moved_pinned_city_fails_instead_of_changing_saved_identity(self):
        override = {"geonameId": 1, "id": "us-existing", "countryCode": "us"}
        with self.assertRaisesRegex(ValueError, "missing"):
            self.build([], [override])
        with self.assertRaisesRegex(ValueError, "unique"):
            self.build([row(1)], [override, override])
        with self.assertRaisesRegex(ValueError, "Country changed"):
            self.build([row(1)], [{**override, "countryCode": "ca"}])

    def test_invalid_coordinates_and_duplicate_source_ids_are_rejected(self):
        invalid = row(1)
        invalid[4] = "nan"
        with self.assertRaisesRegex(ValueError, "coordinates"):
            self.build([invalid])
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.build([row(1), row(1)])


if __name__ == "__main__":
    unittest.main()
