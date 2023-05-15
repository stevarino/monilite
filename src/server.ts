import { IncomingMessage, ServerResponse, createServer } from "http";
import * as path from 'path';
import * as lib from './lib';
import { Blob } from 'node:buffer';

const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');

interface Packet {
  _ms: number|undefined;
  _size: number|undefined;
  [key: string]: string|number|undefined;
}

export interface ServerOptions {
  port: number;
  
  jsonFilters?: string[];
}

export class Server {
  listeners: Set<ServerResponse>;
  responseId: number = 0;
  options: ServerOptions;

  constructor(options: ServerOptions) {
    const fileServer = serveStatic(path.resolve(__dirname, 'static'), {
      index: ['index.html', 'index.htm']
    });
    /** @type Set<ServerResponse> */
    this.listeners = new Set();
    this.options = options;

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      console.log(req.url);
      switch (req.url) {
        case '/packets':
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache'
          });
          res.flushHeaders();
          this.listeners.add(res);
          break;
        default:
          fileServer(req, res, finalhandler(req, res));
      }
    });
    server.listen(options.port);
    console.log(`Web server running on port ${options.port}`);
  }

  /**
   * Converts a json document into a stremed event.
   * 
   * @param packet object to be json-ified
   * @param addSize whether or not to add a size field to it
   */
  async jsonEvent(packet: unknown, addSize: boolean = true) {
    if ((packet as Packet)._ms === undefined) {
      (packet as Packet)._ms =  new Date().getTime();
    }
    let gen = lib.flattenBody(packet, this.options.jsonFilters);
    if (addSize) {
      gen = lib.yieldWithSum(gen);
    }
    const buffer = Buffer.from(await new Blob(['{', ...gen, '}']).arrayBuffer())
    this.write(buffer);
  }

  /**
   * @param {perResponseCallback} func
   */
  perListener(func: (res: ServerResponse) => void): void {
    let deadResponses: Set<ServerResponse> = new Set();
    this.listeners.forEach((r) => {
      if (r.writable) {
        func(r);
      }
      if (!r.writable) {
        deadResponses.add(r);
      }
    });
    deadResponses.forEach(r => {
      this.listeners.delete(r);
    });
  }


  write(str: Buffer|string) {
    this.responseId += 1;
    this.perListener(async r => {
      r.write(`id: ${this.responseId}\nevent: packet\ndata: `)
      r.write(str);
      r.write('\n\n')
    });
  }

  /**
   * Close all listening responses.
   */
  close() {
    this.perListener(r => {
      r.write(']');
      r.end();
    });
  }
}

module.exports = { Server };
