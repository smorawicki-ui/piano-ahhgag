#!/usr/bin/env python3
"""
Servidor local para PianoChord
Soporta HTTPS (requerido para service worker en algunos dispositivos)
y CORS para cargar los samples de audio.
"""
import http.server
import socketserver
import os
import socket

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        print(f"  [{self.date_time_string()}] {format % args}")

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except:
        return "localhost"

if __name__ == "__main__":
    local_ip = get_local_ip()
    with socketserver.TCPServer(("", PORT), CORSHTTPRequestHandler) as httpd:
        print("=" * 60)
        print("  PianoChord - Servidor Local")
        print("=" * 60)
        print(f"\n  Abri en tu celular (misma red WiFi):")
        print(f"     http://{local_ip}:{PORT}")
        print(f"\n  O en este equipo:")
        print(f"     http://localhost:{PORT}")
        print(f"\n  Presiona Ctrl+C para detener el servidor")
        print("=" * 60)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n  Servidor detenido.")
