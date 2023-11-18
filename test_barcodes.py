import unittest
import cv2

from utils import read_barcodes


class Test_Barcodes(unittest.TestCase):
	def test_single_barcode(self):
		img = cv2.imread("test_media/single_barcode.png")
		result_data = read_barcodes(img)

		self.assertEqual(len(result_data), 1)
		self.assertEqual(result_data[0].data, "036000291452")

	def test_multiple_barcodes(self):
		img = cv2.imread("test_media/multiple_codes.png")
		result_data = read_barcodes(img)
		self.assertEqual(len(result_data), 4)

		self.assertEqual(result_data[0].data, "036000291452")
		self.assertEqual(result_data[1].data, "5901234123457")
		self.assertEqual(result_data[2].data, "96385074")
		self.assertEqual(result_data[3].data, "http://en.m.wikipedia.org")

		self.assertEqual(result_data[0].type, "UPCA")
		self.assertEqual(result_data[1].type, "EAN13")
		self.assertEqual(result_data[2].type, "EAN8")
		self.assertEqual(result_data[3].type, "QRCODE")

if __name__ == '__main__':
	unittest.main()
