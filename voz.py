import tkinter as tk
import pyttsx3
import cv2
import threading
import time

# Motor de voz
engine = pyttsx3.init()
voices = engine.getProperty('voices')
engine.setProperty('voice', voices[0].id)
engine.setProperty('rate', 160)

# Frases
frases = [
    "Hola, ¿cómo estás?",
    "Bienvenido a la aplicación de texto a voz.",
    "Python es un lenguaje de programación genial.",
    "¡Disfruta usando esta aplicación!"
]

# Función de texto a voz
def leer_todo():
    engine.stop()
    for texto in frases:
        engine.say(texto)
    engine.runAndWait()

# Detección
def detectar_lentes_o_esfuerzo():
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    glasses_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye_tree_eyeglasses.xml')

    cap = cv2.VideoCapture(0)
    ultimo_evento = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)

        for (x, y, w, h) in faces:
            roi_gray = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray)
            glasses = glasses_cascade.detectMultiScale(roi_gray)

            # Detectar lentes
            if len(glasses) > 0 or len(eyes) < 1:
                # Control para no repetir activaciones seguidas
                if time.time() - ultimo_evento > 10:
                    print("Se detecto uso de lentes o esfuerzo visual. Activando lectura...")
                    leer_todo()
                    ultimo_evento = time.time()

        
        cv2.imshow('Deteccion de rostro', frame)
        if cv2.waitKey(1) & 0xFF == 27: 
            break

    cap.release()
    cv2.destroyAllWindows()

# Ventana
ventana = tk.Tk()
ventana.title("Texto a Voz")
ventana.geometry("400x350")
ventana.configure(bg="lightblue")

for t in frases:
    tk.Label(ventana, text=t, bg="lightblue", font=("Arial", 14)).pack(pady=5)

btn_leer = tk.Button(
    ventana,
    text="Leer todo manualmente",
    command=leer_todo,
    bg="#2196F3", fg="white",
    font=("Arial", 14, "bold"),
    relief="raised", padx=10, pady=5
)
btn_leer.pack(pady=20)


hilo = threading.Thread(target=detectar_lentes_o_esfuerzo, daemon=True)
hilo.start()

ventana.mainloop()
