const promiseCtor = Promise as unknown as {
  withResolvers?: <T>() => {
    promise: Promise<T>
    resolve: (value: T | PromiseLike<T>) => void
    reject: (reason?: unknown) => void
  }
}

if (typeof promiseCtor.withResolvers !== 'function') {
  promiseCtor.withResolvers = function withResolvers<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

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
