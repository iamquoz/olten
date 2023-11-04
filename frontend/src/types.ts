interface Coordinates {
	x: number;
	y: number;
	width: number;
	height: number;
}

export type BarcodeType = 'NONE' | 'PARTIAL' | 'EAN2' | 'EAN5' | 'EAN8' | 'UPCE' | 'ISBN10' | 'UPCA' | 'EAN13' | 'ISBN13' | 'COMPOSITE' | 'I25' | 'DATABAR' | 'DATABAR_EXP' | 'CODABAR' | 'CODE39' | 'PDF417' | 'QRCODE' | 'SQCODE' | 'CODE93' | 'CODE128';

export interface Barcode {
	coordinates: Coordinates;
	type: BarcodeType;
	data: string;
}
