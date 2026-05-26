FROM python:3.11

WORKDIR /app

COPY locust-simulator/requirements.txt .

RUN pip install -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

WORKDIR /app/locust-simulator

CMD ["locust", "-f", "locustfile.py"]