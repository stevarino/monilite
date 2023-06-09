import { EventEmitter } from 'events';
import { FrontendOptions } from '../options';
import { Payload, Table } from '../common/types';
import { State } from './state';

class MessageRouterContext {
  worker: Worker|null = null;
  isWorker = false;
  emitter = new EventEmitter();
  id = 0;
}

const CONTEXT = new MessageRouterContext();

/** Register the created worker from bundle.page */
export function registerWorker(worker: Worker) {
  CONTEXT.worker = worker;
  worker.onmessage = (e) => {
    CONTEXT.emitter.emit(e.data.type, e.data.payload);
  }
}

export function workerInit() {
  onmessage = (e) => {
    CONTEXT.emitter.emit(e.data.type, e.data.payload);
  }
  CONTEXT.isWorker = true;
}

class MessageRouter<T> {
  context: MessageRouterContext;
  label: string;
  isLocal: boolean;

  constructor(isLocal?: boolean, context?: MessageRouterContext) {
    this.isLocal = isLocal ?? false;
    this.context = context ?? CONTEXT;
    this.label = String(this.context.id++);
  }

  emit(payload: T) {
    this.context.worker?.postMessage({ type: this.label, payload, });
    if (CONTEXT.isWorker) {
      postMessage({ type: this.label, payload, });
    }
    this.context.emitter.emit(this.label,payload);
  }

  addListener(callback: (payload: T) => void) {
    this.context.emitter.addListener(this.label, callback);
  }
}

export const OPTIONS = new MessageRouter<FrontendOptions>();
export const TABLE_AGG_REQ = new MessageRouter<null>();
export const TABLE_AGG_RES = new MessageRouter<Table>();
export const TABLE_PACKET_REQ = new MessageRouter<number>();
export const TABLE_PACKET_RES = new MessageRouter<Table>();
export const FILTERS = new MessageRouter<Table>();
export const GROUPS = new MessageRouter<{[group: string]: string[]}>();
export const STATE = new MessageRouter<State[]>();
/** Field Searches */
export const FIELDS_REQ = new MessageRouter<string>();
export const FIELDS_RES = new MessageRouter<string[]>();
/** Download packets button */
export const PACKETS_REQ = new MessageRouter<null>();
export const PACKETS_RES = new MessageRouter<string>();
/** Display singular packet */
export const PACKET_REQ = new MessageRouter<number>();
export const PACKET_RES = new MessageRouter<[number, string|undefined]>();
/** Rate counters on top of page */
export const SAMPLES = new MessageRouter<{pps: string, bps: string}>();
/** Points for updating chart */
export const CHART_DATA = new MessageRouter<{
  startTime: number,
  endTime: number,
  isPartial: boolean,
  datasets: [
    label: string, 
    pts: [x: number, y: number][]
  ][],
}>();
