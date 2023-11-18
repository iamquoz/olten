# Olten

## Basic

Sample project for react/python web app for decoding various QR and barcodes

## How it works

The frontend is asking for a camera permission and then starts a video stream, which feeds into a python backend.

The backend is using the pyzbar library to decode the QR/barcodes and later returns the frame as well as sends the decoded data to the frontend via a separate data channel.

The frame is then fed into the canvas, upon which rectangles are drawn around the detected codes.

Clicking on a square either opens a new tab with the decoded data or copies it to the clipboard.

Any data received from the backend is displayed in a table below the video stream.

Connection between the two is established via [WebRTC](https://webrtc.org/).

Diagrams can be found in `/uml`

## Requirements

- Node v20
- Yarn v4
- Python 3.11
- `Microsoft Edge Webdriver` is used for `Selenium` tests

Requirements.txt is provided for python dependencies

## How to run

docker-compose.yml is provided, the image is published on [Docker Hub](https://hub.docker.com/r/iamquoz/scanner)

- To change the port, set the environment variable `qr_port` to the desired port
- To change the host, set the environment variable `qr_host` to the desired host
- To enable detailed logging, set the environment variable `qr_verbosity` to `debug`
