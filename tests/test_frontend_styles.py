import unittest
from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / 'jitsi-mgr-frontend'


class FrontendStyleTests(unittest.TestCase):
    def test_imported_stylesheet_exists_and_enables_tailwind_layers(self):
        entry = (FRONTEND / 'src/index.js').read_text(encoding='utf-8')
        self.assertIn("import './index.css';", entry)
        stylesheet = FRONTEND / 'src/index.css'
        self.assertTrue(stylesheet.is_file(), 'React entry imports missing index.css')
        css = stylesheet.read_text(encoding='utf-8')
        for layer in ('base', 'components', 'utilities'):
            self.assertIn('@tailwind ' + layer + ';', css)
