// Capture on the audio rendering thread, independent of React/layout stalls.
class InterviewCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.offset = 0;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (!channel) return true;
    let read = 0;
    while (read < channel.length) {
      const size = Math.min(this.buffer.length - this.offset, channel.length - read);
      this.buffer.set(channel.subarray(read, read + size), this.offset);
      this.offset += size;
      read += size;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer, [this.buffer.buffer]);
        this.buffer = new Float32Array(2048);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('interview-capture', InterviewCapture);
