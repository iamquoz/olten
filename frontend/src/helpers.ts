import type { BarcodeType } from "./types";

export const isBarcode = (type: BarcodeType) => {
	switch (type) {
		case 'EAN2':
		case 'EAN5':
		case 'EAN8':
		case 'EAN13':
		case 'UPCA':
		case 'UPCE':
		case 'CODE39':
		case 'CODABAR':
		case 'CODE93':
		case 'CODE128':
			return true;
		default:
			return false;
	}
}

export const isValidHttpUrl = (string: string) =>  {
	let url;

	try {
		url = new URL(string);
	} catch (_) {
		return false;
	}

	return url.protocol === "http:" || url.protocol === "https:";
}
