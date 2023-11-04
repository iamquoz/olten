FROM python:3.11-slim as builder
WORKDIR /app
RUN apt-get update && apt-get upgrade -y && apt-get install zbar-tools -y
COPY requirements.txt /app
RUN pip install --trusted-host pypi.python.org -r requirements.txt
COPY . /app

FROM node as frontend
COPY . /app
WORKDIR /app/frontend
COPY ./frontend/.yarn /app/frontend/.yarn
RUN yarn install

# Build the React Vite app
RUN yarn run build

FROM builder as final
# Set the working directory back to /app
WORKDIR /app
COPY --from=frontend /app/frontend/dist /app/dist
EXPOSE 5000

# Run the Python web server
CMD ["python", "main.py"]
