# Prototipo — Detección ocular y lectura en tiempo real

## Requisitos
- Navegador moderno (Chrome, Edge o Firefox)
- Python 3.8+ para ejecutar el servidor opcional

## Cómo probar (frontend local processing)
1. Coloca `index.html`, `styles.css` y `app.js` en la misma carpeta.
2. Abre `index.html` en el navegador (preferible servir con un server local simple, p.ej. `python -m http.server 8000`).
3. Permite acceso a la cámara.
4. Observa el overlay y prueba fijar la mirada sobre el texto para activar lectura.

## Cómo probar con backend WebSocket (opcional)
1. Abre una terminal y navega a la carpeta `backend`.
2. Crea un entorno virtual e instala dependencias: `python -m venv venv && venv\\Scripts\\activate && pip install -r requirements.txt`.
3. Ejecuta `python app.py`.
4. Descomenta el bloque WebSocket en `app.js` y ajusta la URL si es necesario.
