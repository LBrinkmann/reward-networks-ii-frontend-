import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .experiment.utils import load_experiments
from .models.experiment import Experiment
from .models.utils import reset_all
from .routes.advise import advise_router
from .routes.experiment import experiment_router
from .routes.results import results_router
from .routes.session import session_router

if os.getenv('GENERATE_FRONTEND_TYPES', default='false') == 'true':
    from pydantic2ts import generate_typescript_defs

api = FastAPI()

api.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
api.include_router(session_router, prefix="")
api.include_router(advise_router, prefix="/advise")
api.include_router(experiment_router, prefix="/experiment")
api.include_router(results_router, prefix="")

@api.on_event("startup")
async def startup_event():
    reset_all()
    load_experiments('./app/data/experiments.yml')
    if os.getenv('GENERATE_FRONTEND_TYPES', default='false') == 'true':
        path = os.getenv('FOLDER_TO_SAVE_FRONTEND_TYPES', default='frontend')
        generate_typescript_defs(
            'app.models', os.path.join(path, 'apiTypes.ts'))
