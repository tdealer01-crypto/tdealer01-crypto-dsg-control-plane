FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY benchmarks/pibench_control_plane/requirements.txt /app/requirements.txt
RUN python -m pip install --no-cache-dir -r /app/requirements.txt

COPY benchmarks/pibench_control_plane/formal_gate.py /app/formal_gate.py
COPY benchmarks/pibench_control_plane/execution_gate.py /app/execution_gate.py
COPY benchmarks/pibench_control_plane/analyzer.py /app/analyzer.py
COPY benchmarks/pibench_control_plane/server.py /app/server.py

EXPOSE 9010

ENTRYPOINT ["python", "/app/server.py"]
CMD ["--host", "0.0.0.0", "--port", "9010"]
