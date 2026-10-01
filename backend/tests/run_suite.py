"""Root-independent runner with JSON evidence and optional standard-library coverage."""
import argparse
import contextlib
import io
import inspect
import json
from pathlib import Path
import sys
import socket
import time
import threading
import trace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(ROOT / 'backend'), str(ROOT), str(ROOT / 'backend/tests')]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--coverage', action='store_true')
    options = parser.parse_args()
    output = ROOT / 'test-results'
    output.mkdir(exist_ok=True)
    log = io.StringIO()
    stdout = io.StringIO()
    runner = unittest.TextTestRunner(stream=log, verbosity=2)
    started = time.perf_counter()
    tracer = trace.Trace(count=True, trace=False, ignoredirs=[sys.base_prefix, sys.prefix])
    suite = tracer.runfunc(unittest.defaultTestLoader.discover,str(ROOT / 'backend/tests')) if options.coverage else unittest.defaultTestLoader.discover(str(ROOT / 'backend/tests'))
    # Defense in depth: accidental external access fails instead of using a live service.
    original_connect = socket.socket.connect
    def guarded_connect(sock, address):
        # Windows asyncio builds its internal wake-up pipe using socketpair.
        # Allow only the standard-library implementation, never service traffic.
        caller = inspect.currentframe().f_back
        if caller.f_code.co_name == '_fallback_socketpair' and caller.f_code.co_filename == socket.__file__:
            return original_connect(sock, address)
        raise AssertionError('Network access prohibited in unit tests')
    previous_trace=threading.gettrace()
    try:
        if options.coverage:threading.settrace(tracer.globaltrace)
        with contextlib.redirect_stdout(stdout), patch('socket.socket.connect', new=guarded_connect):
            result = tracer.runfunc(runner.run, suite) if options.coverage else runner.run(suite)
    finally:
        threading.settrace(previous_trace)
    duration = round(time.perf_counter() - started, 3)
    evidence = dict(tests=result.testsRun, passed=result.testsRun-len(result.failures)-len(result.errors)-len(result.skipped),
                    failures=len(result.failures), errors=len(result.errors), skipped=len(result.skipped), durationSeconds=duration,
                    failingTests=[str(test) for test, _ in result.failures + result.errors])
    if options.coverage:
        counts = tracer.results().counts
        coverage = []
        paths=list((ROOT / 'backend/app').rglob('*.py'))+list((ROOT/'shared').glob('*.py'))+list((ROOT/'locust-simulator').glob('*.py'))
        for path in sorted(paths):
            executable = {line for line in trace._find_executable_linenos(str(path)) if isinstance(line, int) and line > 0}
            executed = {line for (filename, line), count in counts.items()
                        if Path(filename).resolve() == path.resolve() and count}
            covered = executable & executed
            coverage.append(dict(file=str(path.relative_to(ROOT)), executableLines=len(executable),
                                 coveredLines=len(covered), percent=round(100*len(covered)/len(executable),1) if executable else 100,
                                 missingLines=sorted(executable-covered)))
        evidence['coverage'] = coverage
        evidence['coverageNote'] = 'Standard-library trace includes discovery/imports and worker threads created during tests. No branch coverage. Unexecuted files are included in denominator.'
    (output / 'backend.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
    (output / 'backend.txt').write_text(log.getvalue()+'\n'+stdout.getvalue(), encoding='utf-8')
    print(json.dumps({k:v for k,v in evidence.items() if k not in ['coverage','coverageNote']}, indent=2))
    return 0 if result.wasSuccessful() else 1


if __name__ == '__main__':
    raise SystemExit(main())
