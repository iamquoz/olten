import json
import cv2
from pyzbar import pyzbar

ACCEPTED_TYPES=[pyzbar.ZBarSymbol.QRCODE, pyzbar.ZBarSymbol.CODABAR, pyzbar.ZBarSymbol.EAN13, pyzbar.ZBarSymbol.EAN8, pyzbar.ZBarSymbol.UPCA, pyzbar.ZBarSymbol.UPCE, pyzbar.ZBarSymbol.ISBN10, pyzbar.ZBarSymbol.ISBN13, pyzbar.ZBarSymbol.I25, pyzbar.ZBarSymbol.PDF417, pyzbar.ZBarSymbol.CODE39]

class BarcodesResponce:
	def __init__(self, x: int, y: int, width: int, height: int, data: str, type: str):
		self.x = x
		self.y = y
		self.width = width
		self.height = height
		self.data = data
		self.type = type

	def toJSON(self):
		return json.dumps(self, default=lambda o: o.__dict__,
            sort_keys=True, indent=4)

def read_barcodes(frame) -> list[BarcodesResponce]:

	gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
	blur = cv2.GaussianBlur(gray, (9, 9), 0)
	_, optimized_frame = cv2.threshold(blur, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

	barcodes = pyzbar.decode(optimized_frame, symbols=ACCEPTED_TYPES)
	return_arr = []
	for barcode in barcodes:
		x, y, w, h = barcode.rect
		barcode_info = barcode.data.decode('utf-8')
		barcode_type = barcode.type
		return_arr.append(BarcodesResponce(x, y, w, h, barcode_info, barcode_type))

	return return_arr
