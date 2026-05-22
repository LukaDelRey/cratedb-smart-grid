FROM python:3.11

WORKDIR /app

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

CMD ["locust", "-f", "locustfile.py", "--host=http://localhost"]