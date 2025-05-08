import http.server
import socketserver
import os
import webbrowser

PORT = 8000

class SimpleHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        http.server.SimpleHTTPRequestHandler.end_headers(self)

def start_server():
    """Start a simple HTTP server to serve the frontend files"""
    handler = SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Server started at http://localhost:{PORT}")
        print("Press Ctrl+C to stop the server")
        
        # Open the browser automatically
        webbrowser.open(f"http://localhost:{PORT}")
        
        # Serve until interrupted
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    # Make sure we're in the correct directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Start the server
    start_server() 