import os
import subprocess
import sys
import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
import shutil

class Integration_Test(unittest.TestCase):
	def setUp(self) -> None:

		# launch python server in background
		self.backend_process = subprocess.Popen([sys.executable, 'main.py'], stdout=subprocess.PIPE, stderr=None)

		# launch a build process for the frontend and wait until it quits
		with subprocess.Popen(['yarn', 'build'], stdout=None, stderr=None, cwd=os.path.abspath('frontend'), shell=True) as build_process:
			build_process.wait()

		# copy built react app to /dist
		shutil.copytree(os.path.abspath('frontend/dist'), os.path.abspath('dist'), dirs_exist_ok=True)

		# set commands for camera emulation
		options = webdriver.EdgeOptions()
		options.add_argument("--use-fake-ui-for-media-stream")
		options.add_argument("--use-fake-device-for-media-stream")
		options.add_argument(fr'--use-file-for-fake-video-capture={os.path.abspath(r"test_media/test.y4m")}')

		# url of python server
		URL = "http://localhost:5000"

		# launch edge and wait until it loads
		self.driver = webdriver.Edge(options=options)
		self.driver.get(URL)
		time.sleep(10)

		# find the start button
		self.driver.find_element(By.ID, 'start_button').click()

		# wait until rtc connection establishes, can take a long time
		time.sleep(100)


		return super().setUp()

	def test_camera(self):
		# find all 4 expected results
		elems = self.driver.find_elements(By.CLASS_NAME, "result")

		self.assertEqual(len(elems), 4)

	def tearDown(self) -> None:
		self.backend_process.terminate()

		return super().tearDown()

if __name__ == '__main__':
	unittest.main()
