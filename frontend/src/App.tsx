/* eslint-disable no-inner-declarations */
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { Badge, Button, Card, Group, MantineProvider, Text, Stack, Title, LoadingOverlay, Box, Select, Grid, Container } from '@mantine/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDidUpdate, useInterval, useListState, useSetState } from '@mantine/hooks';
import { Notifications, notifications } from '@mantine/notifications';
import { IconClipboard, IconExternalLink } from '@tabler/icons-react';
import axios from 'axios';

import type { Barcode } from './types';
import { isBarcode, isValidHttpUrl } from './helpers';

export default function App() {

	const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
	const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
	const [currentDate, setCurrentDate] = useState<number | null>(null);

	const [barcodes, barcodesHandler] = useListState<Barcode>([]);

	const [ispcEstablished, setIspcEstablished] = useState(false);
	const [constraints, setConstraints] = useSetState<MediaStreamConstraints>({
		video: {
			frameRate: { ideal: 10, max: 15 },
			width: { ideal: 4096 },
			height: { ideal: 2160 },
			facingMode: 'environment',
			deviceId: undefined
		}
	});

	const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const currentStamp = () => {
		if (currentDate == null) {
			setCurrentDate(new Date().getTime());
			return 0;
		}
		return new Date().getTime() - currentDate;
	}

	const interval = useInterval(() => {
		dataChannel?.send(`ping ${currentStamp()}`)
	}, 1000);

	const negotiate = useCallback(() => {
		return peerConnection?.createOffer()
			.then(offer => {
				return peerConnection.setLocalDescription(offer);
			})
			.then(() => {
				return new Promise<void>(function (resolve) {
					if (peerConnection.iceGatheringState === 'complete') {
						resolve();
					}
					else {
						function checkState() {
							if (peerConnection?.iceGatheringState === 'complete') {
								peerConnection.removeEventListener('icegatheringstatechange', checkState);
								resolve();
							}
						}
						peerConnection.addEventListener('icegatheringstatechange', checkState);
					}
				})
			})
			.then(() => {
				const offer = peerConnection.localDescription;

				return axios.post('/api/offer', {
					sdp: offer?.sdp,
					type: offer?.type,
				})
			}).then(res => peerConnection.setRemoteDescription(res.data))
	}, [peerConnection]);

	const start = useCallback(() => {
		const pc = new RTCPeerConnection({
			iceServers: [{urls: ['stun:stun.l.google.com:19302']}]
		});

		pc.addEventListener('track', (event) => {
			if (videoRef.current)
				videoRef.current.srcObject = event.streams[0];
		});

		const dc = pc.createDataChannel('chat', { ordered: true });

		dc.onclose = () => interval.stop();
		dc.onopen = () => {
			interval.start();
		}
		dc.onmessage = (event: MessageEvent<string>) => {

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const data: any[] = JSON.parse(event.data);
			barcodesHandler.setState(data.map(x => ({
				coordinates: {
					x: x.x,
					y: x.y,
					width: x.width,
					height: x.height,
				},
				type: x.type,
				data: x.data
			})))
		};

		setPeerConnection(pc);
		setDataChannel(dc);


	}, [interval, barcodesHandler]);

	useDidUpdate(() => {
		if (peerConnection == null) return;

		navigator.mediaDevices.getUserMedia(constraints).then(stream => {
			stream.getTracks().forEach(track => peerConnection.addTrack(track, stream));
			return negotiate();
		}).catch(err => console.error(err));

	}, [peerConnection, constraints]);

	useDidUpdate(() => {
		setIspcEstablished(true);

		if (canvasRef.current == null || videoRef.current == null)
			return;

		canvasRef.current.width = videoRef.current.videoWidth;
		canvasRef.current.height = videoRef.current.videoHeight;

		console.log(canvasRef.current.width, canvasRef.current.height);

		const ctx = canvasRef.current.getContext('2d');
		if (ctx == null)
			return;

		ctx.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

		barcodes.forEach(element => {
			ctx.roundRect(element.coordinates.x, element.coordinates.y, element.coordinates.width, element.coordinates.height, 10);
			ctx.lineWidth = 6;
			ctx.strokeStyle = 'red';

			ctx.stroke();
		});
	}, [barcodes]);

	const canvasOnClick = useCallback((event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
		if (canvasRef.current == null)
			return;

		const rect = canvasRef.current.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		const barcode = barcodes.find(barcode =>
			barcode.coordinates.x < x &&
			barcode.coordinates.x + barcode.coordinates.width > x &&
			barcode.coordinates.y < y
			&& barcode.coordinates.y + barcode.coordinates.height > y);

		if (barcode == null)
			return;

		handleBarcodeInteraction(barcode, isValidHttpUrl(barcode.data));

	}, [barcodes]);

	useEffect(() => {
		navigator.mediaDevices.getUserMedia(constraints).then(stream => {
			if (videoRef.current)
				videoRef.current.srcObject = stream;
		}).catch(err => console.error(err));
		navigator.mediaDevices
			.enumerateDevices()
			.then(devices => setDevices(devices.filter((device) => device.kind === 'videoinput')));
	}, [constraints]);

	return <MantineProvider>
		<Notifications />
			<Container size={'lg'} p={20}>
					<Stack align='center'>
						<Box pos={'relative'} w={'100%'}>
							<LoadingOverlay visible={!ispcEstablished}
								overlayProps={{ radius: 'sm', blur: 2 }}
								loaderProps={{ color: 'blue', type: 'bars' }} />
							<video ref={videoRef} autoPlay style={{ display: ispcEstablished ? 'none' : 'block', width: '100%' }} />
							<canvas ref={canvasRef} onClick={canvasOnClick} style={{ display: !ispcEstablished ? 'none' : 'block', width: '100%' }} />
						</Box>
						<Group>
							<Button onClick={start} size='lg'>Начать работу</Button>
							<Select label='Камера' allowDeselect={false} placeholder='Выберите камеру'
								data={devices.map(x => ({
								label: x.label,
								value: x.deviceId
							}))}
								onChange={e => setConstraints({
									video: {
										...constraints.video as MediaTrackConstraints,
										deviceId: e as string
									}
								})}/>
						</Group>
					</Stack>
					<Stack align='stretch' justify='center'>
						<Title order={2}>Полученные штрих- и QR-коды</Title>
						<Grid>
							{barcodes.length < 1 && <Grid.Col><Text ta={'center'} fs={'italic'}>Нет данных</Text></Grid.Col>}
							{barcodes.map((barcode, index) => {
								const isUrl = isValidHttpUrl(barcode.data);
								return <Grid.Col span={{base: 12, md: 6, lg: 3}}>
									<Card key={index} withBorder m={10}>
									<Group justify='space-between'>
										<Text fw={500}>{isUrl ? 'Ссылка' : 'Данные'}</Text>
										{barcode.type == 'QRCODE' && <Badge>QR-код</Badge>}
										{isBarcode(barcode.type) && <Badge color='red'>Штрихкод</Badge>}
									</Group>
									<Text size="sm" c="dimmed">
										{barcode.data}
									</Text>
									<Button leftSection={isUrl ? <IconExternalLink /> : <IconClipboard />}
										variant="light" color="blue" fullWidth mt="md" radius="md"
										onClick={() => handleBarcodeInteraction(barcode, isUrl)}>
										{isUrl ? 'Перейти' : 'Скопировать'}
									</Button>
									</Card>
								</Grid.Col>
							})}
						</Grid>
					</Stack>
				</Container>
	</MantineProvider>;

	function handleBarcodeInteraction(barcode: Barcode, isUrl: boolean) {
		if (navigator.clipboard) {
			navigator.clipboard.writeText(barcode.data)
				.then(e => {
					notifications.show({
						title: 'Успех',
						message: 'Данные скопированы в буфер обмена',
						color: 'green',
					});
					console.log(e);
				}).catch(err => console.error(err));
		}

		if (isUrl) {
			window.open(barcode.data, '_blank');
		}
	}
}

