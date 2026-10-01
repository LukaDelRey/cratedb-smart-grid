import { register } from 'node:module'
import axios from 'axios'
import net from 'node:net'
net.Socket.prototype.connect = () => { throw new Error('Network access prohibited in unit tests') }
axios.defaults.adapter = config => {
  if (!globalThis.__testHttpAdapter) throw new Error('Network access prohibited in unit tests')
  return globalThis.__testHttpAdapter(config)
}
register('./ts-loader.mjs', import.meta.url)
