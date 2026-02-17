## PewPew World ✨

Open-source unofficial PewPew website. Data is based on official [ppl-data](https://github.com/pewpewlive/ppl-data), as well as regular scrapes for archives. Using Python for collecting data and backend (FastAPI, uvicorn); next.js + [Tabler](https://tabler.io) for frontend.

![website preview](https://jpcdn.it/img/79b55f7e1bfa46087d34eef3eafaa68f.png)

### Start up locally

This is a monorepo for the project. You have to separately run data collecting modules, API backend, and frontend. Prepare by copying .env file:

```sh
cp .env.example .env
```

Adjust location of data storage as needed. You don't need to change `NEXT_PUBLIC_BACKEND_URL` while developing locally.
Install all the python package requirements in a virtual environment:

```
py -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

- Start collecting data with `py data/main.py`
- Start API backend using the data with `py backend/main.py` (by default starts on `0.0.0.0:8000`)
- Start frontend by going into next.js project folder: `cd frontend`, and `npm run dev` (if first time, also `npm install`)
