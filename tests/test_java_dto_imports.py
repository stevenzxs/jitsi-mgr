import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'jitsi-mgr-app' / 'src' / 'main' / 'java' / 'com' / 'cloudmeet' / 'jitsimgr'


class DtoImportTests(unittest.TestCase):
    def test_service_references_import_existing_dtos(self):
        for service, dto in [('UserService', 'SessionDto'), ('AdminService', 'RegistrationRequestDto')]:
            with self.subTest(service=service):
                source = (ROOT / 'service' / (service + '.java')).read_text()
                definition = (ROOT / 'dto' / (dto + '.java')).read_text()
                self.assertIn('package com.cloudmeet.jitsimgr.dto;', definition)
                self.assertIn('class ' + dto, definition)
                self.assertIn('import com.cloudmeet.jitsimgr.dto.' + dto + ';', source)


if __name__ == '__main__':
    unittest.main()
