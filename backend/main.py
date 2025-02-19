from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Semper Tutus API is running!"}