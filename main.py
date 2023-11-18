import asyncio
import json
import logging
import os
from typing import Optional
import uuid
import av

from aiohttp import web
from aiortc.contrib.media import MediaRelay
from aiortc import MediaStreamTrack, RTCDataChannel, RTCPeerConnection, RTCSessionDescription
import jsonpickle
import numpy

from utils import read_barcodes

class VideoTransformTrack(MediaStreamTrack):

	kind = "video"

	def __init__(self, track) -> None:
		super().__init__()
		self.track: MediaStreamTrack = track
		self.channel: Optional[RTCDataChannel] = None

	async def recv(self) -> av.VideoFrame:
		frame = await self.track.recv()
		img: numpy.ndarray = frame.to_ndarray(format="bgr24")

		if self.channel is not None:
			result_data = read_barcodes(img)
			self.channel.send(str(jsonpickle.encode(result_data, False)))

		return frame

# Globals
ROOT = os.path.dirname(__file__)
logger = logging.getLogger("pc")
pcs = set[RTCPeerConnection]()
relay = MediaRelay()
video_track: VideoTransformTrack | None = None

async def offer(request: web.Request) -> web.Response:
	"""Establish a new WebRTC connection"""
	params = await request.json()
	offer = RTCSessionDescription(sdp=params["sdp"], type=params["type"])

	pc = RTCPeerConnection()
	pc_id = "PeerConnection(%s)" % uuid.uuid4()
	pcs.add(pc)

	def log_info(msg: str, *args):
		"""Write a specific event for a ``pc_id`` to logs"""
		logger.info(pc_id + " " + msg, *args)

	log_info("Created for %s", request.remote)

	@pc.on("datachannel")
	def on_datachannel(channel: RTCDataChannel):
		"""Init a datachannel and assign it to current user"""

		global video_track
		if video_track is not None:
			video_track.channel = channel

	@pc.on("iceconnectionstatechange")
	async def on_connectionstatechange():
		"""Drop user if we can't connect"""
		log_info("Connection state is %s", pc.connectionState)
		if pc.connectionState == "failed":
			await pc.close()
			pcs.discard(pc)

	@pc.on("track")
	def on_track(track: MediaStreamTrack):
		"""Add a new track to the connection"""
		global video_track
		video_track = VideoTransformTrack(relay.subscribe(track))
		log_info("Track %s received", track.kind)
		pc.addTrack(video_track)

		@track.on("ended")
		async def on_ended():
			log_info("Track %s ended", track.kind)
			track.stop()

	await pc.setRemoteDescription(offer)
	answer = await pc.createAnswer()
	if answer is not None:
		await pc.setLocalDescription(answer)

	return web.Response(
		content_type="application/json",
		text=json.dumps({
			"sdp": pc.localDescription.sdp,
			"type": pc.localDescription.type
		})
	)

async def index(request: web.Request) -> web.Response:
    content = open(os.path.join(ROOT, "dist/index.html"), "r").read()
    return web.Response(content_type="text/html", text=content)

async def on_shutdown(app: web.Application):
	"""Close all connections on shutdown"""
	print("Shutting down...")
	coros = [pc.close() for pc in pcs]
	await asyncio.gather(*coros)
	pcs.clear()


if __name__ == "__main__":
	port = int(os.environ.get("qr_port", 5000))
	host = os.environ.get("qr_host", "localhost")
	verbosity = os.environ.get("qr_verbosity", "info")

	if (verbosity == "debug"):
		logging.basicConfig(level=logging.DEBUG)
	else:
		logging.basicConfig(level=logging.INFO)

	app = web.Application()

	app.router.add_get("/", index)
	app.router.add_static("/assets/", path=os.path.join(ROOT, "dist", "assets"))
	app.router.add_post("/api/offer", offer)

	app.on_shutdown.append(on_shutdown)

	web.run_app(app, access_log=None, port=port, host=host)
