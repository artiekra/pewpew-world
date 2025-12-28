from fastapi import APIRouter

router = APIRouter()


@router.get(
    "/",
    summary="Root endpoint",
    description="Returns a welcome message indicating the API is running",
    response_description="Welcome message",
)
async def root():
    return {"message": "API v1 is running"}


@router.get(
    "/health",
    summary="Health check",
    description="Check if the API is healthy and running",
    response_description="Health status",
)
async def health():
    return {"status": "healthy"}
