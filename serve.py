"""Simple local server for Fantasy Draft Showdown."""
import http.server
import socketserver
import webbrowser

PORT = 8000

handler = http.server.SimpleHTTPRequestHandler
with socketserver.TCPServer(("", PORT), handler) as httpd:
    print(f"\n🏈 Fantasy Draft Showdown running at http://localhost:{PORT}\n")
    webbrowser.open(f"http://localhost:{PORT}")
    httpd.serve_forever()
