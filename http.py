# ============== beg cut http.py ==================
from BaseHTTPServer import HTTPServer, BaseHTTPRequestHandler
from SocketServer import ThreadingMixIn
import threading
import random
from time import sleep

class Handler(BaseHTTPRequestHandler):

    def do_POST(self):
        # ---------------------------------
        # emulate a 1 out of 2 failure
        if random.randint(1, 1000) < 500:
            self.send_response(200)
        else:
            self.send_response(406)
        # ---------------------------------
        self.send_header('Content-type','application/json')
        self.end_headers()
        message =  '{"id":12345}'
        self.wfile.write(message)
        self.wfile.write('\n')
        return


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in a separate thread."""

if __name__ == '__main__':
    # replace with your local IP address
    server = ThreadedHTTPServer(('192.168.1.32', 9080), Handler)
    print 'Starting server, use <Ctrl-C> to stop'
    server.serve_forever()
# ============== beg cut http.py ==================
