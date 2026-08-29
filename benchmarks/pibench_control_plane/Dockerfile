FROM node:24-bookworm-slim AS qubo-builder

WORKDIR /src

COPY benchmarks/pibench_control_plane/qubo_bridge.ts /src/benchmarks/pibench_control_plane/qubo_bridge.ts
COPY lib/ising/qubo /src/lib/ising/qubo
COPY lib/gateway/audit.ts /src/lib/gateway/audit.ts

RUN npx --yes esbuild@0.25.12 \
    /src/benchmarks/pibench_control_plane/qubo_bridge.ts \
    --bundle \
    --platform=node \
    --format=esm \
    --target=node18 \
    --outfile=/out/qubo-bridge.mjs

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DSG_QUBO_BRIDGE=/app/qubo-bridge.mjs

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY benchmarks/pibench_control_plane/requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir -r /app/requirements.txt

COPY --from=qubo-builder /out/qubo-bridge.mjs /app/qubo-bridge.mjs
COPY benchmarks/pibench_control_plane/formal_gate.py /app/formal_gate.py
COPY benchmarks/pibench_control_plane/execution_gate.py /app/execution_gate.py
COPY benchmarks/pibench_control_plane/analyzer.py /app/analyzer.py
COPY benchmarks/pibench_control_plane/server.py /app/server.py

EXPOSE 9010

ENTRYPOINT ["python", "/app/server.py"]
CMD ["--host", "0.0.0.0", "--port", "9010"]
