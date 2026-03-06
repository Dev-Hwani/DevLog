# Performance Tests (k6)

## Structure
- `k6-test.js`: load test scenario script
- `results/`: exported k6 summary JSON files

## Run examples
From repository root:

```powershell
k6 run tests/performance/k6-test.js
```

Export summary:

```powershell
k6 run tests/performance/k6-test.js --summary-export tests/performance/results/k6-summary.json
```

Split target test:

```powershell
k6 run tests/performance/k6-test.js --no-thresholds -e TARGET=articles -e VUS=50 -e DURATION=20s -e SLEEP=0.2 --summary-export tests/performance/results/k6-articles.json
```

Available `TARGET` values:
- `mixed`
- `articles`
- `detail`
- `trending`
- `tags`
