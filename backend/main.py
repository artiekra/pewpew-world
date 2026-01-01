import uvicorn
from app.api.v1 import router as v1_router
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="PewPew World API",
    description="PewPewLive leaderboards, archives, tools and statistics",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    contact={
        "name": "Artemii Kravchuk",
        "email": "mail@artiekra.org",
    },
    # license_info={
    #     "name": "MIT",
    #     "url": "https://opensource.org/licenses/MIT",
    # },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/v1")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
