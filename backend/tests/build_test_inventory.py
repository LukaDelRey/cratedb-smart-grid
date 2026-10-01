"""Generate reviewable source inventory; never infer full coverage from a passing import."""
import csv
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parents[2]

def main():
    output = ROOT / 'test-results'
    backend = json.loads((output / 'backend.json').read_text(encoding='utf-8'))
    coverage = {row['file'].replace('\\', '/'): row for row in backend.get('coverage', [])}
    rows = []
    for directory in ['backend/app', 'shared', 'locust-simulator', 'frontend/src']:
        for path in sorted((ROOT / directory).rglob('*')):
            if not path.is_file() or any(part in path.parts for part in ['__pycache__', 'venv', '.venv', 'node_modules']):
                continue
            name = path.relative_to(ROOT).as_posix()
            suite = ''
            if path.suffix == '.py':
                status = 'runtime unit / isolated API; partial line coverage'
                suite = 'backend/tests'
                if name in coverage and not coverage[name]['executableLines']:
                    status = 'no executable statements'
            elif path.suffix == '.vue':
                status = 'setup: empty + fixture; template: empty; visual boundaries mocked'
                suite = 'frontend/tests/components.test.mjs'
                if name.endswith('/components/map/GridMap.vue'):
                    status = 'SKIPPED: inactive malformed legacy SFC; not imported'
            elif path.name in ['main.ts', 'echarts.ts']:
                status = 'NOT UNIT EXECUTED: browser bootstrap / chart registration'
            elif path.name.endswith('.d.ts') or name.endswith('/types/dashboard.ts'):
                status = 'TypeScript static check; no runtime logic'
            elif path.suffix == '.ts':
                status = 'runtime unit; not all branches asserted'
                suite = 'frontend/tests/application.test.mjs; coreLogic.test.mjs; contracts.test.mjs'
            else:
                status = 'asset / configuration: outside runtime unit tests'
            metrics = coverage.get(name, {})
            rows.append(dict(file=name, status=status, suite=suite,
                coveredLines=metrics.get('coveredLines', ''), executableLines=metrics.get('executableLines', '')))
    with (output / 'source-inventory.csv').open('w', newline='', encoding='utf-8-sig') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0])); writer.writeheader(); writer.writerows(rows)
    guidelines = []
    for path in sorted((ROOT / 'smjernice-projekta').iterdir()):
        if not path.is_file(): continue
        item = dict(file=path.name, sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                    review='reference asset catalogued; visual acceptance not executed')
        if path.suffix == '.docx':
            with zipfile.ZipFile(path) as archive:
                tree = ET.fromstring(archive.read('word/document.xml'))
            text = '\n'.join(''.join(p.itertext()) for p in tree.findall('.//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'))
            item['review'] = 'DOCX text extracted; requirements used for test mapping, not executable instructions'
            item['relevantExcerpts'] = [p for p in text.splitlines() if re.search(r'IsolationForest|RandomForest|LSTM|GNN|anomal|predict|forecast|CrateDB|MQTT|alarm|simul', p, re.I)][:25]
        guidelines.append(item)
    (output / 'project-guidelines.json').write_text(json.dumps(guidelines, ensure_ascii=False, indent=2), encoding='utf-8')
    frontend_text = (output / 'frontend.txt').read_text(encoding='utf-8')
    frontend = {key: int(re.search(r'^# '+label+r' (\d+)$', frontend_text, re.M)[1])
                for key, label in [('tests', 'tests'), ('passed', 'pass'), ('failures', 'fail'), ('skipped', 'skipped')]}
    frontend['failingTests'] = re.findall(r'^    not ok \d+ - (.*)$', frontend_text, re.M)
    (output / 'frontend.json').write_text(json.dumps(frontend, indent=2), encoding='utf-8')
    print(json.dumps(dict(sourceFiles=len(rows), guidelineFiles=len(guidelines), frontend=frontend), ensure_ascii=False))

if __name__ == '__main__': main()
