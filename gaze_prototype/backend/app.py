# app.py
import asyncio
import json
import websockets

async def handler(websocket, path):
    async for message in websocket:
        data = json.loads(message)
        # Esperamos recibir keypoints; aquí simulamos un cálculo de esfuerzo
        if data.get('type') == 'kps':
            kp = data.get('kp')
            # Ejemplo simple: effort aleatorio o basado en distancia entre ojos
            effort = 0.5
            resp = {'effort': effort, 'gaze': {'x':0.5, 'y':0.5}}
            await websocket.send(json.dumps(resp))

async def main():
    async with websockets.serve(handler, '0.0.0.0', 8765):
        print('WS server running on ws://0.0.0.0:8765')
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
