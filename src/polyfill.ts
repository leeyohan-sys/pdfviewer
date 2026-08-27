const mapProto = Map.prototype as Map<unknown, unknown> & {
  getOrInsert?: (key: unknown, value: unknown) => unknown
  getOrInsertComputed?: (
    key: unknown,
    callbackfn: (key: unknown) => unknown,
  ) => unknown
}

if (typeof mapProto.getOrInsert !== 'function') {
  mapProto.getOrInsert = function (key, value) {
    if (this.has(key)) return this.get(key)
    this.set(key, value)
    return value
  }
}

if (typeof mapProto.getOrInsertComputed !== 'function') {
  mapProto.getOrInsertComputed = function (key, callbackfn) {
    if (this.has(key)) return this.get(key)
    const value = callbackfn(key)
    this.set(key, value)
    return value
  }
}
