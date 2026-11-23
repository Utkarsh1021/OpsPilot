from fastapi import FastAPI

app = FastAPI(
    title="OpsPilot FastAPI Demo",
    description="A sample Python application managed by OpsPilot",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "application": "OpsPilot FastAPI Demo",
        "status": "running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
