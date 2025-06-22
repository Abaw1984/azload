import os
import uuid
import shutil
import threading
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from ml_pipeline.train import process_staad_file, train_model

app = FastAPI(title="STAAD Pro ML API", version="1.0.0")

# CORS configuration
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security setup
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# User model
class User(BaseModel):
    username: str
    hashed_password: str

# In-memory user database (replace with real DB in production)
fake_users_db = {
    "admin": {
        "username": "admin",
        "hashed_password": pwd_context.hash("adminpassword")
    }
}

# Training job tracker
training_jobs = {}

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_user(username: str):
    if username in fake_users_db:
        user_dict = fake_users_db[username]
        return User(**user_dict)
    return None

def authenticate_user(username: str, password: str):
    user = get_user(username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = get_user(username)
    if user is None:
        raise credentials_exception
    return user

# API Endpoints
@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/upload")
async def upload_staad_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    # Create unique job ID
    job_id = str(uuid.uuid4())
    upload_dir = f"/app/uploads/{job_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = f"{upload_dir}/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Process file
    try:
        processed_data = process_staad_file(file_path)
        return {"job_id": job_id, "filename": file.filename, "processed": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/train")
async def start_training(
    job_id: str,
    epochs: int = 50,
    current_user: User = Depends(get_current_user)
):
    if job_id not in training_jobs:
        # Start training in background thread
        training_jobs[job_id] = {"status": "queued", "progress": 0}
        thread = threading.Thread(
            target=train_model_task,
            args=(job_id, epochs)
        )
        thread.start()
        return {"message": "Training started", "job_id": job_id}
    else:
        return {"message": "Job already exists", "job_id": job_id}

@app.get("/status/{job_id}")
async def get_training_status(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    if job_id in training_jobs:
        return training_jobs[job_id]
    else:
        raise HTTPException(status_code=404, detail="Job not found")

@app.get("/results/{job_id}")
async def get_results(
    job_id: str,
    current_user: User = Depends(get_current_user)
):
    model_path = f"/app/models/{job_id}/model.h5"
    if os.path.exists(model_path):
        return {"job_id": job_id, "results_available": True}
    else:
        raise HTTPException(status_code=404, detail="Results not ready")

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
        "models_loaded": True
    }

# Background training task
def train_model_task(job_id, epochs):
    try:
        training_jobs[job_id] = {"status": "processing", "progress": 0}
        
        # Get uploaded files
        upload_dir = f"/app/uploads/{job_id}"
        staad_files = [f for f in os.listdir(upload_dir) if f.endswith(('.pdf', '.png'))]
        
        # Process files
        processed_data = []
        for i, filename in enumerate(staad_files):
            file_path = os.path.join(upload_dir, filename)
            processed_data.append(process_staad_file(file_path))
            training_jobs[job_id]["progress"] = int((i+1)/len(staad_files)*30)
        
        # Train model
        model, accuracy = train_model(processed_data, epochs, job_id)
        training_jobs[job_id] = {
            "status": "completed",
            "progress": 100,
            "accuracy": accuracy,
            "model_path": f"/app/models/{job_id}/model.h5"
        }
    except Exception as e:
        training_jobs[job_id] = {"status": "failed", "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
